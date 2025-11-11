-- Create table for admin-manageable news outlets
-- Run this in Supabase SQL editor

-- Step 1: Create storage bucket for news outlet logos
insert into storage.buckets (id, name, public)
values ('news-logos', 'news-logos', true)
on conflict (id) do nothing;

-- Step 2: Create storage policy to allow public read access
-- Drop existing policy if present to avoid conflicts
drop policy if exists "news_logos_public_read" on storage.objects;
create policy "news_logos_public_read"
on storage.objects for select
using (bucket_id = 'news-logos');

-- Step 3: Create storage policy to allow admins to upload/update/delete logos
-- Drop existing policy if present to avoid conflicts
drop policy if exists "news_logos_admin_write" on storage.objects;
create policy "news_logos_admin_write"
on storage.objects for all
using (
  bucket_id = 'news-logos' and
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.is_admin = true or p.role = 'admin')
  )
) with check (
  bucket_id = 'news-logos' and
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.is_admin = true or p.role = 'admin')
  )
);

-- Step 4: Create table for admin-manageable news outlets
create table if not exists public.news_outlets (
  id uuid primary key default gen_random_uuid(),
  country_code text not null check (char_length(country_code) = 2),
  name text not null,
  url text not null,
  logo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Basic index
create index if not exists idx_news_outlets_country on public.news_outlets(country_code);

-- Row Level Security
alter table public.news_outlets enable row level security;

-- Policies: anyone can read; only admins can write
-- Adjust to your auth schema; assumes profiles table has is_admin boolean and id matches auth.uid()
-- Drop existing policies if present to avoid conflicts
drop policy if exists "news_outlets_read_all" on public.news_outlets;
create policy "news_outlets_read_all" on public.news_outlets
  for select using (true);

drop policy if exists "news_outlets_admin_write" on public.news_outlets;
create policy "news_outlets_admin_write" on public.news_outlets
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.is_admin = true or p.role = 'admin')
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.is_admin = true or p.role = 'admin')
    )
  );

-- Trigger to update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Drop existing trigger if present to avoid conflicts
drop trigger if exists set_news_outlets_updated_at on public.news_outlets;
create trigger set_news_outlets_updated_at
before update on public.news_outlets
for each row execute procedure public.set_updated_at();
