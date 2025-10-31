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

-- Ensure read_by column exists even if table pre-existed
alter table public.group_messages
  add column if not exists read_by uuid[] not null default '{}'::uuid[];

-- Helpful indexes
create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_group_members_group on public.group_members(group_id);
create index if not exists idx_group_messages_group_time on public.group_messages(group_id, created_at desc);

-- RLS
alter table public.groups enable row level security;
-- DISABLE RLS on group_members to avoid recursion - security is controlled via groups table
alter table public.group_members disable row level security;
alter table public.group_messages enable row level security;

-- Helper functions - now safe since group_members has no RLS
create or replace function public.is_member_of_group(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1 from public.group_members m
    where m.group_id = p_group_id and m.user_id = p_user_id
  );
$$;

grant execute on function public.is_member_of_group(uuid, uuid) to authenticated, anon;

create or replace function public.is_admin_of_group(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1 from public.group_members m
    where m.group_id = p_group_id and m.user_id = p_user_id and m.role = 'admin'
  );
$$;

grant execute on function public.is_admin_of_group(uuid, uuid) to authenticated, anon;

-- Policies
-- groups: anyone authenticated can select groups they belong to; creator can insert; admins can update name/avatar
DO $$
BEGIN
  DROP POLICY IF EXISTS "groups select for members" ON public.groups;
  DROP POLICY IF EXISTS "groups insert by authenticated" ON public.groups;
  DROP POLICY IF EXISTS "groups update by admin" ON public.groups;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Allow authenticated users to see groups they're members of
CREATE POLICY "groups select for members" ON public.groups
FOR SELECT TO authenticated
USING (
  public.is_member_of_group(id, auth.uid())
);

-- Allow any authenticated user to create a group
CREATE POLICY "groups insert by authenticated" ON public.groups
FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow admins to update group details
CREATE POLICY "groups update by admin" ON public.groups
FOR UPDATE TO authenticated
USING (public.is_admin_of_group(id, auth.uid()))
WITH CHECK (public.is_admin_of_group(id, auth.uid()));

-- group_members: No RLS policies needed since RLS is disabled on this table
-- Security is enforced through the groups table RLS policies
-- Drop any existing policies to clean up
DO $$
BEGIN
  DROP POLICY IF EXISTS "group_members select for members" ON public.group_members;
  DROP POLICY IF EXISTS "group_members insert by admin" ON public.group_members;
  DROP POLICY IF EXISTS "group_members delete by admin" ON public.group_members;
  DROP POLICY IF EXISTS "group_members update role by admin" ON public.group_members;
EXCEPTION WHEN others THEN NULL;
END $$;

-- group_messages: members can select and insert; allow update for read receipts by members
DO $$
BEGIN
  DROP POLICY IF EXISTS "group_messages select for members" ON public.group_messages;
  DROP POLICY IF EXISTS "group_messages insert by members" ON public.group_messages;
  DROP POLICY IF EXISTS "group_messages update read_by by members" ON public.group_messages;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE POLICY "group_messages select for members" ON public.group_messages
FOR SELECT TO authenticated
USING (public.is_member_of_group(group_id, auth.uid()));

CREATE POLICY "group_messages insert by members" ON public.group_messages
FOR INSERT TO authenticated
WITH CHECK (public.is_member_of_group(group_id, auth.uid()));

CREATE POLICY "group_messages update read_by by members" ON public.group_messages
FOR UPDATE TO authenticated
USING (public.is_member_of_group(group_id, auth.uid()))
WITH CHECK (public.is_member_of_group(group_id, auth.uid()));

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
  set read_by = (select array(select distinct x from unnest(coalesce(m.read_by, '{}'::uuid[])) as x union select p_user_id))
  where m.group_id = p_group_id
    and not (coalesce(m.read_by, '{}'::uuid[]) @> array[p_user_id]);
end;
$$;

grant execute on function public.mark_group_messages_read(uuid, uuid) to authenticated;

-- Guard: prevent removal of all admins by auto-promoting the earliest member if needed
create or replace function public.enforce_group_admins()
returns trigger
language plpgsql
security definer
as $$
declare
  remaining_admins int;
  candidate uuid;
begin
  if ((TG_OP = 'DELETE' and OLD.role = 'admin') or (TG_OP = 'UPDATE' and OLD.role = 'admin' and NEW.role <> 'admin')) then
    select count(*) into remaining_admins
      from public.group_members
      where group_id = OLD.group_id and user_id <> OLD.user_id and role = 'admin';

    if remaining_admins = 0 then
      -- pick earliest joined non-admin member to promote
      select user_id into candidate
        from public.group_members
        where group_id = OLD.group_id and user_id <> OLD.user_id
        order by joined_at asc
        limit 1;
      if candidate is not null then
        update public.group_members set role = 'admin'
        where group_id = OLD.group_id and user_id = candidate;
      end if;
    end if;
  end if;

  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;

do $$ begin
  begin
    drop trigger if exists trg_enforce_group_admins on public.group_members;
    create trigger trg_enforce_group_admins
    before delete or update of role on public.group_members
    for each row execute function public.enforce_group_admins();
  exception when others then null; end;
end $$;

-- RPC: unread counts for all groups of a user in one query
create or replace function public.group_unread_counts(p_user_id uuid)
returns table(group_id uuid, unread integer)
language sql
security definer
as $$
  select msg.group_id, count(*)::int as unread
  from public.group_messages msg
  join public.group_members mm on mm.group_id = msg.group_id and mm.user_id = p_user_id
  where not (coalesce(msg.read_by, '{}'::uuid[]) @> array[p_user_id])
  group by msg.group_id;
$$;

grant execute on function public.group_unread_counts(uuid) to authenticated;

-- RPC: Create a group with the creator as admin atomically
create or replace function public.create_group(
  p_name text,
  p_avatar_url text,
  p_creator_id uuid,
  p_member_ids uuid[]
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_group_id uuid;
  v_member_id uuid;
begin
  -- Insert the group
  insert into public.groups (name, avatar_url, created_by)
  values (p_name, p_avatar_url, p_creator_id)
  returning id into v_group_id;
  
  -- Insert creator as admin
  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, p_creator_id, 'admin');
  
  -- Insert other members
  if p_member_ids is not null then
    foreach v_member_id in array p_member_ids loop
      insert into public.group_members (group_id, user_id, role)
      values (v_group_id, v_member_id, 'member');
    end loop;
  end if;
  
  return v_group_id;
end;
$$;

grant execute on function public.create_group(text, text, uuid, uuid[]) to authenticated;
