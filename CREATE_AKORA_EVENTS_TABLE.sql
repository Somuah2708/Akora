-- Akora Events data model (OAA school events + Akora alumni events)
-- Creates a unified table with type and moderation workflow

create extension if not exists pgcrypto;

create table if not exists public.akora_events (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('oaa','akora')), -- 'oaa' = school events, 'akora' = alumni events
  title text not null,
  description text not null,
  location text not null,
  start_time timestamptz not null,
  end_time timestamptz,
  banner_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','published')),
  listing_fee numeric(10,2) default 50.00, -- fee for alumni listing (can be 0 for OAA)
  payment_proof_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_akora_events_type_status on public.akora_events(event_type, status);
create index if not exists idx_akora_events_start_time on public.akora_events(start_time);

-- Adjust defaults depending on type via triggers (publish OAA by default)
create or replace function public.akora_events_set_defaults()
returns trigger as $$
begin
  if NEW.event_type = 'oaa' then
    NEW.status := coalesce(NEW.status, 'published');
    NEW.listing_fee := 0;
  else
    NEW.status := coalesce(NEW.status, 'pending');
  end if;
  NEW.updated_at := now();
  return NEW;
end;
$$ language plpgsql;

create or replace trigger trg_akora_events_defaults
before insert on public.akora_events
for each row execute function public.akora_events_set_defaults();

-- Maintain updated_at on UPDATE via trigger function
create or replace function public.akora_events_touch_updated_at()
returns trigger as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$ language plpgsql;

create or replace trigger trg_akora_events_updated
before update on public.akora_events
for each row execute function public.akora_events_touch_updated_at();

-- Enable RLS
alter table public.akora_events enable row level security;

-- Admin check helper (role or is_admin)
-- Note: adjust to your actual profiles schema

-- Policies
-- 1) SELECT: everyone sees published events; owners see their own; admins see all
create policy sel_published_or_own_or_admin on public.akora_events
for select
using (
  status = 'published'
  or created_by = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (coalesce(p.is_admin,false) = true or p.role in ('admin','staff'))
  )
);

-- 2) INSERT: akora events by any authenticated user; oaa events only by admin/staff
create policy ins_akora_by_user on public.akora_events
for insert with check (
  auth.uid() is not null and event_type = 'akora' and created_by = auth.uid()
);

create policy ins_oaa_by_admin on public.akora_events
for insert with check (
  event_type = 'oaa' and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (coalesce(p.is_admin,false) = true or p.role in ('admin','staff'))
  )
);

-- 3) UPDATE: owners can edit while pending/rejected; admins can update any
create policy upd_own_pending on public.akora_events
for update using (
  created_by = auth.uid() and status in ('pending','rejected')
) with check (
  created_by = auth.uid() and status in ('pending','rejected')
);

create policy upd_admin_any on public.akora_events
for update using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (coalesce(p.is_admin,false) = true or p.role in ('admin','staff'))
  )
);

-- 4) DELETE: owners can delete while pending/rejected; admins can delete any
create policy del_own_pending on public.akora_events
for delete using (
  created_by = auth.uid() and status in ('pending','rejected')
);

create policy del_admin_any on public.akora_events
for delete using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (coalesce(p.is_admin,false) = true or p.role in ('admin','staff'))
  )
);
