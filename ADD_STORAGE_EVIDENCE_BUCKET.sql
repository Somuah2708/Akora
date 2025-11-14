-- Create private bucket for recommendation evidence documents (activity attachments)
-- Run in Supabase SQL editor

-- 1) Bucket (max 10MB per file to allow PDFs/images)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'evidence') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit)
    VALUES ('evidence', 'evidence', false, 10*1024*1024);
  END IF;
END$$;

-- 2) Policies: owner (request creator) or admin/staff can read; only owner inserts; owner or admin/staff can update/delete.
-- Mirrors proofs bucket pattern for consistent access control.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='evidence select own or admin') THEN
    CREATE POLICY "evidence select own or admin"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'evidence'
        AND (
          owner = auth.uid()
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND COALESCE(p.role,'') IN ('admin','staff')
          )
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='evidence insert owner only') THEN
    CREATE POLICY "evidence insert owner only"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'evidence' AND owner = auth.uid()
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='evidence update own or admin') THEN
    CREATE POLICY "evidence update own or admin"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'evidence'
        AND (
          owner = auth.uid()
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND COALESCE(p.role,'') IN ('admin','staff')
          )
        )
      )
      WITH CHECK (
        bucket_id = 'evidence'
        AND (
          owner = auth.uid()
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND COALESCE(p.role,'') IN ('admin','staff')
          )
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='evidence delete own or admin') THEN
    CREATE POLICY "evidence delete own or admin"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'evidence'
        AND (
          owner = auth.uid()
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND COALESCE(p.role,'') IN ('admin','staff')
          )
        )
      );
  END IF;
END$$;
