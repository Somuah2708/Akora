-- Ensure RLS is enabled and owner-only write on key tables

-- profiles: only the owner can update their row
alter table if exists public.profiles enable row level security;

drop policy if exists "profiles_owner_update" on public.profiles;
create policy "profiles_owner_update"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Optionally restrict delete to owner as well (if deletes are allowed)
drop policy if exists "profiles_owner_delete" on public.profiles;
create policy "profiles_owner_delete"
  on public.profiles
  for delete
  to authenticated
  using (auth.uid() = id);

-- profile_highlight_covers: public select, owner insert/update/delete
alter table if exists public.profile_highlight_covers enable row level security;

drop policy if exists "covers_public_select" on public.profile_highlight_covers;
create policy "covers_public_select"
  on public.profile_highlight_covers
  for select
  to anon, authenticated
  using (true);

drop policy if exists "covers_owner_write" on public.profile_highlight_covers;
create policy "covers_owner_write"
  on public.profile_highlight_covers
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- profile_highlights: only the owner can insert/update/delete their highlights; public can select visible ones
alter table if exists public.profile_highlights enable row level security;

drop policy if exists "highlights_public_select_visible" on public.profile_highlights;
create policy "highlights_public_select_visible"
  on public.profile_highlights
  for select
  to anon, authenticated
  using (visible = true);

drop policy if exists "highlights_owner_write" on public.profile_highlights;
create policy "highlights_owner_write"
  on public.profile_highlights
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
