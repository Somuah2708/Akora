-- MVP Transcript & Recommendation System (Idempotent)
-- Creates tables + indexes + RLS for transcript and recommendation flows
-- Run in Supabase SQL editor

-- 1) Transcript Requests
CREATE TABLE IF NOT EXISTS transcript_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('official','unofficial')),
  purpose TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','payment_provided','processing','ready','delivered','rejected')),
  payment_provider TEXT,
  payment_reference TEXT,
  payment_proof_url TEXT,
  admin_notes TEXT,
  document_url TEXT,
  verification_code TEXT UNIQUE DEFAULT substring(md5(random()::text) from 1 for 8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Recommendation Requests
CREATE TABLE IF NOT EXISTS recommendation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recommender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recommender_email TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('job','scholarship','graduate_school','other')),
  organization_name TEXT,
  deadline DATE,
  context TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','in_progress','submitted')),
  verification_code TEXT UNIQUE DEFAULT substring(md5(random()::text) from 1 for 8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Recommendation Letters (content store)
CREATE TABLE IF NOT EXISTS recommendation_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES recommendation_requests(id) ON DELETE CASCADE,
  recommender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  signature_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tr_req_user ON transcript_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_tr_req_status ON transcript_requests(status);
CREATE INDEX IF NOT EXISTS idx_rec_req_requester ON recommendation_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_rec_req_recommender ON recommendation_requests(recommender_id);
CREATE INDEX IF NOT EXISTS idx_rec_req_status ON recommendation_requests(status);

-- Enable RLS
ALTER TABLE transcript_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_letters ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Transcript policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users view own transcripts') THEN
    CREATE POLICY "Users view own transcripts" ON transcript_requests FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users insert own transcripts') THEN
    CREATE POLICY "Users insert own transcripts" ON transcript_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users update own transcripts') THEN
    CREATE POLICY "Users update own transcripts" ON transcript_requests FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  -- Recommendation policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Requesters view own recommendations') THEN
    CREATE POLICY "Requesters view own recommendations" ON recommendation_requests FOR SELECT USING (auth.uid() = requester_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Recommenders view requests') THEN
    CREATE POLICY "Recommenders view requests" ON recommendation_requests FOR SELECT USING (auth.uid() = recommender_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Recommenders view by email') THEN
    CREATE POLICY "Recommenders view by email" ON recommendation_requests FOR SELECT USING (
      recommender_id IS NULL AND recommender_email = (auth.jwt() ->> 'email')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Requesters insert recommendations') THEN
    CREATE POLICY "Requesters insert recommendations" ON recommendation_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Recommenders update recommendations') THEN
    CREATE POLICY "Recommenders update recommendations" ON recommendation_requests FOR UPDATE USING (auth.uid() = recommender_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Recommenders claim by email') THEN
    CREATE POLICY "Recommenders claim by email" ON recommendation_requests FOR UPDATE USING (
      recommender_id IS NULL AND recommender_email = (auth.jwt() ->> 'email')
    ) WITH CHECK (
      recommender_id IS NULL OR auth.uid() = recommender_id
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Recommenders create letters') THEN
    CREATE POLICY "Recommenders create letters" ON recommendation_letters FOR INSERT WITH CHECK (auth.uid() = recommender_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Requesters view letters') THEN
    CREATE POLICY "Requesters view letters" ON recommendation_letters FOR SELECT USING (
      EXISTS (SELECT 1 FROM recommendation_requests r WHERE r.id = recommendation_letters.request_id AND r.requester_id = auth.uid())
    );
  END IF;
END$$;

-- NOTE: Add an admin bypass policy later if needed (e.g., based on profile.role)
DO $$
BEGIN
  -- Admin bypass policies (assumes profiles.role in ('admin','staff'))
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage transcripts') THEN
    CREATE POLICY "Admins manage transcripts" ON transcript_requests
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND COALESCE(p.role, '') IN ('admin','staff')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND COALESCE(p.role, '') IN ('admin','staff')
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage recommendations') THEN
    CREATE POLICY "Admins manage recommendations" ON recommendation_requests
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND COALESCE(p.role, '') IN ('admin','staff')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND COALESCE(p.role, '') IN ('admin','staff')
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins view letters') THEN
    CREATE POLICY "Admins view letters" ON recommendation_letters
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND COALESCE(p.role, '') IN ('admin','staff')
      )
    );
  END IF;
END$$;
