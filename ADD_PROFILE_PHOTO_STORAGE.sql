-- =============================================
-- PROFILE PHOTO STORAGE SETUP
-- =============================================
-- This migration sets up Supabase Storage for profile photos
-- RLS policies for secure file uploads

-- ⚠️ MANUAL STEP REQUIRED FIRST:
-- Before running this SQL, create the storage bucket via Supabase Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New bucket"
-- 3. Name: mentor-profiles
-- 4. Public bucket: YES (checked)
-- 5. Click "Create bucket"

-- After creating the bucket manually, run this SQL to add RLS policies:

-- RLS Policies for storage bucket

-- Policy: Anyone can view profile photos (public bucket)
CREATE POLICY "Public profile photos are viewable by everyone"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'mentor-profiles');

-- Policy: Authenticated users can upload their own profile photos
CREATE POLICY "Users can upload their own profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mentor-profiles'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own profile photos
CREATE POLICY "Users can update their own profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'mentor-profiles'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'mentor-profiles'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own profile photos
CREATE POLICY "Users can delete their own profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'mentor-profiles'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Admins can manage all profile photos
CREATE POLICY "Admins can manage all profile photos"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'mentor-profiles'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Add helper function to generate profile photo URL
CREATE OR REPLACE FUNCTION get_profile_photo_url(user_id UUID, filename TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN format(
    '%s/storage/v1/object/public/mentor-profiles/%s/%s',
    current_setting('app.supabase_url', true),
    user_id,
    filename
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add helper function to delete old profile photo when uploading new one
CREATE OR REPLACE FUNCTION delete_old_profile_photo()
RETURNS TRIGGER AS $$
DECLARE
  old_photo_path TEXT;
BEGIN
  -- Extract filename from old URL if it exists
  IF OLD.profile_photo_url IS NOT NULL AND OLD.profile_photo_url LIKE '%mentor-profiles%' THEN
    -- Delete old file from storage
    -- Note: This would need to be done via Supabase client in application code
    -- as we can't directly delete from storage in SQL triggers
    RAISE NOTICE 'Old profile photo should be deleted: %', OLD.profile_photo_url;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to notify when profile photo changes (for cleanup)
DROP TRIGGER IF EXISTS trigger_profile_photo_change ON alumni_mentors;
CREATE TRIGGER trigger_profile_photo_change
BEFORE UPDATE OF profile_photo_url ON alumni_mentors
FOR EACH ROW
WHEN (OLD.profile_photo_url IS DISTINCT FROM NEW.profile_photo_url)
EXECUTE FUNCTION delete_old_profile_photo();

COMMENT ON FUNCTION get_profile_photo_url IS 'Generates full URL for profile photo';
