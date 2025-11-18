-- QUICK FIX: Auto-approve all existing and future jobs
-- Run this in Supabase SQL Editor to see jobs immediately

-- Option 1: Approve ALL existing jobs (recommended for testing)
UPDATE products_services 
SET 
    is_approved = true,
    approval_status = 'approved',
    approved_at = COALESCE(approved_at, NOW())
WHERE category_name IN ('Full Time Jobs', 'Internships', 'National Service', 'Part Time', 'Remote Work', 'Volunteering');

-- Option 2: Temporarily disable approval requirement (for testing only)
-- Uncomment the lines below to make all jobs auto-approve:

-- ALTER TABLE products_services 
-- ALTER COLUMN is_approved SET DEFAULT true;

-- ALTER TABLE products_services 
-- ALTER COLUMN approval_status SET DEFAULT 'approved';

-- Option 3: Check current job status
SELECT 
    id,
    title,
    category_name,
    is_approved,
    approval_status,
    created_at,
    CASE 
        WHEN approval_status IS NULL THEN 'NO STATUS'
        WHEN approval_status = 'pending' THEN 'PENDING'
        WHEN approval_status = 'approved' THEN 'APPROVED'
        WHEN approval_status = 'declined' THEN 'DECLINED'
    END as status_text
FROM products_services
WHERE category_name IN ('Full Time Jobs', 'Internships', 'National Service', 'Part Time', 'Remote Work', 'Volunteering')
ORDER BY created_at DESC
LIMIT 20;

-- Option 4: Count jobs by status
SELECT 
    approval_status,
    is_approved,
    COUNT(*) as total
FROM products_services
WHERE category_name IN ('Full Time Jobs', 'Internships', 'National Service', 'Part Time', 'Remote Work', 'Volunteering')
GROUP BY approval_status, is_approved;
