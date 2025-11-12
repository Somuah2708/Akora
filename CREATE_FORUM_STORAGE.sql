-- Create storage bucket for forum attachments (images and documents)
INSERT INTO storage.buckets (id, name, public)
VALUES ('forum-attachments', 'forum-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for forum attachments (idempotent)
DO $$
BEGIN
  -- SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Anyone can view forum attachments'
  ) THEN
    CREATE POLICY "Anyone can view forum attachments"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'forum-attachments');
  END IF;
END $$;

DO $$
BEGIN
  -- INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Authenticated users can upload forum attachments'
  ) THEN
    CREATE POLICY "Authenticated users can upload forum attachments"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'forum-attachments' AND
      auth.role() = 'authenticated'
    );
  END IF;
END $$;

DO $$
BEGIN
  -- UPDATE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can update their own forum attachments'
  ) THEN
    CREATE POLICY "Users can update their own forum attachments"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'forum-attachments' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

DO $$
BEGIN
  -- DELETE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can delete their own forum attachments'
  ) THEN
    CREATE POLICY "Users can delete their own forum attachments"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'forum-attachments' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;
