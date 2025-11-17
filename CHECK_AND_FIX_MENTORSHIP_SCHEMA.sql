-- =====================================================
-- CHECK_AND_FIX_MENTORSHIP_SCHEMA.sql
-- Idempotent schema setup for Alumni Mentorship feature
-- Run in Supabase SQL Editor (safe to run multiple times)
-- =====================================================

-- 0) Helper: ensure extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Create tables if missing (minimal definition first)
CREATE TABLE IF NOT EXISTS public.alumni_mentors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mentor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mentor_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) Add/align columns for alumni_mentors
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='full_name') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN full_name text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='email') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN email text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='phone') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='profile_photo_url') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN profile_photo_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='current_title') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN current_title text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='company') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN company text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='industry') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN industry text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='years_of_experience') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN years_of_experience integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='graduation_year') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN graduation_year integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='degree') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN degree text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='expertise_areas') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN expertise_areas text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='available_hours') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN available_hours text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='meeting_formats') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN meeting_formats text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='preferred_days') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN preferred_days text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='linkedin_url') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN linkedin_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='twitter_url') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN twitter_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='website_url') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN website_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='short_bio') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN short_bio text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='detailed_bio') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN detailed_bio text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='mentorship_philosophy') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN mentorship_philosophy text;
  END IF;
  -- status with check
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='status') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN status text DEFAULT 'pending';
  END IF;
  BEGIN
    ALTER TABLE public.alumni_mentors ADD CONSTRAINT alumni_mentors_status_chk CHECK (status IN ('pending','approved','rejected','inactive'));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  -- application_type with check
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='application_type') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN application_type text DEFAULT 'admin_added';
  END IF;
  BEGIN
    ALTER TABLE public.alumni_mentors ADD CONSTRAINT alumni_mentors_application_type_chk CHECK (application_type IN ('admin_added','self_applied'));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  -- admin fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='admin_notes') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN admin_notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='approved_by') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN approved_by uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='approved_at') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN approved_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni_mentors' AND column_name='created_by') THEN
    ALTER TABLE public.alumni_mentors ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
END$$;

-- 3) Add/align columns for mentor_applications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='user_id') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='full_name') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN full_name text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='email') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN email text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='phone') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='current_title') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN current_title text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='company') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN company text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='industry') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN industry text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='years_of_experience') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN years_of_experience integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='graduation_year') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN graduation_year integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='degree') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN degree text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='expertise_areas') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN expertise_areas text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='available_hours') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN available_hours text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='meeting_formats') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN meeting_formats text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='preferred_days') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN preferred_days text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='linkedin_url') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN linkedin_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='why_mentor') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN why_mentor text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='what_offer') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN what_offer text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='status') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN status text DEFAULT 'pending';
  END IF;
  BEGIN
    ALTER TABLE public.mentor_applications ADD CONSTRAINT mentor_applications_status_chk CHECK (status IN ('pending','approved','rejected'));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='admin_notes') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN admin_notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='reviewed_by') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN reviewed_by uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_applications' AND column_name='reviewed_at') THEN
    ALTER TABLE public.mentor_applications ADD COLUMN reviewed_at timestamptz;
  END IF;
END$$;

-- 4) Add/align columns for mentor_requests
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_requests' AND column_name='mentor_id') THEN
    ALTER TABLE public.mentor_requests ADD COLUMN mentor_id uuid REFERENCES public.alumni_mentors(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_requests' AND column_name='mentee_id') THEN
    ALTER TABLE public.mentor_requests ADD COLUMN mentee_id uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_requests' AND column_name='mentee_name') THEN
    ALTER TABLE public.mentor_requests ADD COLUMN mentee_name text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_requests' AND column_name='mentee_email') THEN
    ALTER TABLE public.mentor_requests ADD COLUMN mentee_email text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_requests' AND column_name='mentee_phone') THEN
    ALTER TABLE public.mentor_requests ADD COLUMN mentee_phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_requests' AND column_name='current_status') THEN
    ALTER TABLE public.mentor_requests ADD COLUMN current_status text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_requests' AND column_name='areas_of_interest') THEN
    ALTER TABLE public.mentor_requests ADD COLUMN areas_of_interest text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_requests' AND column_name='message') THEN
    ALTER TABLE public.mentor_requests ADD COLUMN message text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_requests' AND column_name='status') THEN
    ALTER TABLE public.mentor_requests ADD COLUMN status text DEFAULT 'pending';
  END IF;
  BEGIN
    ALTER TABLE public.mentor_requests ADD CONSTRAINT mentor_requests_status_chk CHECK (status IN ('pending','accepted','declined','completed'));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentor_requests' AND column_name='mentor_response') THEN
    ALTER TABLE public.mentor_requests ADD COLUMN mentor_response text;
  END IF;
END$$;

-- 5) Updated-at triggers for all tables
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_alumni_mentors
  BEFORE UPDATE ON public.alumni_mentors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_mentor_applications
  BEFORE UPDATE ON public.mentor_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_mentor_requests
  BEFORE UPDATE ON public.mentor_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_alumni_mentors_status ON public.alumni_mentors(status);
CREATE INDEX IF NOT EXISTS idx_alumni_mentors_email_lower ON public.alumni_mentors((lower(email)));
CREATE INDEX IF NOT EXISTS idx_mentor_applications_status ON public.mentor_applications(status);
CREATE INDEX IF NOT EXISTS idx_mentor_applications_user_id ON public.mentor_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_mentor_id ON public.mentor_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_mentee_id ON public.mentor_requests(mentee_id);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_status ON public.mentor_requests(status);

-- 7) Verify education_bookmarks exists (no changes, just a check)
DO $$
DECLARE exists_bookmarks boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='education_bookmarks'
  ) INTO exists_bookmarks;
  IF NOT exists_bookmarks THEN
    RAISE NOTICE 'ℹ️ education_bookmarks table not found (ok if using service_bookmarks instead)';
  ELSE
    RAISE NOTICE '✅ education_bookmarks table exists';
  END IF;
END $$;

-- 8) Summary notices
DO $$
DECLARE c1 int; c2 int; c3 int;
BEGIN
  SELECT COUNT(*) INTO c1 FROM information_schema.columns WHERE table_name='alumni_mentors';
  SELECT COUNT(*) INTO c2 FROM information_schema.columns WHERE table_name='mentor_applications';
  SELECT COUNT(*) INTO c3 FROM information_schema.columns WHERE table_name='mentor_requests';
  RAISE NOTICE '✅ Schema check complete. Columns -> alumni_mentors: %, mentor_applications: %, mentor_requests: %', c1, c2, c3;
END $$;

-- End of file
