-- Create event_rsvps table for tracking RSVPs
CREATE TABLE IF NOT EXISTS event_rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('attending', 'maybe', 'not_attending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id ON event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_status ON event_rsvps(status);

-- Enable RLS
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view RSVPs
CREATE POLICY "Anyone can view RSVPs"
  ON event_rsvps
  FOR SELECT
  USING (true);

-- Users can insert their own RSVPs
CREATE POLICY "Users can insert their own RSVPs"
  ON event_rsvps
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own RSVPs
CREATE POLICY "Users can update their own RSVPs"
  ON event_rsvps
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own RSVPs
CREATE POLICY "Users can delete their own RSVPs"
  ON event_rsvps
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_rsvps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_event_rsvps_updated_at ON event_rsvps;
CREATE TRIGGER update_event_rsvps_updated_at
  BEFORE UPDATE ON event_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION update_event_rsvps_updated_at();

-- Optional: Create a function to increment event view count
CREATE OR REPLACE FUNCTION increment_event_views(event_id TEXT)
RETURNS void AS $$
BEGIN
  -- For akora_events table
  UPDATE akora_events
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = event_id;
  
  -- For products_services table (fallback)
  IF NOT FOUND THEN
    UPDATE products_services
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = event_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add view_count column to akora_events if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'akora_events' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE akora_events ADD COLUMN view_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add rsvp_count column to akora_events if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'akora_events' AND column_name = 'rsvp_count'
  ) THEN
    ALTER TABLE akora_events ADD COLUMN rsvp_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create a function to get RSVP counts for events
CREATE OR REPLACE FUNCTION get_event_rsvp_count(p_event_id TEXT, p_status TEXT DEFAULT 'attending')
RETURNS INTEGER AS $$
DECLARE
  rsvp_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO rsvp_count
  FROM event_rsvps
  WHERE event_id = p_event_id
    AND status = p_status;
  
  RETURN COALESCE(rsvp_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function to automatically update rsvp_count in akora_events
CREATE OR REPLACE FUNCTION update_event_rsvp_count()
RETURNS TRIGGER AS $$
DECLARE
  v_event_id TEXT;
BEGIN
  -- Get the event_id from the inserted/updated/deleted row
  IF TG_OP = 'DELETE' THEN
    v_event_id := OLD.event_id;
  ELSE
    v_event_id := NEW.event_id;
  END IF;
  
  -- Update the rsvp_count in akora_events table
  UPDATE akora_events
  SET rsvp_count = (
    SELECT COUNT(*)
    FROM event_rsvps
    WHERE event_rsvps.event_id = v_event_id
    AND status = 'attending'
  )
  WHERE id = v_event_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update RSVP count on INSERT/UPDATE/DELETE
DROP TRIGGER IF EXISTS update_rsvp_count_trigger ON event_rsvps;
CREATE TRIGGER update_rsvp_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON event_rsvps
FOR EACH ROW
EXECUTE FUNCTION update_event_rsvp_count();

-- Grant permissions
GRANT EXECUTE ON FUNCTION increment_event_views TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_rsvp_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_rsvp_count TO anon;
GRANT EXECUTE ON FUNCTION update_event_rsvp_count TO authenticated;
