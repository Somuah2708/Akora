-- Create dedicated events table
-- This separates events from the general products_services marketplace

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Basic Information
  title text NOT NULL,
  name text, -- For backward compatibility
  description text NOT NULL,
  image_url text,
  
  -- Event Details
  event_type text, -- Conference, Workshop, Webinar, Networking, Career Fair, etc.
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
  status text DEFAULT 'upcoming', -- upcoming, ongoing, completed, cancelled
  
  -- Metadata
  view_count integer DEFAULT 0,
  attendee_count integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view approved events"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (is_approved = true);

CREATE POLICY "Users can create events"
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
  ON public.events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all events"
  ON public.events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create indexes
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

-- Add comments
COMMENT ON TABLE public.events IS 'Dedicated table for educational and career events';
COMMENT ON COLUMN public.events.event_type IS 'Type of event (Conference, Workshop, Webinar, etc.)';
COMMENT ON COLUMN public.events.tags IS 'Array of tags for categorization';
COMMENT ON COLUMN public.events.target_audience IS 'Array of target audience types';

-- Migrate existing events from products_services to events table
INSERT INTO public.events (
  id, user_id, created_at, title, name, description, image_url,
  event_type, category,
  start_date, end_date, start_time, end_time,
  location, venue, address, city, country, is_virtual, meeting_link,
  registration_url, registration_deadline, max_attendees, registration_fee, currency, is_free,
  website_url, contact_email, phone,
  organizer_name, organizer_organization,
  tags, target_audience, requirements, agenda, speakers,
  is_approved, is_featured, status, view_count, attendee_count
)
SELECT 
  id, user_id, created_at,
  COALESCE(title, name, 'Untitled Event') as title,
  name,
  description,
  image_url,
  event_type,
  category,
  start_date,
  end_date,
  start_time,
  end_time,
  location,
  venue,
  address,
  city,
  country,
  COALESCE(is_virtual, false),
  meeting_link,
  registration_url,
  registration_deadline,
  max_attendees,
  registration_fee,
  COALESCE(currency, 'USD'),
  COALESCE(is_free, false),
  website_url,
  contact_email,
  phone,
  organizer_name,
  organizer_organization,
  tags,
  target_audience,
  requirements,
  agenda,
  speakers,
  COALESCE(is_approved, false),
  COALESCE(is_featured, false),
  COALESCE(status, 'upcoming'),
  COALESCE(view_count, 0),
  COALESCE(attendee_count, 0)
FROM public.products_services
WHERE category_name = 'Events'
ON CONFLICT (id) DO NOTHING;

-- Optional: Remove events from products_services after migration
-- Uncomment the line below if you want to clean up the old table
-- DELETE FROM public.products_services WHERE category_name = 'Events';
