-- Diagnostic: Check event_settings table and data

-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'event_settings'
) as table_exists;

-- 2. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'event_settings'
ORDER BY ordinal_position;

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

-- 4. Check existing data
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
FROM event_settings;

-- 5. Check grants
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'event_settings';

-- 6. Test insert (will fail if RLS blocks it, which is good for testing)
-- Run this separately to test if insert works:
/*
INSERT INTO event_settings (
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
  momo_account_name
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  0,
  50,
  150,
  300,
  'Test Bank',
  'Test Account',
  '1234567890',
  'MTN',
  '0244123456',
  'Test MoMo'
)
ON CONFLICT (id) DO UPDATE SET
  basic_price = EXCLUDED.basic_price,
  standard_price = EXCLUDED.standard_price,
  priority_price = EXCLUDED.priority_price,
  premium_price = EXCLUDED.premium_price,
  bank_name = EXCLUDED.bank_name,
  bank_account_name = EXCLUDED.bank_account_name,
  bank_account_number = EXCLUDED.bank_account_number,
  momo_network = EXCLUDED.momo_network,
  momo_number = EXCLUDED.momo_number,
  momo_account_name = EXCLUDED.momo_account_name,
  updated_at = NOW();
*/
