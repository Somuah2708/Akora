-- Enhanced Livestreams Schema with Admin Support
-- Run this migration to update the livestreams table

-- Update livestreams table (add any missing columns)
ALTER TABLE IF EXISTS public.livestreams
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_livestreams_created_by ON public.livestreams(created_by);
CREATE INDEX IF NOT EXISTS idx_livestreams_user_id ON public.livestreams(user_id);

-- Update RLS policies to allow admins to manage streams
DROP POLICY IF EXISTS "Authenticated users can create livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Authenticated users can update livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can delete their own streams" ON public.livestreams;

-- Allow admins to create livestreams
CREATE POLICY "Admins can create livestreams"
  ON public.livestreams
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Allow admins to update any livestream
CREATE POLICY "Admins can update livestreams"
  ON public.livestreams
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Allow admins to delete livestreams
CREATE POLICY "Admins can delete livestreams"
  ON public.livestreams
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Create storage bucket for livestream thumbnails (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('livestream-thumbnails', 'livestream-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for livestream thumbnails
DROP POLICY IF EXISTS "Public can view livestream thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload livestream thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete livestream thumbnails" ON storage.objects;

-- Allow public read access to thumbnails
CREATE POLICY "Public can view livestream thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'livestream-thumbnails');

-- Allow admins to upload thumbnails
CREATE POLICY "Admins can upload livestream thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'livestream-thumbnails'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Allow admins to delete thumbnails
CREATE POLICY "Admins can delete livestream thumbnails"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'livestream-thumbnails'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Function to auto-populate created_by field
CREATE OR REPLACE FUNCTION set_livestream_creator()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-set creator
DROP TRIGGER IF EXISTS set_livestream_creator_trigger ON public.livestreams;
CREATE TRIGGER set_livestream_creator_trigger
  BEFORE INSERT ON public.livestreams
  FOR EACH ROW
  EXECUTE FUNCTION set_livestream_creator();

-- Sample data for testing (optional - comment out if not needed)
-- This creates a test stream with a YouTube URL
/*
INSERT INTO public.livestreams (
  title,
  description,
  short_description,
  thumbnail_url,
  stream_url,
  host_name,
  category,
  is_live,
  start_time,
  viewer_count
) VALUES (
  'Alumni Homecoming 2025 - Opening Ceremony',
  'Join us for the grand opening of our Alumni Homecoming celebration! Reconnect with old friends, meet fellow alumni, and celebrate our shared heritage.',
  'Grand opening of Alumni Homecoming 2025',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'OAA Events Team',
  'Event',
  true,
  NOW(),
  0
);
*/

-- Verify the schema
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'livestreams'
ORDER BY ordinal_position;
