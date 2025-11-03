-- Create event_views table to track views and registrations
-- Run this in Supabase Dashboard SQL Editor

-- Create event_views table for tracking event views
CREATE TABLE IF NOT EXISTS public.event_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.products_services(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  view_type varchar(20) DEFAULT 'view' CHECK (view_type IN ('view', 'registration')),
  created_at timestamp with time zone DEFAULT now()
);

-- Disable RLS for testing
ALTER TABLE public.event_views DISABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_event_views_event ON public.event_views(event_id);
CREATE INDEX IF NOT EXISTS idx_event_views_user ON public.event_views(user_id);
CREATE INDEX IF NOT EXISTS idx_event_views_type ON public.event_views(view_type);
CREATE INDEX IF NOT EXISTS idx_event_views_created ON public.event_views(created_at DESC);

-- Create a function to get event stats
CREATE OR REPLACE FUNCTION get_event_stats(event_uuid uuid)
RETURNS TABLE (
  view_count bigint,
  registration_count bigint,
  unique_viewers bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE view_type = 'view') as view_count,
    COUNT(*) FILTER (WHERE view_type = 'registration') as registration_count,
    COUNT(DISTINCT user_id) as unique_viewers
  FROM event_views
  WHERE event_id = event_uuid;
END;
$$ LANGUAGE plpgsql;

-- Add view count column to products_services for caching (optional)
ALTER TABLE public.products_services 
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS registration_count integer DEFAULT 0;

-- Create index on view_count for sorting
CREATE INDEX IF NOT EXISTS idx_products_services_view_count ON public.products_services(view_count DESC);

COMMENT ON TABLE public.event_views IS 'Tracks views and registrations for events';
COMMENT ON COLUMN public.event_views.view_type IS 'Type of interaction: view or registration';
