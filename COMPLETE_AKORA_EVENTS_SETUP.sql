-- ====================================================================================
-- AKORA EVENTS COMPLETE SETUP SCRIPT
-- Run this in your Supabase SQL Editor to set up everything in the correct order
-- ====================================================================================

-- Step 1: Create base akora_events table
-- (If you already ran CREATE_AKORA_EVENTS_TABLE.sql, skip to Step 2)
-- ====================================================================================

CREATE TABLE IF NOT EXISTS public.akora_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('oaa','akora')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  banner_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','published')),
  listing_fee NUMERIC(10,2) DEFAULT 0.00,
  payment_proof_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_akora_events_type_status ON public.akora_events(event_type, status);
CREATE INDEX IF NOT EXISTS idx_akora_events_start_time ON public.akora_events(start_time);
CREATE INDEX IF NOT EXISTS idx_akora_events_created_by ON public.akora_events(created_by);

-- Function: Set defaults based on event type
CREATE OR REPLACE FUNCTION public.akora_events_set_defaults()
RETURNS trigger AS $$
BEGIN
  IF NEW.event_type = 'oaa' THEN
    NEW.status := COALESCE(NEW.status, 'published');
    NEW.listing_fee := 0;
    NEW.is_paid_listing := FALSE;
  ELSE
    NEW.status := COALESCE(NEW.status, 'pending');
    NEW.is_paid_listing := COALESCE(NEW.is_paid_listing, TRUE);
    NEW.listing_fee := COALESCE(NEW.listing_fee, 50.00);
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Apply defaults
DROP TRIGGER IF EXISTS akora_events_set_defaults_trigger ON public.akora_events;
CREATE TRIGGER akora_events_set_defaults_trigger
BEFORE INSERT ON public.akora_events
FOR EACH ROW
EXECUTE FUNCTION public.akora_events_set_defaults();

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.akora_events_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Touch updated_at on update
DROP TRIGGER IF EXISTS akora_events_touch_updated_at_trigger ON public.akora_events;
CREATE TRIGGER akora_events_touch_updated_at_trigger
BEFORE UPDATE ON public.akora_events
FOR EACH ROW
EXECUTE FUNCTION public.akora_events_touch_updated_at();

-- RLS Policies
ALTER TABLE public.akora_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS sel_published ON public.akora_events;
DROP POLICY IF EXISTS ins_akora_by_user ON public.akora_events;
DROP POLICY IF EXISTS ins_oaa_by_admin ON public.akora_events;
DROP POLICY IF EXISTS upd_own_pending ON public.akora_events;
DROP POLICY IF EXISTS upd_admin_any ON public.akora_events;
DROP POLICY IF EXISTS del_own_pending ON public.akora_events;
DROP POLICY IF EXISTS del_admin_any ON public.akora_events;

-- 1) SELECT: Anyone can view published events; owners can view their own; admins view all
CREATE POLICY sel_published ON public.akora_events
FOR SELECT USING (
  status = 'published'
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (coalesce(p.is_admin,false) = true OR p.role IN ('admin','staff'))
  )
);

-- 2) INSERT: Akora events by authenticated users; OAA events by admins only
CREATE POLICY ins_akora_by_user ON public.akora_events
FOR INSERT WITH CHECK (
  event_type = 'akora' AND auth.uid() = created_by
);

CREATE POLICY ins_oaa_by_admin ON public.akora_events
FOR INSERT WITH CHECK (
  event_type = 'oaa' AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (coalesce(p.is_admin,false) = true OR p.role IN ('admin','staff'))
  )
);

-- 3) UPDATE: Owners can edit pending/rejected events; admins can update any
CREATE POLICY upd_own_pending ON public.akora_events
FOR UPDATE USING (
  created_by = auth.uid() AND status IN ('pending','rejected')
) WITH CHECK (
  created_by = auth.uid() AND status IN ('pending','rejected')
);

CREATE POLICY upd_admin_any ON public.akora_events
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (coalesce(p.is_admin,false) = true OR p.role IN ('admin','staff'))
  )
);

-- 4) DELETE: Owners can delete pending/rejected events; admins can delete any
CREATE POLICY del_own_pending ON public.akora_events
FOR DELETE USING (
  created_by = auth.uid() AND status IN ('pending','rejected')
);

CREATE POLICY del_admin_any ON public.akora_events
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (coalesce(p.is_admin,false) = true OR p.role IN ('admin','staff'))
  )
);

-- ====================================================================================
-- Step 2: Add extended fields
-- ====================================================================================

ALTER TABLE public.akora_events
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS capacity INTEGER,
  ADD COLUMN IF NOT EXISTS organizer_name TEXT,
  ADD COLUMN IF NOT EXISTS organizer_email TEXT,
  ADD COLUMN IF NOT EXISTS organizer_phone TEXT,
  ADD COLUMN IF NOT EXISTS registration_url TEXT,
  ADD COLUMN IF NOT EXISTS visibility TEXT CHECK (visibility IN ('public','alumni_only')) DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS moderation_notes TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS listing_fee_currency TEXT DEFAULT 'GHS',
  ADD COLUMN IF NOT EXISTS is_paid_listing BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ticket_provider TEXT,
  ADD COLUMN IF NOT EXISTS checkin_method TEXT CHECK (checkin_method IN ('qr','manual','none')) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS refund_policy_url TEXT,
  ADD COLUMN IF NOT EXISTS terms_url TEXT,
  ADD COLUMN IF NOT EXISTS accessibility_notes TEXT,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS gallery_urls TEXT[];

-- ====================================================================================
-- Step 3: Add package_tier column for tier persistence
-- ====================================================================================

ALTER TABLE public.akora_events
  ADD COLUMN IF NOT EXISTS package_tier TEXT CHECK (package_tier IN ('basic', 'standard', 'priority', 'premium')) DEFAULT 'standard';

-- Create index for faster tier-based queries
CREATE INDEX IF NOT EXISTS idx_akora_events_package_tier ON public.akora_events(package_tier);

-- Update existing records to set tier based on listing_fee
UPDATE public.akora_events
SET package_tier = CASE
  WHEN listing_fee >= 300 THEN 'premium'
  WHEN listing_fee >= 150 THEN 'priority'
  WHEN listing_fee >= 50 THEN 'standard'
  ELSE 'basic'
END
WHERE package_tier IS NULL;

-- ====================================================================================
-- Step 4: Create storage buckets (DO THIS IN SUPABASE DASHBOARD > Storage)
-- ====================================================================================

-- 1. Create "proofs" bucket (PRIVATE):
--    - Name: proofs
--    - Public: OFF
--    - File size limit: 10MB
--    - Allowed MIME types: image/*, application/pdf
--    - RLS Policy: Allow authenticated users to upload

-- 2. Create "chat-media" bucket (PUBLIC):
--    - Name: chat-media
--    - Public: ON
--    - File size limit: 25MB
--    - Allowed MIME types: image/*, video/*
--    - RLS Policy: Allow authenticated users to upload

-- ====================================================================================
-- SETUP COMPLETE! ✅
-- ====================================================================================

-- Verify setup:
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'akora_events'
ORDER BY ordinal_position;

-- Check policies:
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'akora_events';

-- Test query:
SELECT id, title, status, package_tier, listing_fee, created_at
FROM public.akora_events
LIMIT 5;
