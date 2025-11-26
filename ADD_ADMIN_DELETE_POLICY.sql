-- Add admin delete policy for jobs table
-- This allows admins to delete any job listing

-- Step 1: Drop the old restrictive delete policy
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.jobs;

-- Step 2: Create new policy that allows:
-- 1. Users to delete their own jobs (auth.uid() = user_id)
-- 2. Admins to delete ANY job (is_admin = true)
CREATE POLICY "Enable delete for users and admins" ON public.jobs
    FOR DELETE USING (
        auth.uid() = user_id 
        OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

COMMENT ON POLICY "Enable delete for users and admins" ON public.jobs IS 'Allows users to delete their own jobs and admins to delete any job';

