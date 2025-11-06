-- Full setup for history_items: create table (if missing), indexes, realtime, RLS, and policies
-- Safe to run multiple times.

-- 1) Create table if it doesn't exist
create table if not exists public.history_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text,
  description text,
  file_path text not null,
  file_name text,
  mime_type text,
  is_public boolean default true,
  created_at timestamptz default now()
);

-- 2) Indexes
create index if not exists idx_history_items_user_created on public.history_items(user_id, created_at desc);
create index if not exists idx_history_items_public on public.history_items(is_public, created_at desc) where is_public = true;

-- 3) Realtime (best-effort)
do $$ begin
  begin
    alter table public.history_items replica identity full;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table public.history_items;
  exception when others then null; end;
end $$;

-- 4) Enable RLS and policies
alter table public.history_items enable row level security;

-- Select policy: public rows or owner rows
drop policy if exists history_items_select_public_or_owner on public.history_items;
create policy history_items_select_public_or_owner
on public.history_items
for select
using (
  is_public = true or auth.uid() = user_id
);

-- Insert policy: owner only
drop policy if exists history_items_insert_owner on public.history_items;
create policy history_items_insert_owner
on public.history_items
for insert
with check (auth.uid() = user_id);

-- Update policy: owner only
drop policy if exists history_items_update_owner on public.history_items;
create policy history_items_update_owner
on public.history_items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Delete policy: owner only
drop policy if exists history_items_delete_owner on public.history_items;
create policy history_items_delete_owner
on public.history_items
for delete
using (auth.uid() = user_id);
