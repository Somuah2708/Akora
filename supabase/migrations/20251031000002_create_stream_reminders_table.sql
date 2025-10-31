-- Create stream_reminders table
CREATE TABLE IF NOT EXISTS public.stream_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stream_id UUID REFERENCES public.livestreams(id) ON DELETE CASCADE,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, stream_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_stream_reminders_user_id ON public.stream_reminders(user_id);
CREATE INDEX idx_stream_reminders_stream_id ON public.stream_reminders(stream_id);
CREATE INDEX idx_stream_reminders_reminder_sent ON public.stream_reminders(reminder_sent);

-- Enable RLS
ALTER TABLE public.stream_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own reminders"
  ON public.stream_reminders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reminders"
  ON public.stream_reminders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
  ON public.stream_reminders
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to check for upcoming streams and send reminders
CREATE OR REPLACE FUNCTION check_stream_reminders()
RETURNS void AS $$
DECLARE
  reminder_record RECORD;
  stream_record RECORD;
BEGIN
  -- Find all reminders for streams starting in 15 minutes that haven't been sent
  FOR reminder_record IN
    SELECT sr.id, sr.user_id, sr.stream_id, u.email, u.raw_user_meta_data->>'full_name' as user_name
    FROM public.stream_reminders sr
    JOIN public.livestreams ls ON sr.stream_id = ls.id
    JOIN auth.users u ON sr.user_id = u.id
    WHERE sr.reminder_sent = false
      AND ls.start_time <= NOW() + INTERVAL '15 minutes'
      AND ls.start_time > NOW()
  LOOP
    -- Get stream details
    SELECT * INTO stream_record FROM public.livestreams WHERE id = reminder_record.stream_id;
    
    -- Mark reminder as sent
    UPDATE public.stream_reminders
    SET reminder_sent = true
    WHERE id = reminder_record.id;
    
    -- TODO: Send notification/email here
    -- For now, just log it
    RAISE NOTICE 'Reminder sent to user % for stream %', reminder_record.user_name, stream_record.title;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
