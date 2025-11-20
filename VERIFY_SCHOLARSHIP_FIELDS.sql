-- ============================================================================
-- VERIFY SCHOLARSHIP FIELDS - Run this to check if columns exist and have data
-- ============================================================================

-- 1. CHECK IF COLUMNS EXIST IN SCHOLARSHIPS TABLE
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'scholarships'
  AND column_name IN (
    'scholarship_types',
    'eligibility_levels', 
    'fields_of_study',
    'contact_email'
  )
ORDER BY column_name;

-- Expected Result: Should show 4 rows with these columns

-- ============================================================================

-- 2. CHECK IF ANY SCHOLARSHIPS HAVE THESE FIELDS POPULATED
SELECT 
  id,
  title,
  scholarship_types,
  eligibility_levels,
  fields_of_study,
  contact_email,
  created_at
FROM public.scholarships
ORDER BY created_at DESC
LIMIT 10;

-- Expected Result: Should show recent scholarships with their array fields

-- ============================================================================

-- 3. COUNT HOW MANY SCHOLARSHIPS HAVE THESE FIELDS FILLED
SELECT 
  COUNT(*) as total_scholarships,
  COUNT(scholarship_types) as with_scholarship_types,
  COUNT(eligibility_levels) as with_eligibility_levels,
  COUNT(fields_of_study) as with_fields_of_study,
  COUNT(contact_email) as with_contact_email
FROM public.scholarships;

-- Expected Result: Shows how many scholarships have each field populated

-- ============================================================================

-- 4. IF COLUMNS DON'T EXIST, ADD THEM (should already exist from migration)
-- Uncomment ONLY if step 1 shows columns are missing:

/*
ALTER TABLE public.scholarships 
ADD COLUMN IF NOT EXISTS scholarship_types text[],
ADD COLUMN IF NOT EXISTS eligibility_levels text[],
ADD COLUMN IF NOT EXISTS fields_of_study text[],
ADD COLUMN IF NOT EXISTS contact_email text;
*/

-- ============================================================================

-- 5. TEST UPDATE - Update a specific scholarship with test data
-- Replace 'YOUR_SCHOLARSHIP_ID' with an actual ID from step 2

/*
UPDATE public.scholarships
SET 
  scholarship_types = ARRAY['Merit-based', 'STEM'],
  eligibility_levels = ARRAY['Undergraduate', 'Graduate'],
  fields_of_study = ARRAY['Engineering', 'Computer Science & IT'],
  contact_email = 'test@example.com'
WHERE id = 'YOUR_SCHOLARSHIP_ID';

-- Then verify:
SELECT 
  title,
  scholarship_types,
  eligibility_levels,
  fields_of_study,
  contact_email
FROM public.scholarships
WHERE id = 'YOUR_SCHOLARSHIP_ID';
*/
