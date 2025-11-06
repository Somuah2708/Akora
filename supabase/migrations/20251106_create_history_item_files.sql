-- Create a child table to support multiple files per history item

create table if not exists public.history_item_files (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.history_items(id) on delete cascade,
  file_path text not null,
  file_name text,
  mime_type text,
  created_at timestamptz default now()
);

create index if not exists idx_history_item_files_item on public.history_item_files(item_id, created_at desc);
create index if not exists idx_history_item_files_mime on public.history_item_files(mime_type);

-- Realtime for child table
do $$ begin
  begin
    alter table public.history_item_files replica identity full;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table public.history_item_files;
  exception when others then null; end;
end $$;

-- Enable RLS and policies leveraging parent item ownership/visibility
alter table public.history_item_files enable row level security;

-- Select allowed if parent is public or owner
drop policy if exists history_item_files_select on public.history_item_files;
create policy history_item_files_select
on public.history_item_files
for select
using (
  exists (
    select 1 from public.history_items hi
    where hi.id = item_id
      and (hi.is_public = true or hi.user_id = auth.uid())
  )
);

-- Insert allowed only by parent owner
drop policy if exists history_item_files_insert on public.history_item_files;
create policy history_item_files_insert
on public.history_item_files
for insert
with check (
  exists (
    select 1 from public.history_items hi
    where hi.id = item_id and hi.user_id = auth.uid()
  )
);

-- Update allowed only by parent owner
drop policy if exists history_item_files_update on public.history_item_files;
create policy history_item_files_update
on public.history_item_files
for update
using (
  exists (
    select 1 from public.history_items hi
    where hi.id = item_id and hi.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.history_items hi
    where hi.id = item_id and hi.user_id = auth.uid()
  )
);

-- Delete allowed only by parent owner
drop policy if exists history_item_files_delete on public.history_item_files;
create policy history_item_files_delete
on public.history_item_files
for delete
using (
  exists (
    select 1 from public.history_items hi
    where hi.id = item_id and hi.user_id = auth.uid()
  )
);
