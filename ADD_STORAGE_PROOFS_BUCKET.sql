-- Create private bucket for payment proofs and add RLS-like storage policies
-- Run in Supabase SQL editor

-- 1) Bucket (max 5MB files)
-- Some projects don't expose storage.create_bucket with named args.
-- Use an idempotent insert into storage.buckets instead.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'proofs') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit)
    VALUES ('proofs', 'proofs', false, 5*1024*1024);
  END IF;
END$$;

-- 2) Policies: owner or admin/staff can read/write/delete
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='proofs select own or admin') THEN
    CREATE POLICY "proofs select own or admin"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'proofs'
        AND (owner = auth.uid()
             OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND COALESCE(p.role,'') IN ('admin','staff')))
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='proofs insert owner only') THEN
    CREATE POLICY "proofs insert owner only"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'proofs' AND owner = auth.uid()
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='proofs update own or admin') THEN
    CREATE POLICY "proofs update own or admin"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'proofs'
        AND (owner = auth.uid()
             OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND COALESCE(p.role,'') IN ('admin','staff')))
      )
      WITH CHECK (
        bucket_id = 'proofs'
        AND (owner = auth.uid()
             OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND COALESCE(p.role,'') IN ('admin','staff')))
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='proofs delete own or admin') THEN
    CREATE POLICY "proofs delete own or admin"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'proofs'
        AND (owner = auth.uid()
             OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND COALESCE(p.role,'') IN ('admin','staff')))
      );
  END IF;
END$$;
