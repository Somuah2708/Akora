-- Enable RLS and add policies for history_items

alter table public.history_items enable row level security;

-- Allow anyone to select public rows; owners can select their own rows
drop policy if exists history_items_select_public_or_owner on public.history_items;
create policy history_items_select_public_or_owner
on public.history_items
for select
using (
  is_public = true or auth.uid() = user_id
);

-- Only owners can insert rows (must insert with user_id = auth.uid())
drop policy if exists history_items_insert_owner on public.history_items;
create policy history_items_insert_owner
on public.history_items
for insert
with check (auth.uid() = user_id);

-- Only owners can update their rows
drop policy if exists history_items_update_owner on public.history_items;
create policy history_items_update_owner
on public.history_items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Only owners can delete their rows
drop policy if exists history_items_delete_owner on public.history_items;
create policy history_items_delete_owner
on public.history_items
for delete
using (auth.uid() = user_id);
