-- Diagnostic script to check RSVP system setup
-- Run this to verify everything is working correctly

-- 1. Check if event_rsvps table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'event_rsvps'
) AS event_rsvps_table_exists;

-- 2. Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'event_rsvps'
ORDER BY ordinal_position;

-- 3. Check if rsvp_count column exists in akora_events
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'akora_events' AND column_name = 'rsvp_count';

-- 4. Count total RSVPs
SELECT COUNT(*) as total_rsvps FROM event_rsvps;

-- 5. Count RSVPs by status
SELECT status, COUNT(*) as count
FROM event_rsvps
GROUP BY status
ORDER BY count DESC;

-- 6. Check RLS policies on event_rsvps
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'event_rsvps';

-- 7. Sample RSVPs data
SELECT 
  er.id,
  er.event_id,
  er.user_id,
  er.status,
  er.created_at,
  ae.title as event_title
FROM event_rsvps er
LEFT JOIN akora_events ae ON ae.id = er.event_id
ORDER BY er.created_at DESC
LIMIT 10;

-- 8. Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'event_rsvps';

-- 9. Events with RSVP counts
SELECT 
  ae.id,
  ae.title,
  ae.rsvp_count as stored_count,
  (SELECT COUNT(*) FROM event_rsvps WHERE event_id = ae.id AND status = 'attending') as actual_count
FROM akora_events ae
WHERE EXISTS (SELECT 1 FROM event_rsvps WHERE event_id = ae.id)
LIMIT 10;

-- 10. If you need to manually sync counts, run this:
-- UPDATE akora_events
-- SET rsvp_count = (
--   SELECT COUNT(*)
--   FROM event_rsvps
--   WHERE event_rsvps.event_id = akora_events.id
--   AND event_rsvps.status = 'attending'
-- )
-- WHERE EXISTS (
--   SELECT 1 FROM event_rsvps WHERE event_rsvps.event_id = akora_events.id
-- );
