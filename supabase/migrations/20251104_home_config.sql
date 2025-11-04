-- Home configuration tables and policies

-- 1) Featured items shown on the home page horizontal carousel
create table if not exists home_featured_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text not null,
  order_index int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

alter table home_featured_items enable row level security;

-- Public (or anon key) can read
drop policy if exists "public read featured" on home_featured_items;
create policy "public read featured" on home_featured_items for select using (true);

-- Admins can write
drop policy if exists "admins write featured" on home_featured_items;
create policy "admins write featured" on home_featured_items
  for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.is_admin is true or p.role = 'admin')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and (p.is_admin is true or p.role = 'admin')));

create index if not exists idx_home_featured_items_active_order on home_featured_items(is_active, order_index);

-- 2) Category tabs displayed on the home page
create table if not exists home_category_tabs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  icon_name text not null,
  color text not null,
  image_url text not null,
  route text not null,
  order_index int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

alter table home_category_tabs enable row level security;

drop policy if exists "public read tabs" on home_category_tabs;
create policy "public read tabs" on home_category_tabs for select using (true);

drop policy if exists "admins write tabs" on home_category_tabs;
create policy "admins write tabs" on home_category_tabs
  for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.is_admin is true or p.role = 'admin')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and (p.is_admin is true or p.role = 'admin')));

create index if not exists idx_home_category_tabs_active_order on home_category_tabs(is_active, order_index);

-- 3) Seed with current defaults so app renders immediately
insert into home_featured_items (title, description, image_url, order_index)
values
  ('Upcoming Alumni Meet', 'Join us for the annual gathering', 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop&q=60', 0),
  ('Scholarship Program 2024', 'Applications now open', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=60', 1),
  ('Career Development Workshop', 'Enhance your professional skills', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=60', 2)
ON CONFLICT DO NOTHING;

insert into home_category_tabs (title, icon_name, color, image_url, route, order_index)
values
  ('History', 'BookOpen', '#FF6B6B', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&auto=format&fit=crop&q=60', '/heritage', 0),
  ('Centenary', 'PartyPopper', '#4ECDC4', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&auto=format&fit=crop&q=60', '/events', 1),
  ('Calendar', 'Calendar', '#45B7D1', 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400&auto=format&fit=crop&q=60', '/calendar', 2),
  ('Trending', 'TrendingUp', '#F7B731', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&auto=format&fit=crop&q=60', '/news', 3),
  ('Community', 'Users', '#A55EEA', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&auto=format&fit=crop&q=60', '/circles', 4),
  ('News', 'Newspaper', '#26DE81', 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&auto=format&fit=crop&q=60', '/news', 5)
ON CONFLICT DO NOTHING;
