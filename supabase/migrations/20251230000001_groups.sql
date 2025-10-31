-- Group chat core schema, RLS, policies, realtime, and helper RPCs

-- Enable UUID extension if not present
create extension if not exists "uuid-ossp";

-- Tables
create table if not exists public.groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  avatar_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member', -- 'admin' | 'member'
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists public.group_messages (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete set null,
  content text,
  media_url text,
  message_type text not null default 'text', -- 'text', 'image', 'video', 'audio', etc.
  created_at timestamptz not null default now(),
  read_by uuid[] not null default '{}'
);

-- Helpful indexes
create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_group_members_group on public.group_members(group_id);
create index if not exists idx_group_messages_group_time on public.group_messages(group_id, created_at desc);

-- RLS
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_messages enable row level security;

-- Policies
-- groups: anyone authenticated can select groups they belong to; creator can insert; admins can update name/avatar
DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "groups select for members" ON public.groups;
    CREATE POLICY "groups select for members" ON public.groups
    FOR SELECT USING (
      exists(select 1 from public.group_members gm where gm.group_id = id and gm.user_id = auth.uid())
    );
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "groups insert by authenticated" ON public.groups;
    CREATE POLICY "groups insert by authenticated" ON public.groups
    FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "groups update by admin" ON public.groups;
    CREATE POLICY "groups update by admin" ON public.groups
    FOR UPDATE TO authenticated USING (
      exists(select 1 from public.group_members gm where gm.group_id = id and gm.user_id = auth.uid() and gm.role = 'admin')
    ) WITH CHECK (
      exists(select 1 from public.group_members gm where gm.group_id = id and gm.user_id = auth.uid() and gm.role = 'admin')
    );
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- group_members: members can select rows for their groups; admins can insert/delete members
DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "group_members select for members" ON public.group_members;
    CREATE POLICY "group_members select for members" ON public.group_members
    FOR SELECT USING (
      exists(select 1 from public.group_members gm2 where gm2.group_id = group_id and gm2.user_id = auth.uid())
    );
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "group_members insert by admin" ON public.group_members;
    CREATE POLICY "group_members insert by admin" ON public.group_members
    FOR INSERT TO authenticated WITH CHECK (
      exists(select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid() and gm.role = 'admin')
    );
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "group_members delete by admin" ON public.group_members;
    CREATE POLICY "group_members delete by admin" ON public.group_members
    FOR DELETE TO authenticated USING (
      exists(select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid() and gm.role = 'admin')
    );
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- allow admins to update member roles
DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "group_members update role by admin" ON public.group_members;
    CREATE POLICY "group_members update role by admin" ON public.group_members
    FOR UPDATE TO authenticated USING (
      exists(select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid() and gm.role = 'admin')
    ) WITH CHECK (
      exists(select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid() and gm.role = 'admin')
    );
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- group_messages: members can select and insert; allow update for read receipts by members
DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "group_messages select for members" ON public.group_messages;
    CREATE POLICY "group_messages select for members" ON public.group_messages
    FOR SELECT USING (
      exists(select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid())
    );
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "group_messages insert by members" ON public.group_messages;
    CREATE POLICY "group_messages insert by members" ON public.group_messages
    FOR INSERT TO authenticated WITH CHECK (
      exists(select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid())
    );
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "group_messages update read_by by members" ON public.group_messages;
    CREATE POLICY "group_messages update read_by by members" ON public.group_messages
    FOR UPDATE TO authenticated USING (
      exists(select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid())
    ) WITH CHECK (
      exists(select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid())
    );
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- Realtime: add group_messages to publication with replica identity for updates to read_by
alter table public.group_messages replica identity full;

do $$ begin
  begin
    alter publication supabase_realtime add table public.group_messages;
  exception when others then
    null; -- publication may already include table or missing privileges
  end;
end $$;

-- RPC to mark group messages as read by a user
create or replace function public.mark_group_messages_read(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.group_messages m
  set read_by = (select array(select distinct x from unnest(coalesce(m.read_by, '{}')) as x union select p_user_id))
  where m.group_id = p_group_id
    and not (coalesce(m.read_by, '{}') @> array[p_user_id]);
end;
$$;

grant execute on function public.mark_group_messages_read(uuid, uuid) to authenticated;
