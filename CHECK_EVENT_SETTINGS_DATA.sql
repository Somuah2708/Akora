-- Quick check to see what's actually in the event_settings table

-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'event_settings'
) AS table_exists;

-- 2. Show all data in the table
SELECT 
  id,
  basic_price,
  standard_price,
  priority_price,
  premium_price,
  bank_name,
  bank_account_name,
  bank_account_number,
  momo_network,
  momo_number,
  momo_account_name,
  created_at,
  updated_at,
  updated_by
FROM public.event_settings;

-- 3. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'event_settings';

-- 4. Count rows
SELECT COUNT(*) as total_rows FROM public.event_settings;
