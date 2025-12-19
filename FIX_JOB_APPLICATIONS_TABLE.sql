-- =====================================================
-- FIX JOB APPLICATIONS TABLE
-- Update job_id reference from products_services to jobs
-- =====================================================

-- First, drop the existing foreign key constraint
ALTER TABLE job_applications 
DROP CONSTRAINT IF EXISTS job_applications_job_id_fkey;

-- Add new foreign key constraint referencing jobs table
ALTER TABLE job_applications 
ADD CONSTRAINT job_applications_job_id_fkey 
FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

-- Verify the change
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'job_applications' 
  AND tc.constraint_type = 'FOREIGN KEY';
