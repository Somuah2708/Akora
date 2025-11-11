-- Add attachments column to support_tickets table
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add index for attachments queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_attachments ON support_tickets USING GIN (attachments);

-- Create storage bucket for support ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for support-attachments bucket

-- Policy: Users can upload attachments for their own tickets
CREATE POLICY "Users can upload support ticket attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'support-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own attachments
CREATE POLICY "Users can view their own support ticket attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own attachments (only for open tickets)
CREATE POLICY "Users can delete their own support ticket attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'support-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Admins can view all attachments
CREATE POLICY "Admins can view all support ticket attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: Admins can delete any attachments
CREATE POLICY "Admins can delete support ticket attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'support-attachments' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Update table comment
COMMENT ON COLUMN support_tickets.attachments IS 'JSON array of attachment objects with file_name, file_path, file_type, file_size, uploaded_at';

-- Example attachment structure:
-- [
--   {
--     "file_name": "transcript.pdf",
--     "file_path": "user-id/ticket-id/transcript.pdf",
--     "file_type": "application/pdf",
--     "file_size": 245678,
--     "uploaded_at": "2025-11-11T10:30:00Z"
--   }
-- ]
