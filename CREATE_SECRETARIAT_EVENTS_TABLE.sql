-- Create secretariat_events table
-- This table stores all events created through the OAA Secretariat section
-- Completely separate from the general products_services table

CREATE TABLE IF NOT EXISTS public.secretariat_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Event Information
  title TEXT NOT NULL,
  organizer TEXT,
  description TEXT,
  
  -- Event Details
  category TEXT NOT NULL, -- School Events, Alumni Board, Individual Events, Sports, Cultural
  date TEXT NOT NULL, -- Event date (YYYY-MM-DD)
  time TEXT, -- Event time (e.g., "10:00 AM - 3:00 PM GMT")
  location TEXT,
  location_url TEXT,
  
  -- Ticketing & Capacity
  is_free BOOLEAN DEFAULT true,
  ticket_price DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'GHS',
  capacity INTEGER,
  
  -- Contact Information
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  
  -- Additional Details (stored as JSON)
  packages JSONB, -- Array of package/perk descriptions
  agenda JSONB, -- Array of agenda items
  speakers JSONB, -- Array of {name, title} objects
  
  -- Media
  image_url TEXT, -- Primary image URL
  image_urls JSONB, -- Array of additional image URLs
  
  -- Engagement Metrics
  view_count INTEGER DEFAULT 0,
  interest_count INTEGER DEFAULT 0,
  registration_count INTEGER DEFAULT 0,
  
  -- Approval & Status
  is_approved BOOLEAN DEFAULT false,
  approval_date TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for better query performance
  CONSTRAINT valid_email CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_phone CHECK (length(contact_phone) >= 10)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_secretariat_events_user_id ON public.secretariat_events(user_id);
CREATE INDEX IF NOT EXISTS idx_secretariat_events_category ON public.secretariat_events(category);
CREATE INDEX IF NOT EXISTS idx_secretariat_events_date ON public.secretariat_events(date);
CREATE INDEX IF NOT EXISTS idx_secretariat_events_is_approved ON public.secretariat_events(is_approved);
CREATE INDEX IF NOT EXISTS idx_secretariat_events_created_at ON public.secretariat_events(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_secretariat_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_secretariat_events_updated_at
  BEFORE UPDATE ON public.secretariat_events
  FOR EACH ROW
  EXECUTE FUNCTION update_secretariat_events_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.secretariat_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Users can view approved events or their own events
CREATE POLICY "Users can view approved events or own events"
  ON public.secretariat_events
  FOR SELECT
  USING (
    is_approved = true 
    OR 
    auth.uid() = user_id
  );

-- Policy: Users can insert their own events
CREATE POLICY "Users can create events"
  ON public.secretariat_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own events
CREATE POLICY "Users can update own events"
  ON public.secretariat_events
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own events
CREATE POLICY "Users can delete own events"
  ON public.secretariat_events
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Admins can approve/manage all events (you'll need to create an admin role)
-- CREATE POLICY "Admins can manage all events"
--   ON public.secretariat_events
--   FOR ALL
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.profiles
--       WHERE id = auth.uid() AND role = 'admin'
--     )
--   );

-- Create event_bookmarks table for saved events
CREATE TABLE IF NOT EXISTS public.event_bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.secretariat_events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure user can only bookmark an event once
  UNIQUE(user_id, event_id)
);

-- Index for bookmarks
CREATE INDEX IF NOT EXISTS idx_event_bookmarks_user_id ON public.event_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_event_bookmarks_event_id ON public.event_bookmarks(event_id);

-- Enable RLS for bookmarks
ALTER TABLE public.event_bookmarks ENABLE ROW LEVEL SECURITY;

-- Bookmark policies
CREATE POLICY "Users can view own bookmarks"
  ON public.event_bookmarks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookmarks"
  ON public.event_bookmarks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON public.event_bookmarks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create event_registrations table
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.secretariat_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Registration Details
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  ticket_quantity INTEGER DEFAULT 1,
  additional_notes TEXT,
  
  -- Registration Status
  status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled
  confirmation_code TEXT UNIQUE,
  
  -- Timestamps
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_reg_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_ticket_quantity CHECK (ticket_quantity > 0)
);

-- Indexes for registrations
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON public.event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_email ON public.event_registrations(email);

-- Enable RLS for registrations
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Registration policies
CREATE POLICY "Users can view own registrations"
  ON public.event_registrations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Event creators can view their event registrations"
  ON public.event_registrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.secretariat_events
      WHERE id = event_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can register for events"
  ON public.event_registrations
  FOR INSERT
  WITH CHECK (true);

-- Create event_interests table (for "Mark as Interested")
CREATE TABLE IF NOT EXISTS public.event_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.secretariat_events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, event_id)
);

-- Index for interests
CREATE INDEX IF NOT EXISTS idx_event_interests_user_id ON public.event_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_event_interests_event_id ON public.event_interests(event_id);

-- Enable RLS for interests
ALTER TABLE public.event_interests ENABLE ROW LEVEL SECURITY;

-- Interest policies
CREATE POLICY "Users can view own interests"
  ON public.event_interests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own interests"
  ON public.event_interests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own interests"
  ON public.event_interests
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_event_view_count(event_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.secretariat_events
  SET view_count = view_count + 1
  WHERE id = event_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get event statistics
CREATE OR REPLACE FUNCTION get_event_stats(event_uuid UUID)
RETURNS TABLE(
  total_views INTEGER,
  total_interests INTEGER,
  total_registrations INTEGER,
  total_bookmarks INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(e.view_count, 0) as total_views,
    COALESCE(e.interest_count, 0) as total_interests,
    COALESCE(COUNT(DISTINCT r.id), 0)::INTEGER as total_registrations,
    COALESCE(COUNT(DISTINCT b.id), 0)::INTEGER as total_bookmarks
  FROM public.secretariat_events e
  LEFT JOIN public.event_registrations r ON r.event_id = e.id
  LEFT JOIN public.event_bookmarks b ON b.event_id = e.id
  WHERE e.id = event_uuid
  GROUP BY e.id, e.view_count, e.interest_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions (adjust based on your setup)
-- GRANT ALL ON public.secretariat_events TO authenticated;
-- GRANT ALL ON public.event_bookmarks TO authenticated;
-- GRANT ALL ON public.event_registrations TO authenticated;
-- GRANT ALL ON public.event_interests TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.secretariat_events IS 'Stores all events created through the OAA Secretariat section';
COMMENT ON TABLE public.event_bookmarks IS 'Stores user bookmarks/saved events';
COMMENT ON TABLE public.event_registrations IS 'Stores event registrations';
COMMENT ON TABLE public.event_interests IS 'Stores user interests (Mark as Interested)';
COMMENT ON COLUMN public.secretariat_events.view_count IS 'Number of times event has been viewed';
COMMENT ON COLUMN public.secretariat_events.is_approved IS 'Whether event has been approved by admin';
