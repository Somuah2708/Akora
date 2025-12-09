-- =====================================================
-- FIX MENTOR REQUESTS STATUS CONSTRAINT
-- Add 'cancelled' to allowed status values
-- =====================================================

-- Drop the old constraint
ALTER TABLE mentor_requests 
DROP CONSTRAINT IF EXISTS mentor_requests_status_chk;

ALTER TABLE mentor_requests 
DROP CONSTRAINT IF EXISTS mentor_requests_status_check;

-- Add the updated constraint with 'cancelled' included
ALTER TABLE mentor_requests 
ADD CONSTRAINT mentor_requests_status_check 
CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled'));

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'mentor_requests'::regclass 
AND conname LIKE '%status%';
