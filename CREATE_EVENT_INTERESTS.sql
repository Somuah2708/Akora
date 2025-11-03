-- Create event_interests table to track users who marked events as "interested"
-- Run this in your Supabase SQL Editor

-- Create the table
CREATE TABLE IF NOT EXISTS public.event_interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.products_services(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_event_interests_event_id ON public.event_interests(event_id);
CREATE INDEX IF NOT EXISTS idx_event_interests_user_id ON public.event_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_event_interests_created_at ON public.event_interests(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.event_interests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own interests
CREATE POLICY "Users can view own interests"
    ON public.event_interests
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can mark events as interested
CREATE POLICY "Users can create interests"
    ON public.event_interests
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can remove their interests
CREATE POLICY "Users can delete own interests"
    ON public.event_interests
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policy: Event organizers can view who's interested in their events
CREATE POLICY "Event organizers can view event interests"
    ON public.event_interests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.products_services
            WHERE products_services.id = event_interests.event_id
            AND products_services.user_id = auth.uid()
        )
    );

-- Optional: Add a function to get interest count for an event
CREATE OR REPLACE FUNCTION get_event_interest_count(event_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.event_interests
        WHERE event_id = event_uuid
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.event_interests IS 'Tracks which users have marked events as "interested" to receive notifications';
COMMENT ON CONSTRAINT event_interests_event_id_user_id_key ON public.event_interests IS 'Ensures a user can only mark an event as interested once';
