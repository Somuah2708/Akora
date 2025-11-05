-- Migrate profile_highlights to post-based model (idempotent as much as possible)
-- Date: 2025-11-02

-- 1) Create table if it doesn't exist
create table if not exists public.profile_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  order_index integer not null default 0,
  visible boolean not null default true,
  pinned boolean not null default false,
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 2) Ensure columns and defaults match the new contract
do $$
begin
  -- add post_id if missing
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profile_highlights' and column_name = 'post_id'
  ) then
    alter table public.profile_highlights
      add column post_id uuid references public.posts(id) on delete cascade;
  end if;

  -- make sure order_index default and not null
  alter table public.profile_highlights
    alter column order_index set default 0,
    alter column order_index set not null;

  -- ensure visible/pinned defaults and not null
  alter table public.profile_highlights
    alter column visible set default true,
    alter column visible set not null,
    alter column pinned set default false,
    alter column pinned set not null;

  -- ensure created_at default
  alter table public.profile_highlights
    alter column created_at set default now();

  -- drop deprecated columns if they exist
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profile_highlights' and column_name = 'kind'
  ) then
    alter table public.profile_highlights drop column kind;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profile_highlights' and column_name = 'media_url'
  ) then
    alter table public.profile_highlights drop column media_url;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profile_highlights' and column_name = 'action_url'
  ) then
    alter table public.profile_highlights drop column action_url;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profile_highlights' and column_name = 'emoji'
  ) then
    alter table public.profile_highlights drop column emoji;
  end if;
  -- color is optional; keep if present
exception when others then
  -- no-op; continue even if some alters fail (e.g., column already dropped)
  null;
end $$;

-- 3) Indexes
create index if not exists profile_highlights_user_idx on public.profile_highlights(user_id);
create index if not exists profile_highlights_order_idx on public.profile_highlights(user_id, pinned desc, order_index asc);
create index if not exists profile_highlights_post_idx on public.profile_highlights(post_id);

-- 4) RLS policies
alter table public.profile_highlights enable row level security;

-- Allow anyone to read visible highlights (for public profile viewing)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profile_highlights' and policyname='Anyone can view visible highlights'
  ) then
    create policy "Anyone can view visible highlights" on public.profile_highlights
      for select using (
        visible is true or auth.uid() = user_id
      );
  end if;
end $$;

-- Only owners can insert/update/delete their highlights
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profile_highlights' and policyname='Owners can insert highlights'
  ) then
    create policy "Owners can insert highlights" on public.profile_highlights
      for insert to authenticated
      with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profile_highlights' and policyname='Owners can update highlights'
  ) then
    create policy "Owners can update highlights" on public.profile_highlights
      for update to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profile_highlights' and policyname='Owners can delete highlights'
  ) then
    create policy "Owners can delete highlights" on public.profile_highlights
      for delete to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- 5) Optional: enforce max 12 visible highlights per user (soft enforcement exists in app)
-- Uncomment to hard-enforce on the server
-- do $$
-- begin
--   if not exists (
--     select 1 from pg_proc where proname = 'enforce_max_visible_highlights'
--   ) then
--     create or replace function public.enforce_max_visible_highlights()
--     returns trigger as $$
--     begin
--       if NEW.visible is true then
--         perform 1 from public.profile_highlights where user_id = NEW.user_id and visible is true and id <> coalesce(NEW.id, '00000000-0000-0000-0000-000000000000');
--         if (select count(*) from public.profile_highlights where user_id = NEW.user_id and visible is true and id <> coalesce(NEW.id, '00000000-0000-0000-0000-000000000000')) >= 12 then
--           raise exception 'Maximum of 12 visible highlights allowed per user';
--         end if;
--       end if;
--       return NEW;
--     end;
--     $$ language plpgsql;
--
--     drop trigger if exists trg_enforce_max_visible_highlights on public.profile_highlights;
--     create trigger trg_enforce_max_visible_highlights
--       before insert or update on public.profile_highlights
--       for each row execute procedure public.enforce_max_visible_highlights();
--   end if;
-- end $$;
