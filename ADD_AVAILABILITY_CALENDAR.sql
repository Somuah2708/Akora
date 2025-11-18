-- Migration: Add Mentor Availability Calendar
-- Description: Create tables and functions for mentor availability scheduling
-- Created: 2025-11-17

-- Create availability_slots table
CREATE TABLE IF NOT EXISTS mentor_availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID NOT NULL REFERENCES alumni_mentors(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_recurring BOOLEAN DEFAULT true,
  specific_date DATE, -- For one-time availability overrides
  is_available BOOLEAN DEFAULT true, -- Can be toggled to mark unavailable
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Create bookings table for scheduled sessions
CREATE TABLE IF NOT EXISTS mentor_session_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES mentor_requests(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES alumni_mentors(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  meeting_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_booking_time CHECK (end_time > start_time)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_availability_mentor_day ON mentor_availability_slots(mentor_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_availability_date ON mentor_availability_slots(specific_date) WHERE specific_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_mentor_date ON mentor_session_bookings(mentor_id, session_date);
CREATE INDEX IF NOT EXISTS idx_bookings_mentee ON mentor_session_bookings(mentee_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON mentor_session_bookings(status);

-- Enable RLS
ALTER TABLE mentor_availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_session_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for availability_slots
-- Mentors can manage their own availability
CREATE POLICY "Mentors can view own availability"
  ON mentor_availability_slots FOR SELECT
  USING (
    mentor_id IN (SELECT id FROM alumni_mentors WHERE user_id = auth.uid())
  );

CREATE POLICY "Mentors can insert own availability"
  ON mentor_availability_slots FOR INSERT
  WITH CHECK (
    mentor_id IN (SELECT id FROM alumni_mentors WHERE user_id = auth.uid())
  );

CREATE POLICY "Mentors can update own availability"
  ON mentor_availability_slots FOR UPDATE
  USING (
    mentor_id IN (SELECT id FROM alumni_mentors WHERE user_id = auth.uid())
  );

CREATE POLICY "Mentors can delete own availability"
  ON mentor_availability_slots FOR DELETE
  USING (
    mentor_id IN (SELECT id FROM alumni_mentors WHERE user_id = auth.uid())
  );

-- Everyone can view mentor availability (for booking purposes)
CREATE POLICY "Public can view mentor availability"
  ON mentor_availability_slots FOR SELECT
  USING (is_available = true);

-- RLS Policies for session_bookings
-- Mentors can view their bookings
CREATE POLICY "Mentors can view own bookings"
  ON mentor_session_bookings FOR SELECT
  USING (
    mentor_id IN (SELECT id FROM alumni_mentors WHERE user_id = auth.uid())
  );

-- Mentees can view their bookings
CREATE POLICY "Mentees can view own bookings"
  ON mentor_session_bookings FOR SELECT
  USING (mentee_id = auth.uid());

-- Mentees can create bookings
CREATE POLICY "Mentees can create bookings"
  ON mentor_session_bookings FOR INSERT
  WITH CHECK (mentee_id = auth.uid());

-- Both mentors and mentees can update bookings
CREATE POLICY "Mentors can update bookings"
  ON mentor_session_bookings FOR UPDATE
  USING (
    mentor_id IN (SELECT id FROM alumni_mentors WHERE user_id = auth.uid())
  );

CREATE POLICY "Mentees can update bookings"
  ON mentor_session_bookings FOR UPDATE
  USING (mentee_id = auth.uid());

-- Function to get mentor's available slots for a specific week
CREATE OR REPLACE FUNCTION get_mentor_weekly_availability(
  p_mentor_id UUID,
  p_week_start_date DATE
)
RETURNS TABLE (
  slot_id UUID,
  day_of_week INTEGER,
  day_name TEXT,
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN,
  is_booked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH week_slots AS (
    SELECT 
      mas.id as slot_id,
      mas.day_of_week,
      CASE mas.day_of_week
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
      END as day_name,
      mas.start_time,
      mas.end_time,
      mas.is_available
    FROM mentor_availability_slots mas
    WHERE mas.mentor_id = p_mentor_id
      AND mas.is_recurring = true
      AND mas.is_available = true
  )
  SELECT 
    ws.slot_id,
    ws.day_of_week,
    ws.day_name,
    ws.start_time,
    ws.end_time,
    ws.is_available,
    EXISTS(
      SELECT 1 FROM mentor_session_bookings msb
      WHERE msb.mentor_id = p_mentor_id
        AND msb.session_date = p_week_start_date + (ws.day_of_week || ' days')::INTERVAL
        AND msb.start_time = ws.start_time
        AND msb.status IN ('scheduled', 'rescheduled')
    ) as is_booked
  FROM week_slots ws
  ORDER BY ws.day_of_week, ws.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a slot is available for booking
CREATE OR REPLACE FUNCTION is_slot_available(
  p_mentor_id UUID,
  p_session_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
  v_day_of_week INTEGER;
  v_slot_exists BOOLEAN;
  v_is_booked BOOLEAN;
BEGIN
  -- Get day of week (0-6)
  v_day_of_week := EXTRACT(DOW FROM p_session_date);
  
  -- Check if mentor has availability for this day/time
  SELECT EXISTS(
    SELECT 1 FROM mentor_availability_slots
    WHERE mentor_id = p_mentor_id
      AND day_of_week = v_day_of_week
      AND start_time <= p_start_time
      AND end_time >= p_end_time
      AND is_available = true
      AND is_recurring = true
  ) INTO v_slot_exists;
  
  IF NOT v_slot_exists THEN
    RETURN false;
  END IF;
  
  -- Check if slot is already booked
  SELECT EXISTS(
    SELECT 1 FROM mentor_session_bookings
    WHERE mentor_id = p_mentor_id
      AND session_date = p_session_date
      AND status IN ('scheduled', 'rescheduled')
      AND (
        (start_time <= p_start_time AND end_time > p_start_time)
        OR (start_time < p_end_time AND end_time >= p_end_time)
        OR (start_time >= p_start_time AND end_time <= p_end_time)
      )
  ) INTO v_is_booked;
  
  RETURN NOT v_is_booked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a booking (with availability check)
CREATE OR REPLACE FUNCTION create_session_booking(
  p_request_id UUID,
  p_mentor_id UUID,
  p_mentee_id UUID,
  p_session_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_meeting_link TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
BEGIN
  -- Check if slot is available
  IF NOT is_slot_available(p_mentor_id, p_session_date, p_start_time, p_end_time) THEN
    RAISE EXCEPTION 'This time slot is not available';
  END IF;
  
  -- Create booking
  INSERT INTO mentor_session_bookings (
    request_id,
    mentor_id,
    mentee_id,
    session_date,
    start_time,
    end_time,
    meeting_link,
    notes,
    status
  ) VALUES (
    p_request_id,
    p_mentor_id,
    p_mentee_id,
    p_session_date,
    p_start_time,
    p_end_time,
    p_meeting_link,
    p_notes,
    'scheduled'
  )
  RETURNING id INTO v_booking_id;
  
  -- Create notification for mentor
  INSERT INTO app_notifications (user_id, type, title, message, related_id)
  SELECT 
    am.user_id,
    'session_booked',
    'New Session Booked',
    'A mentee has booked a session with you on ' || TO_CHAR(p_session_date, 'Mon DD, YYYY') || ' at ' || TO_CHAR(p_start_time, 'HH12:MI AM'),
    v_booking_id
  FROM alumni_mentors am
  WHERE am.id = p_mentor_id;
  
  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON mentor_availability_slots TO authenticated;
GRANT ALL ON mentor_availability_slots TO authenticated;
GRANT SELECT ON mentor_session_bookings TO authenticated;
GRANT ALL ON mentor_session_bookings TO authenticated;
GRANT EXECUTE ON FUNCTION get_mentor_weekly_availability TO authenticated;
GRANT EXECUTE ON FUNCTION is_slot_available TO authenticated;
GRANT EXECUTE ON FUNCTION create_session_booking TO authenticated;

-- Add comments
COMMENT ON TABLE mentor_availability_slots IS 'Stores mentor availability schedules (recurring and one-time)';
COMMENT ON TABLE mentor_session_bookings IS 'Stores scheduled mentorship sessions';
COMMENT ON FUNCTION get_mentor_weekly_availability IS 'Get a mentor''s available time slots for a specific week';
COMMENT ON FUNCTION is_slot_available IS 'Check if a specific time slot is available for booking';
COMMENT ON FUNCTION create_session_booking IS 'Create a new session booking with availability validation';
