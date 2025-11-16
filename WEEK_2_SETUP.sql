-- ====================================================================================
-- WEEK 2: USER EXPERIENCE FEATURES
-- Add RSVP tracking, analytics, and notifications
-- ====================================================================================

-- 1. Add analytics columns to akora_events
ALTER TABLE public.akora_events
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rsvp_count INTEGER DEFAULT 0;

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_akora_events_view_count ON public.akora_events(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_akora_events_rsvp_count ON public.akora_events(rsvp_count DESC);

-- ====================================================================================
-- 2. Create event_rsvps table for RSVP tracking
-- ====================================================================================

CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.akora_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'maybe', 'not_attending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON public.event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id ON public.event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_status ON public.event_rsvps(event_id, status);

-- RLS Policies for event_rsvps
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS rsvp_select_all ON public.event_rsvps;
DROP POLICY IF EXISTS rsvp_insert_own ON public.event_rsvps;
DROP POLICY IF EXISTS rsvp_update_own ON public.event_rsvps;
DROP POLICY IF EXISTS rsvp_delete_own ON public.event_rsvps;

-- Anyone can view RSVPs
CREATE POLICY rsvp_select_all ON public.event_rsvps
FOR SELECT USING (true);

-- Users can RSVP to events
CREATE POLICY rsvp_insert_own ON public.event_rsvps
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own RSVPs
CREATE POLICY rsvp_update_own ON public.event_rsvps
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own RSVPs
CREATE POLICY rsvp_delete_own ON public.event_rsvps
FOR DELETE USING (auth.uid() = user_id);

-- ====================================================================================
-- 3. Function to update RSVP count automatically
-- ====================================================================================

CREATE OR REPLACE FUNCTION public.update_event_rsvp_count()
RETURNS trigger AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Get the event_id from NEW or OLD
  v_event_id := COALESCE(NEW.event_id, OLD.event_id);
  
  -- Update rsvp_count for the event
  UPDATE public.akora_events
  SET rsvp_count = (
    SELECT COUNT(*)
    FROM public.event_rsvps
    WHERE event_rsvps.event_id = v_event_id
    AND status = 'attending'
  )
  WHERE id = v_event_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update RSVP count on INSERT/UPDATE/DELETE
DROP TRIGGER IF EXISTS update_rsvp_count_trigger ON public.event_rsvps;
CREATE TRIGGER update_rsvp_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.event_rsvps
FOR EACH ROW
EXECUTE FUNCTION public.update_event_rsvp_count();

-- ====================================================================================
-- 4. Create notifications table (if not exists)
-- ====================================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  event_id UUID REFERENCES public.akora_events(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_event ON public.notifications(event_id);

-- RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notif_select_own ON public.notifications;
DROP POLICY IF EXISTS notif_insert_any ON public.notifications;
DROP POLICY IF EXISTS notif_update_own ON public.notifications;

-- Users can only see their own notifications
CREATE POLICY notif_select_own ON public.notifications
FOR SELECT USING (recipient_id = auth.uid());

-- Any authenticated user can create notifications (for system notifications)
-- Allow both authenticated users and trigger functions (SECURITY DEFINER) to insert
CREATE POLICY notif_insert_any ON public.notifications
FOR INSERT WITH CHECK (true);

-- Users can update (mark as read) their own notifications
CREATE POLICY notif_update_own ON public.notifications
FOR UPDATE USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- ====================================================================================
-- 5. Function to send event approval/rejection notifications
-- ====================================================================================

CREATE OR REPLACE FUNCTION public.notify_event_status_change()
RETURNS trigger AS $$
BEGIN
  -- Only send notification if status changed to published or rejected
  IF (OLD.status IS DISTINCT FROM NEW.status) AND (NEW.status IN ('published', 'rejected')) THEN
    INSERT INTO public.notifications (
      recipient_id,
      actor_id,
      notification_type,
      title,
      content,
      event_id
    ) VALUES (
      NEW.created_by,
      NEW.approved_by,
      CASE 
        WHEN NEW.status = 'published' THEN 'event_approved'
        WHEN NEW.status = 'rejected' THEN 'event_rejected'
      END,
      CASE 
        WHEN NEW.status = 'published' THEN '🎉 Event Approved!'
        WHEN NEW.status = 'rejected' THEN '❌ Event Rejected'
      END,
      CASE 
        WHEN NEW.status = 'published' THEN 'Your event "' || NEW.title || '" has been approved and is now live!'
        WHEN NEW.status = 'rejected' THEN 'Your event "' || NEW.title || '" was rejected. ' || COALESCE('Reason: ' || NEW.moderation_notes, 'Please contact an admin for details.')
      END,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to send notifications on status change
DROP TRIGGER IF EXISTS notify_event_status_trigger ON public.akora_events;
CREATE TRIGGER notify_event_status_trigger
AFTER UPDATE ON public.akora_events
FOR EACH ROW
EXECUTE FUNCTION public.notify_event_status_change();

-- ====================================================================================
-- 6. Function to notify event creator when someone RSVPs
-- ====================================================================================

CREATE OR REPLACE FUNCTION public.notify_event_rsvp()
RETURNS trigger AS $$
DECLARE
  v_event_creator UUID;
  v_event_title TEXT;
  v_user_name TEXT;
BEGIN
  -- Only notify on new RSVP with 'attending' status
  IF TG_OP = 'INSERT' AND NEW.status = 'attending' THEN
    -- Get event creator and title
    SELECT created_by, title INTO v_event_creator, v_event_title
    FROM public.akora_events
    WHERE id = NEW.event_id;
    
    -- Get RSVP user's name
    SELECT COALESCE(full_name, email) INTO v_user_name
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    -- Don't notify if creator RSVPs to their own event
    IF v_event_creator != NEW.user_id THEN
      INSERT INTO public.notifications (
        recipient_id,
        actor_id,
        notification_type,
        title,
        content,
        event_id
      ) VALUES (
        v_event_creator,
        NEW.user_id,
        'event_rsvp',
        '🎫 New RSVP',
        v_user_name || ' is attending your event "' || v_event_title || '"',
        NEW.event_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to send RSVP notifications
DROP TRIGGER IF EXISTS notify_rsvp_trigger ON public.event_rsvps;
CREATE TRIGGER notify_rsvp_trigger
AFTER INSERT ON public.event_rsvps
FOR EACH ROW
EXECUTE FUNCTION public.notify_event_rsvp();

-- ====================================================================================
-- 7. Function to increment view count (called from app)
-- ====================================================================================

CREATE OR REPLACE FUNCTION public.increment_event_views(p_event_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.akora_events
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_event_views(UUID) TO authenticated;

-- ====================================================================================
-- SETUP COMPLETE! ✅
-- ====================================================================================

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Week 2 setup completed successfully!';
  RAISE NOTICE 'Tables created: event_rsvps, notifications';
  RAISE NOTICE 'Triggers created: update_rsvp_count, notify_event_status, notify_rsvp';
  RAISE NOTICE 'Functions created: increment_event_views';
END $$;
