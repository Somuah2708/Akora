-- Add verification documents column to mentor_applications table
-- This stores uploaded proof documents to verify mentor credentials

-- Add column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mentor_applications' 
        AND column_name = 'verification_documents'
    ) THEN
        ALTER TABLE mentor_applications 
        ADD COLUMN verification_documents TEXT[];
    END IF;
END $$;

-- Add helpful comment
COMMENT ON COLUMN mentor_applications.verification_documents IS 'Array of URLs to uploaded verification documents (diplomas, certificates, IDs, etc.)';

-- Create storage bucket for verification documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('mentor-verification', 'mentor-verification', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for mentor-verification bucket
DROP POLICY IF EXISTS "Users can upload their own verification documents" ON storage.objects;
CREATE POLICY "Users can upload their own verification documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mentor-verification' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can view their own verification documents" ON storage.objects;
CREATE POLICY "Users can view their own verification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'mentor-verification' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can view all verification documents" ON storage.objects;
CREATE POLICY "Admins can view all verification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'mentor-verification' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);

DROP POLICY IF EXISTS "Users can delete their own verification documents" ON storage.objects;
CREATE POLICY "Users can delete their own verification documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'mentor-verification' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'mentor_applications' 
AND column_name = 'verification_documents';
