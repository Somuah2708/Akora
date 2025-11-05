-- User chat settings for direct and group conversations
-- Stores per-user preferences like pinned, muted, archived and last-read timestamps

create table if not exists public.user_chat_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  peer_user_id uuid references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  pinned boolean not null default false,
  muted_until timestamptz,
  archived_at timestamptz,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_chat_settings_target_xor check (
    (peer_user_id is not null and group_id is null) or (peer_user_id is null and group_id is not null)
  )
);

create index if not exists idx_user_chat_settings_user on public.user_chat_settings(user_id);
create index if not exists idx_user_chat_settings_pinned on public.user_chat_settings(user_id, pinned desc);
create unique index if not exists uniq_user_direct_setting on public.user_chat_settings(user_id, peer_user_id) where peer_user_id is not null;
create unique index if not exists uniq_user_group_setting on public.user_chat_settings(user_id, group_id) where group_id is not null;

alter table public.user_chat_settings enable row level security;

-- RLS: owners only
do $$ begin
  begin
    drop policy if exists "chat settings owner select" on public.user_chat_settings;
    drop policy if exists "chat settings owner upsert" on public.user_chat_settings;
    drop policy if exists "chat settings owner delete" on public.user_chat_settings;
  exception when others then null; end;
end $$;

create policy "chat settings owner select" on public.user_chat_settings
for select to authenticated
using (auth.uid() = user_id);

create policy "chat settings owner upsert" on public.user_chat_settings
for insert to authenticated
with check (auth.uid() = user_id);

create policy "chat settings owner update" on public.user_chat_settings
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "chat settings owner delete" on public.user_chat_settings
for delete to authenticated
using (auth.uid() = user_id);

-- Updated at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_user_chat_settings_updated_at on public.user_chat_settings;
create trigger trg_user_chat_settings_updated_at
before update on public.user_chat_settings
for each row execute function public.set_updated_at();
