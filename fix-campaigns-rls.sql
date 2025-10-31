-- Fix RLS policies and create storage bucket

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can create campaigns" ON campaigns;
DROP POLICY IF EXISTS "Anyone can create campaigns" ON campaigns;
DROP POLICY IF EXISTS "Authenticated users can upload campaign images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload campaign images" ON storage.objects;

-- Create new policy to allow anyone to insert campaigns
CREATE POLICY "Allow public campaign creation"
  ON campaigns
  FOR INSERT
  WITH CHECK (true);

-- Create storage bucket for campaign images (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-images', 'campaign-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create storage policies
CREATE POLICY "Allow public image uploads"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'campaign-images');

CREATE POLICY "Allow public to delete own images"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'campaign-images');
