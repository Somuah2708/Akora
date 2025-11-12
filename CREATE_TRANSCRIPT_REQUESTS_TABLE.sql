-- Transcript requests table and policies
-- Run in Supabase SQL editor

create table if not exists public.transcript_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  full_name text not null,
  student_id text not null,
  graduation_year text,
  delivery_address text,
  phone_number text,
  email text not null,
  request_type text not null, -- e.g., "Official Transcript", "Digital Transcript"
  additional_notes text,
  status text not null default 'pending', -- pending | processing | completed | rejected
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- index for admin filtering
create index if not exists idx_transcript_requests_user on public.transcript_requests(user_id);
create index if not exists idx_transcript_requests_status on public.transcript_requests(status);

-- enable RLS
alter table public.transcript_requests enable row level security;

-- Policies
-- Drop then create to be compatible across Postgres versions
drop policy if exists "transcript_insert_own" on public.transcript_requests;
create policy "transcript_insert_own" on public.transcript_requests
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Drop then create to be compatible across Postgres versions
drop policy if exists "transcript_select_own" on public.transcript_requests;
create policy "transcript_select_own" on public.transcript_requests
  for select to authenticated
  using (auth.uid() = user_id);

-- Drop then create to be compatible across Postgres versions
drop policy if exists "transcript_admin_all" on public.transcript_requests;
create policy "transcript_admin_all" on public.transcript_requests
  for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.is_admin = true or p.role = 'admin')
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.is_admin = true or p.role = 'admin')
  ));

-- trigger to maintain updated_at
create or replace function public.set_updated_at_transcript()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_transcript_updated_at on public.transcript_requests;
create trigger set_transcript_updated_at
before update on public.transcript_requests
for each row execute procedure public.set_updated_at_transcript();
