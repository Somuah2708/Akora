-- Create history_items table to store user-submitted history media (images/documents)
-- Note: this migration only creates the DB table. Create a storage bucket called `media` (or reuse existing `media`) in Supabase Storage for file uploads.

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

create index if not exists idx_history_items_user_created on public.history_items(user_id, created_at desc);
create index if not exists idx_history_items_public on public.history_items(is_public, created_at desc) where is_public = true;

-- Ensure realtime publication (best-effort, ignore errors if already configured)
do $$ begin
  begin
    alter table public.history_items replica identity full;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table public.history_items;
  exception when others then null; end;
end $$;
