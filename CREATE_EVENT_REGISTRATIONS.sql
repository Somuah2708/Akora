-- Create event_registrations table to store event registration data
-- Run this in your Supabase SQL Editor

-- Create the table
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.products_services(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    ticket_quantity INTEGER NOT NULL DEFAULT 1,
    additional_notes TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON public.event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON public.event_registrations(status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_created_at ON public.event_registrations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own registrations
CREATE POLICY "Users can view own registrations"
    ON public.event_registrations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can create registrations
CREATE POLICY "Users can create registrations"
    ON public.event_registrations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own registrations
CREATE POLICY "Users can update own registrations"
    ON public.event_registrations
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own registrations
CREATE POLICY "Users can delete own registrations"
    ON public.event_registrations
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policy: Event organizers can view registrations for their events
CREATE POLICY "Event organizers can view event registrations"
    ON public.event_registrations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.products_services
            WHERE products_services.id = event_registrations.event_id
            AND products_services.user_id = auth.uid()
        )
    );

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_registrations_updated_at
    BEFORE UPDATE ON public.event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Optional: Add a function to get registration count for an event
CREATE OR REPLACE FUNCTION get_event_registration_count(event_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(ticket_quantity), 0)::INTEGER
        FROM public.event_registrations
        WHERE event_id = event_uuid
        AND status = 'confirmed'
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.event_registrations IS 'Stores event registration information including attendee details and ticket quantities';
COMMENT ON COLUMN public.event_registrations.status IS 'Registration status: confirmed, cancelled, pending, etc.';
COMMENT ON COLUMN public.event_registrations.ticket_quantity IS 'Number of tickets/seats registered for this event';
