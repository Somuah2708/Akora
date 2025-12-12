-- FIX_DONATION_STORAGE_RLS.sql
-- STEP 1: Create the bucket manually in Supabase Dashboard
-- Go to Storage > New bucket > Name: "donation-proofs" > Public: ON > Create

-- STEP 2: Run this SQL query in the SQL Editor after creating the bucket

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to upload donation receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view donation receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to delete donation receipts" ON storage.objects;

-- Policy 1: Allow authenticated users to upload their own donation receipts
CREATE POLICY "Allow authenticated users to upload donation receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'donation-proofs' 
  AND (storage.foldername(name))[1] = 'donation-receipts'
);

-- Policy 2: Allow public read access to donation receipts (for admins to view)
CREATE POLICY "Allow public to view donation receipts"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'donation-proofs');

-- Policy 3: Allow users to update their own receipts
CREATE POLICY "Allow users to update their own receipts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'donation-proofs'
  AND (storage.foldername(name))[1] = 'donation-receipts'
)
WITH CHECK (
  bucket_id = 'donation-proofs'
  AND (storage.foldername(name))[1] = 'donation-receipts'
);

-- Policy 4: Allow admins to delete donation receipts
CREATE POLICY "Allow admins to delete donation receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'donation-proofs'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.is_admin = true OR profiles.role = 'admin')
  )
);
