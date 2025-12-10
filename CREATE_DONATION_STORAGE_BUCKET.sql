-- ========================================
-- CREATE STORAGE BUCKET FOR DONATION RECEIPTS
-- ========================================

-- Insert storage bucket for donation proofs/receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'donation-proofs',
  'donation-proofs',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

-- Storage policies for donation-proofs bucket
CREATE POLICY "Users can upload their own donation receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'donation-proofs' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own donation receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'donation-proofs' 
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      )
    )
  );

CREATE POLICY "Admins can view all donation receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'donation-proofs'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Public access to donation receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'donation-proofs');

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Storage bucket "donation-proofs" created successfully!';
  RAISE NOTICE '📁 File size limit: 5MB';
  RAISE NOTICE '📄 Allowed types: JPEG, PNG, WEBP, PDF';
  RAISE NOTICE '🔒 Storage policies applied';
END $$;
