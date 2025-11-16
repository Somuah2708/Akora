-- Extend akora_events with extra fields typically needed for listings/ads

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

-- Update default behavior function to also set paid flags depending on type
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