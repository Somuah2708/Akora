-- QUICK FIX: Add rsvp_count column to akora_events
-- Run this if you're getting "column rsvp_count does not exist" error

-- Add the rsvp_count column
ALTER TABLE akora_events ADD COLUMN IF NOT EXISTS rsvp_count INTEGER DEFAULT 0;

-- Update existing events with current RSVP counts
UPDATE akora_events
SET rsvp_count = (
  SELECT COUNT(*)
  FROM event_rsvps
  WHERE event_rsvps.event_id = akora_events.id
  AND event_rsvps.status = 'attending'
)
WHERE EXISTS (
  SELECT 1 FROM event_rsvps WHERE event_rsvps.event_id = akora_events.id
);

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'akora_events' AND column_name = 'rsvp_count';

-- Show sample data
SELECT id, title, rsvp_count
FROM akora_events
LIMIT 5;
