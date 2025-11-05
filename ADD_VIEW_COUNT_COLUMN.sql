-- Add view_count column to products_services table
-- Run this in Supabase Dashboard SQL Editor

-- Add view_count column if it doesn't exist
ALTER TABLE public.products_services 
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- Create index for better performance when sorting by view count
CREATE INDEX IF NOT EXISTS idx_products_services_view_count 
ON public.products_services(view_count DESC);

-- Update existing events to have view_count = 0 if NULL
UPDATE public.products_services 
SET view_count = 0 
WHERE view_count IS NULL AND category_name LIKE 'Event - %';

COMMENT ON COLUMN public.products_services.view_count IS 'Number of times this event has been viewed';
