-- Clean up duplicate event_settings rows
-- Run this ONCE to fix the duplicate row issue

-- 1. Show current state (before cleanup)
SELECT 
  'BEFORE CLEANUP' as status,
  COUNT(*) as total_rows
FROM public.event_settings;

SELECT 
  id,
  basic_price,
  standard_price,
  priority_price,
  premium_price,
  created_at,
  updated_at
FROM public.event_settings
ORDER BY created_at;

-- 2. Delete any rows that are NOT the canonical settings row
DELETE FROM public.event_settings 
WHERE id != '00000000-0000-0000-0000-000000000001';

-- 3. Show final state (after cleanup)
SELECT 
  'AFTER CLEANUP' as status,
  COUNT(*) as total_rows
FROM public.event_settings;

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
  updated_at
FROM public.event_settings;

-- 4. Verify result
DO $$
DECLARE
  row_count INTEGER;
  correct_id_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO row_count FROM public.event_settings;
  SELECT EXISTS(SELECT 1 FROM public.event_settings WHERE id = '00000000-0000-0000-0000-000000000001') INTO correct_id_exists;
  
  IF row_count = 1 AND correct_id_exists THEN
    RAISE NOTICE '✅ SUCCESS: Exactly 1 settings row with correct ID exists';
  ELSIF row_count = 0 THEN
    RAISE WARNING '⚠️  WARNING: No settings rows found. Run COMPLETE_EVENT_SETTINGS_FIX.sql';
  ELSIF row_count > 1 THEN
    RAISE WARNING '⚠️  WARNING: Still % rows found. Manual cleanup needed.', row_count;
  ELSIF NOT correct_id_exists THEN
    RAISE WARNING '⚠️  WARNING: Settings row exists but with wrong ID';
  END IF;
END $$;
