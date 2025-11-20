-- MASTER MIGRATION: Separate Education Tables from Marketplace
-- Run this entire script in Supabase SQL Editor
-- This will create dedicated tables for scholarships, universities, and events
-- and migrate all data from products_services

-- ============================================================================
-- STEP 1: CREATE SCHOLARSHIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.scholarships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Basic Information
  title text NOT NULL,
  name text,
  description text,
  image_url text,
  
  -- Organization
  source_organization text,
  
  -- Funding
  amount text,
  price text DEFAULT '0',
  funding_currency text DEFAULT 'USD',
  
  -- Deadlines
  deadline text,
  deadline_date text,
  deadline_text text,
  
  -- Eligibility
  eligibility text,
  eligibility_criteria text,
  requirements text,
  benefits text,
  
  -- Categorization (Arrays)
  scholarship_types text[],
  eligibility_levels text[],
  fields_of_study text[],
  
  -- Contact & Links
  website_url text,
  application_url text,
  contact_email text,
  
  -- Additional Info
  is_renewable boolean DEFAULT false,
  number_of_awards integer,
  
  -- Status
  is_approved boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  
  -- Metadata
  view_count integer DEFAULT 0
);

ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved scholarships" ON public.scholarships;
CREATE POLICY "Anyone can view approved scholarships"
  ON public.scholarships FOR SELECT TO authenticated
  USING (is_approved = true);

DROP POLICY IF EXISTS "Users can create scholarships" ON public.scholarships;
CREATE POLICY "Users can create scholarships"
  ON public.scholarships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own scholarships" ON public.scholarships;
CREATE POLICY "Users can update their own scholarships"
  ON public.scholarships FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own scholarships" ON public.scholarships;
CREATE POLICY "Users can delete their own scholarships"
  ON public.scholarships FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all scholarships" ON public.scholarships;
CREATE POLICY "Admins can manage all scholarships"
  ON public.scholarships FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE INDEX IF NOT EXISTS idx_scholarships_user_id ON public.scholarships(user_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_is_approved ON public.scholarships(is_approved);
CREATE INDEX IF NOT EXISTS idx_scholarships_is_featured ON public.scholarships(is_featured);
CREATE INDEX IF NOT EXISTS idx_scholarships_created_at ON public.scholarships(created_at);
CREATE INDEX IF NOT EXISTS idx_scholarships_deadline ON public.scholarships(deadline);
CREATE INDEX IF NOT EXISTS idx_scholarships_funding_currency ON public.scholarships(funding_currency);
CREATE INDEX IF NOT EXISTS idx_scholarships_scholarship_types ON public.scholarships USING GIN(scholarship_types);
CREATE INDEX IF NOT EXISTS idx_scholarships_eligibility_levels ON public.scholarships USING GIN(eligibility_levels);
CREATE INDEX IF NOT EXISTS idx_scholarships_fields_of_study ON public.scholarships USING GIN(fields_of_study);

-- Add missing columns if they don't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scholarships' AND column_name = 'is_approved') THEN
    ALTER TABLE public.scholarships ADD COLUMN is_approved boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scholarships' AND column_name = 'is_featured') THEN
    ALTER TABLE public.scholarships ADD COLUMN is_featured boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scholarships' AND column_name = 'view_count') THEN
    ALTER TABLE public.scholarships ADD COLUMN view_count integer DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: CREATE UNIVERSITIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Basic Information
  title text NOT NULL,
  name text,
  description text,
  image_url text,
  
  -- Location
  location text,
  country text,
  city text,
  address text,
  
  -- Contact & Links
  website_url text,
  contact_email text,
  phone text,
  
  -- Academic Information
  programs_offered text[],
  accreditation text,
  ranking integer,
  
  -- Admission
  admission_requirements text,
  application_deadline text,
  tuition_fees text,
  
  -- Additional Info
  established_year integer,
  student_population integer,
  campus_size text,
  
  -- Status
  is_approved boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  
  -- Metadata
  view_count integer DEFAULT 0
);

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved universities" ON public.universities;
CREATE POLICY "Anyone can view approved universities"
  ON public.universities FOR SELECT TO authenticated
  USING (is_approved = true);

DROP POLICY IF EXISTS "Users can create universities" ON public.universities;
CREATE POLICY "Users can create universities"
  ON public.universities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own universities" ON public.universities;
CREATE POLICY "Users can update their own universities"
  ON public.universities FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own universities" ON public.universities;
CREATE POLICY "Users can delete their own universities"
  ON public.universities FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all universities" ON public.universities;
CREATE POLICY "Admins can manage all universities"
  ON public.universities FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE INDEX IF NOT EXISTS idx_universities_user_id ON public.universities(user_id);
CREATE INDEX IF NOT EXISTS idx_universities_is_approved ON public.universities(is_approved);
CREATE INDEX IF NOT EXISTS idx_universities_is_featured ON public.universities(is_featured);
CREATE INDEX IF NOT EXISTS idx_universities_created_at ON public.universities(created_at);
CREATE INDEX IF NOT EXISTS idx_universities_location ON public.universities(location);
CREATE INDEX IF NOT EXISTS idx_universities_country ON public.universities(country);
CREATE INDEX IF NOT EXISTS idx_universities_programs_offered ON public.universities USING GIN(programs_offered);

-- Add missing columns if they don't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'universities' AND column_name = 'is_approved') THEN
    ALTER TABLE public.universities ADD COLUMN is_approved boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'universities' AND column_name = 'is_featured') THEN
    ALTER TABLE public.universities ADD COLUMN is_featured boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'universities' AND column_name = 'view_count') THEN
    ALTER TABLE public.universities ADD COLUMN view_count integer DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: CREATE EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Basic Information
  title text NOT NULL,
  name text,
  description text,
  image_url text,
  
  -- Event Details
  event_type text,
  category text,
  
  -- Date & Time
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  start_time text,
  end_time text,
  timezone text,
  
  -- Location
  location text,
  venue text,
  address text,
  city text,
  country text,
  is_virtual boolean DEFAULT false,
  meeting_link text,
  
  -- Registration
  registration_url text,
  registration_deadline timestamp with time zone,
  max_attendees integer,
  registration_fee text,
  currency text DEFAULT 'USD',
  is_free boolean DEFAULT false,
  
  -- Contact & Links
  website_url text,
  contact_email text,
  phone text,
  
  -- Organizer
  organizer_name text,
  organizer_organization text,
  
  -- Additional Info
  tags text[],
  target_audience text[],
  requirements text,
  agenda text,
  speakers text[],
  
  -- Status
  is_approved boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  status text DEFAULT 'upcoming',
  
  -- Metadata
  view_count integer DEFAULT 0,
  attendee_count integer DEFAULT 0
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Add missing columns if they don't exist (for existing tables)
DO $$
BEGIN
  -- Add basic columns (check both 'title' and 'event_title')
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'title') THEN
    ALTER TABLE public.events ADD COLUMN title text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'event_title') THEN
    ALTER TABLE public.events ADD COLUMN event_title text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'name') THEN
    ALTER TABLE public.events ADD COLUMN name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'description') THEN
    ALTER TABLE public.events ADD COLUMN description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'event_description') THEN
    ALTER TABLE public.events ADD COLUMN event_description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'image_url') THEN
    ALTER TABLE public.events ADD COLUMN image_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'event_image_url') THEN
    ALTER TABLE public.events ADD COLUMN event_image_url text;
  END IF;
  
  -- Add status/approval columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'is_approved') THEN
    ALTER TABLE public.events ADD COLUMN is_approved boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'is_featured') THEN
    ALTER TABLE public.events ADD COLUMN is_featured boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'view_count') THEN
    ALTER TABLE public.events ADD COLUMN view_count integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'attendee_count') THEN
    ALTER TABLE public.events ADD COLUMN attendee_count integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'status') THEN
    ALTER TABLE public.events ADD COLUMN status text DEFAULT 'upcoming';
  END IF;
  
  -- Add event detail columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'event_type') THEN
    ALTER TABLE public.events ADD COLUMN event_type text DEFAULT 'workshop';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'category') THEN
    ALTER TABLE public.events ADD COLUMN category text;
  END IF;
  
  -- Add date/time columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'event_date') THEN
    ALTER TABLE public.events ADD COLUMN event_date timestamp with time zone DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'event_time') THEN
    ALTER TABLE public.events ADD COLUMN event_time text DEFAULT '00:00';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'start_date') THEN
    ALTER TABLE public.events ADD COLUMN start_date timestamp with time zone;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'end_date') THEN
    ALTER TABLE public.events ADD COLUMN end_date timestamp with time zone;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'start_time') THEN
    ALTER TABLE public.events ADD COLUMN start_time text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'end_time') THEN
    ALTER TABLE public.events ADD COLUMN end_time text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'timezone') THEN
    ALTER TABLE public.events ADD COLUMN timezone text;
  END IF;
  
  -- Add location columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'location') THEN
    ALTER TABLE public.events ADD COLUMN location text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'venue') THEN
    ALTER TABLE public.events ADD COLUMN venue text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'venue_name') THEN
    ALTER TABLE public.events ADD COLUMN venue_name text DEFAULT 'TBD';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'venue_address') THEN
    ALTER TABLE public.events ADD COLUMN venue_address text DEFAULT 'TBD';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'address') THEN
    ALTER TABLE public.events ADD COLUMN address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'city') THEN
    ALTER TABLE public.events ADD COLUMN city text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'country') THEN
    ALTER TABLE public.events ADD COLUMN country text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'is_virtual') THEN
    ALTER TABLE public.events ADD COLUMN is_virtual boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'meeting_link') THEN
    ALTER TABLE public.events ADD COLUMN meeting_link text;
  END IF;
  
  -- Add registration columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'registration_url') THEN
    ALTER TABLE public.events ADD COLUMN registration_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'registration_deadline') THEN
    ALTER TABLE public.events ADD COLUMN registration_deadline timestamp with time zone;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'max_attendees') THEN
    ALTER TABLE public.events ADD COLUMN max_attendees integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'registration_fee') THEN
    ALTER TABLE public.events ADD COLUMN registration_fee text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'currency') THEN
    ALTER TABLE public.events ADD COLUMN currency text DEFAULT 'USD';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'is_free') THEN
    ALTER TABLE public.events ADD COLUMN is_free boolean DEFAULT false;
  END IF;
  
  -- Add contact columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'website_url') THEN
    ALTER TABLE public.events ADD COLUMN website_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'contact_email') THEN
    ALTER TABLE public.events ADD COLUMN contact_email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'phone') THEN
    ALTER TABLE public.events ADD COLUMN phone text;
  END IF;
  
  -- Add organizer columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'organizer_name') THEN
    ALTER TABLE public.events ADD COLUMN organizer_name text DEFAULT 'TBD';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'organizer_organization') THEN
    ALTER TABLE public.events ADD COLUMN organizer_organization text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'organizer_phone') THEN
    ALTER TABLE public.events ADD COLUMN organizer_phone text DEFAULT 'N/A';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'organizer_email') THEN
    ALTER TABLE public.events ADD COLUMN organizer_email text DEFAULT 'N/A';
  END IF;
  
  -- Add array columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'tags') THEN
    ALTER TABLE public.events ADD COLUMN tags text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'target_audience') THEN
    ALTER TABLE public.events ADD COLUMN target_audience text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'speakers') THEN
    ALTER TABLE public.events ADD COLUMN speakers text[];
  END IF;
  
  -- Add other columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'requirements') THEN
    ALTER TABLE public.events ADD COLUMN requirements text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'agenda') THEN
    ALTER TABLE public.events ADD COLUMN agenda text;
  END IF;
END $$;

DROP POLICY IF EXISTS "Anyone can view approved events" ON public.events;
CREATE POLICY "Anyone can view approved events"
  ON public.events FOR SELECT TO authenticated
  USING (is_approved = true);

DROP POLICY IF EXISTS "Users can create events" ON public.events;
CREATE POLICY "Users can create events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
CREATE POLICY "Users can update their own events"
  ON public.events FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;
CREATE POLICY "Users can delete their own events"
  ON public.events FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all events" ON public.events;
CREATE POLICY "Admins can manage all events"
  ON public.events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_is_approved ON public.events(is_approved);
CREATE INDEX IF NOT EXISTS idx_events_is_featured ON public.events(is_featured);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON public.events(end_date);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON public.events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_location ON public.events(location);
CREATE INDEX IF NOT EXISTS idx_events_tags ON public.events USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_events_target_audience ON public.events USING GIN(target_audience);

-- ============================================================================
-- STEP 4: MIGRATE DATA FROM PRODUCTS_SERVICES
-- ============================================================================

-- Temporarily disable event_type constraint if it exists
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;

-- Update any existing events with invalid event_type values
UPDATE public.events SET event_type = 'workshop' WHERE event_type NOT IN ('workshop', 'seminar', 'webinar', 'networking', 'fair', 'other') OR event_type IS NULL;

-- Migrate Scholarships (only migrating core fields that exist in products_services)
INSERT INTO public.scholarships (
  id, user_id, created_at, title, description, image_url
)
SELECT 
  id, 
  user_id, 
  created_at, 
  title,
  description,
  image_url
FROM public.products_services
WHERE category_name = 'Scholarships'
ON CONFLICT (id) DO NOTHING;

-- Update all migrated scholarships to be approved
UPDATE public.scholarships SET is_approved = true WHERE is_approved = false;

-- Migrate Universities (only migrating core fields that exist in products_services)
INSERT INTO public.universities (
  id, user_id, created_at, title, description, image_url
)
SELECT 
  id, 
  user_id, 
  created_at,
  title,
  description,
  image_url
FROM public.products_services
WHERE category_name = 'Universities'
ON CONFLICT (id) DO NOTHING;

-- Update all migrated universities to be approved
UPDATE public.universities SET is_approved = true WHERE is_approved = false;

-- Migrate Events (only migrating core fields that exist in products_services)
-- Insert into both old column names (event_title, event_description, event_image_url) and new ones (title, description, image_url)
INSERT INTO public.events (
  id, user_id, created_at, 
  title, event_title,
  description, event_description,
  image_url, event_image_url,
  event_type, event_date, event_time,
  venue_name, venue_address,
  organizer_name, organizer_phone, organizer_email
)
SELECT 
  id, 
  user_id, 
  created_at,
  title, title as event_title,
  description, description as event_description,
  image_url, image_url as event_image_url,
  'workshop' as event_type,
  created_at as event_date,
  '00:00' as event_time,
  'TBD' as venue_name,
  'TBD' as venue_address,
  'TBD' as organizer_name,
  'N/A' as organizer_phone,
  'N/A' as organizer_email
FROM public.products_services
WHERE category_name IN ('Events', 'Educational Events')
ON CONFLICT (id) DO NOTHING;

-- Update all migrated events to be approved
UPDATE public.events SET is_approved = true WHERE is_approved = false;

-- ============================================================================
-- STEP 5: VERIFY MIGRATION (Optional - Check counts)
-- ============================================================================

-- Check how many records were migrated
SELECT 
  'Scholarships' as table_name, 
  COUNT(*) as record_count 
FROM public.scholarships
UNION ALL
SELECT 
  'Universities' as table_name, 
  COUNT(*) as record_count 
FROM public.universities
UNION ALL
SELECT 
  'Events' as table_name, 
  COUNT(*) as record_count 
FROM public.events
UNION ALL
SELECT 
  'products_services (remaining)' as table_name, 
  COUNT(*) as record_count 
FROM public.products_services;

-- ============================================================================
-- STEP 6: CLEANUP (OPTIONAL - Run after verification)
-- ============================================================================
-- After verifying the migration was successful, uncomment these lines to
-- remove the migrated records from products_services:

-- DELETE FROM public.products_services WHERE category_name = 'Scholarships';
-- DELETE FROM public.products_services WHERE category_name = 'Universities';
-- DELETE FROM public.products_services WHERE category_name IN ('Events', 'Educational Events');

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================
-- The products_services table now contains ONLY marketplace products/services
-- Education features use dedicated tables:
--   - scholarships (for scholarships)
--   - universities (for universities)
--   - events (for educational events)
--   - alumni_mentors (already existed for mentors)
