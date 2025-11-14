-- ALTER_ACADEMIC_REQUESTS.sql
-- Idempotent migration adding identity, kind, pricing, and recommendation evidence fields.
-- Run in Supabase SQL editor.

-- 1) transcript_requests: request_kind + identity + pricing

-- First, drop ALL NOT NULL constraints on transcript_requests except essential ones (id, user_id, status, created_at)
DO $$
DECLARE
  col record;
BEGIN
  FOR col IN 
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'transcript_requests' 
      AND is_nullable = 'NO'
      AND column_name NOT IN ('id', 'user_id', 'status', 'created_at', 'updated_at')
  LOOP
    EXECUTE format('ALTER TABLE transcript_requests ALTER COLUMN %I DROP NOT NULL', col.column_name);
  END LOOP;
END$$;

-- Drop and recreate the status CHECK constraint with updated values
ALTER TABLE transcript_requests DROP CONSTRAINT IF EXISTS transcript_requests_status_check;
ALTER TABLE transcript_requests ADD CONSTRAINT transcript_requests_status_check 
  CHECK (status IN ('pending', 'payment_provided', 'processing', 'ready', 'delivered', 'rejected'));

-- Add new columns
ALTER TABLE transcript_requests
  ADD COLUMN IF NOT EXISTS request_kind TEXT CHECK (request_kind IN ('transcript','wassce')),
  ADD COLUMN IF NOT EXISTS request_type TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS class_name TEXT,
  ADD COLUMN IF NOT EXISTS graduation_year INT,
  ADD COLUMN IF NOT EXISTS index_number TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS purpose TEXT,
  ADD COLUMN IF NOT EXISTS recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS price_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS price_currency TEXT DEFAULT 'GHS';

-- Backfill request_kind for existing rows
UPDATE transcript_requests SET request_kind = 'transcript' WHERE request_kind IS NULL;

-- Backfill pricing (adjust amounts to real fees)
-- Conditional pricing backfill: handle cases where legacy column request_type may not exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transcript_requests' AND column_name = 'request_type'
  ) THEN
    -- request_type present: differentiate official vs others
    UPDATE transcript_requests SET price_amount =
      COALESCE(price_amount, CASE
        WHEN request_kind = 'wassce' THEN 40
        WHEN request_type = 'official' THEN 50
        ELSE 0
      END), price_currency = COALESCE(price_currency,'GHS');
  ELSE
    -- request_type absent: fall back to request_kind only
    UPDATE transcript_requests SET price_amount =
      COALESCE(price_amount, CASE
        WHEN request_kind = 'wassce' THEN 40
        ELSE 0
      END), price_currency = COALESCE(price_currency,'GHS');
  END IF;
END$$;

-- 2) recommendation_requests: identity + teachers + activities + evidence + pricing
ALTER TABLE recommendation_requests
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS class_name TEXT,
  ADD COLUMN IF NOT EXISTS graduation_year INT,
  ADD COLUMN IF NOT EXISTS index_number TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS teachers TEXT[],
  ADD COLUMN IF NOT EXISTS activities TEXT,
  ADD COLUMN IF NOT EXISTS activity_docs TEXT[],
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS price_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS price_currency TEXT DEFAULT 'GHS';

-- Backfill recommendation pricing (assumed free for now)
UPDATE recommendation_requests SET price_amount = COALESCE(price_amount, 0), price_currency = COALESCE(price_currency,'GHS');

-- 3) Basic constraints / sanity (optional - leave out if causing errors on old rows)
-- You may optionally create CHECK constraints if your data is clean enough:
-- ALTER TABLE transcript_requests ADD CONSTRAINT transcript_graduation_year_check CHECK (graduation_year IS NULL OR graduation_year BETWEEN 1990 AND EXTRACT(YEAR FROM NOW())+1);
-- ALTER TABLE recommendation_requests ADD CONSTRAINT recommendation_graduation_year_check CHECK (graduation_year IS NULL OR graduation_year BETWEEN 1990 AND EXTRACT(YEAR FROM NOW())+1);

-- End of migration
