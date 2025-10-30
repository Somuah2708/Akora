-- Temporarily allow anonymous inserts for sample data
-- This policy will let us insert sample jobs without user_id

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.jobs;

-- Create a new policy that allows inserts without user authentication for sample data
CREATE POLICY "Enable insert for all users" ON public.jobs
    FOR INSERT WITH CHECK (true);

-- Note: After inserting sample data, you may want to restore the original policy:
-- DROP POLICY IF EXISTS "Enable insert for all users" ON public.jobs;
-- CREATE POLICY "Enable insert for authenticated users only" ON public.jobs
--     FOR INSERT WITH CHECK (auth.uid() = user_id);
