-- Create storage bucket for forum attachments (images and documents)
INSERT INTO storage.buckets (id, name, public)
VALUES ('forum-attachments', 'forum-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for forum attachments
CREATE POLICY "Anyone can view forum attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'forum-attachments');

CREATE POLICY "Authenticated users can upload forum attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'forum-attachments' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own forum attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'forum-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own forum attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'forum-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
