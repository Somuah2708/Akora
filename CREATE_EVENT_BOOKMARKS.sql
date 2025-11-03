-- Create event_bookmarks table for saving events
-- Run this in Supabase Dashboard SQL Editor

-- Create event_bookmarks table
CREATE TABLE IF NOT EXISTS public.event_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.products_services(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Disable RLS for testing with mock auth
ALTER TABLE public.event_bookmarks DISABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_bookmarks_event ON public.event_bookmarks(event_id);
CREATE INDEX IF NOT EXISTS idx_event_bookmarks_user ON public.event_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_event_bookmarks_created ON public.event_bookmarks(created_at DESC);

-- Add comments
COMMENT ON TABLE public.event_bookmarks IS 'User bookmarks/saved events from the event calendar';
COMMENT ON COLUMN public.event_bookmarks.event_id IS 'References the event in products_services table';
COMMENT ON COLUMN public.event_bookmarks.user_id IS 'References the user who saved the event';
