-- Ensure the Centenary home tab routes to the new /centenary screen

-- Update existing Centenary row if present
update public.home_category_tabs
   set route = '/centenary'
 where title = 'Centenary'
   and route <> '/centenary';

-- If no row exists (or was previously deleted), insert a sane default
insert into public.home_category_tabs (title, icon_name, color, image_url, route, order_index, is_active)
select 'Centenary', 'PartyPopper', '#4ECDC4',
       'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&auto=format&fit=crop&q=60',
       '/centenary', 1, true
where not exists (
  select 1 from public.home_category_tabs where title = 'Centenary'
);
