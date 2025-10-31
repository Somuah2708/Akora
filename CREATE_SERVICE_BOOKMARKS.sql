-- Create service_bookmarks table and related tables for marketplace
-- Run this in Supabase Dashboard SQL Editor

-- Create service_bookmarks table
CREATE TABLE IF NOT EXISTS public.service_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_service_id uuid NOT NULL REFERENCES public.products_services(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(product_service_id, user_id)
);

-- Create service_reviews table (for future use)
CREATE TABLE IF NOT EXISTS public.service_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_service_id uuid NOT NULL REFERENCES public.products_services(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(product_service_id, user_id)
);

-- Disable RLS for testing with mock auth
ALTER TABLE public.service_bookmarks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products_services DISABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_bookmarks_product ON public.service_bookmarks(product_service_id);
CREATE INDEX IF NOT EXISTS idx_service_bookmarks_user ON public.service_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_product ON public.service_reviews(product_service_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_user ON public.service_reviews(user_id);

-- Add comments
COMMENT ON TABLE public.service_bookmarks IS 'User bookmarks/favorites for products and services';
COMMENT ON TABLE public.service_reviews IS 'User reviews and ratings for products and services';
