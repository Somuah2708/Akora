-- ================================================
-- IMPORTANT: Run this SQL in your Supabase Dashboard
-- ================================================
-- This ensures the 'media' storage bucket exists and has proper policies
-- ================================================

-- This is a storage bucket configuration, not SQL
-- You need to configure this in Supabase Dashboard:
-- 
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a bucket called 'media' (if it doesn't exist)
-- 3. Make it PUBLIC
-- 4. Set the following policies:
--
-- Policy 1: Allow public read access
-- Policy Name: Public Access
-- Allowed operations: SELECT
-- Policy definition: (bucket_id = 'media')
--
-- Policy 2: Allow authenticated users to upload
-- Policy Name: Authenticated users can upload
-- Allowed operations: INSERT
-- Policy definition: (bucket_id = 'media' AND auth.role() = 'authenticated')
--
-- Policy 3: Allow users to update their own files
-- Policy Name: Users can update own files
-- Allowed operations: UPDATE
-- Policy definition: (bucket_id = 'media' AND auth.uid() = owner)
--
-- Policy 4: Allow users to delete their own files
-- Policy Name: Users can delete own files
-- Allowed operations: DELETE
-- Policy definition: (bucket_id = 'media' AND auth.uid() = owner)

-- ================================================
-- OR run this to create the bucket via SQL:
-- ================================================

-- Insert storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create storage policies
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
    DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Policy 1: Public read access to media bucket
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- Policy 2: Authenticated users can upload to media bucket
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

-- Policy 3: Users can update their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'media' AND auth.uid() = owner);

-- Policy 4: Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (bucket_id = 'media' AND auth.uid() = owner);

-- Verify bucket and policies
SELECT 
    id,
    name,
    public,
    created_at
FROM storage.buckets
WHERE id = 'media';

-- Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%media%' OR policyname LIKE '%public%';

-- ================================================
-- After running this, you should see:
-- 1. The 'media' bucket exists and is public
-- 2. Four policies are created for storage.objects
-- ================================================
