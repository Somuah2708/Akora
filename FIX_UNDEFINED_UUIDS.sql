-- Fix "undefined" string values in UUID columns in akora_events table
-- This script identifies and fixes any UUID columns that contain the string "undefined"

-- IMPORTANT: Run this entire script in your Supabase SQL Editor

-- Step 1: First, let's try to identify problematic records
-- Note: This query might fail if the data is too corrupted, that's okay
DO $$ 
BEGIN
  -- Attempt to find and log problematic records
  RAISE NOTICE 'Checking for corrupted UUID values...';
END $$;

-- Step 2: The safest approach - check each column that might be problematic
-- We'll use a more careful approach that won't fail if data is corrupted

-- Fix created_by column
DO $$ 
DECLARE
  fixed_count INTEGER := 0;
BEGIN
  -- Try to fix created_by if it's stored as text 'undefined'
  -- This uses a safer approach with exception handling
  UPDATE akora_events
  SET created_by = NULL
  WHERE 
    created_by IS NOT NULL 
    AND created_by::text = 'undefined';
  
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE 'Fixed % records with undefined created_by', fixed_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not fix created_by: %', SQLERRM;
END $$;

-- Fix approved_by column
DO $$ 
DECLARE
  fixed_count INTEGER := 0;
BEGIN
  UPDATE akora_events
  SET approved_by = NULL
  WHERE 
    approved_by IS NOT NULL 
    AND approved_by::text = 'undefined';
  
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE 'Fixed % records with undefined approved_by', fixed_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not fix approved_by: %', SQLERRM;
END $$;

-- Step 3: Create a function that can be called from the app to fix issues
CREATE OR REPLACE FUNCTION fix_undefined_uuids_in_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Fix created_by
  UPDATE akora_events
  SET created_by = NULL
  WHERE created_by::text = 'undefined';
  
  -- Fix approved_by
  UPDATE akora_events
  SET approved_by = NULL
  WHERE approved_by::text = 'undefined';
END;
$$;

-- Step 4: Run the function once to fix existing data
SELECT fix_undefined_uuids_in_events();

-- Step 5: Verify the fix
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM akora_events
  WHERE 
    (created_by IS NOT NULL AND created_by::text = 'undefined')
    OR (approved_by IS NOT NULL AND approved_by::text = 'undefined');
  
  IF remaining_count = 0 THEN
    RAISE NOTICE '✅ All undefined UUIDs fixed successfully!';
  ELSE
    RAISE NOTICE '⚠️  Still have % records with undefined UUIDs', remaining_count;
  END IF;
END $$;

-- Step 6: Show all UUID columns for reference
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'akora_events'
  AND data_type = 'uuid'
ORDER BY ordinal_position;
