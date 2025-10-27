/*
  # Marketplace Enhancements

  1. New Tables
    - `service_reviews` - Customer reviews and ratings for products/services
    - `service_bookmarks` - User bookmarks/favorites for products/services
    
  2. Enhancements
    - Add rating statistics to products_services
    - Add helper functions for ratings and reviews
    - Add RLS policies
    - Add sample reviews and data
    
  3. Features
    - 5-star rating system
    - Review comments
    - Bookmark/favorite listings
    - Rating aggregation
    - Review counts
*/

-- Create service_reviews table
CREATE TABLE IF NOT EXISTS public.service_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_service_id uuid NOT NULL REFERENCES public.products_services(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(product_service_id, user_id) -- One review per user per product/service
);

-- Create service_bookmarks table
CREATE TABLE IF NOT EXISTS public.service_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_service_id uuid NOT NULL REFERENCES public.products_services(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(product_service_id, user_id) -- One bookmark per user per product/service
);

-- Enable RLS
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_reviews
CREATE POLICY "Anyone can view reviews"
  ON public.service_reviews
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews"
  ON public.service_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON public.service_reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON public.service_reviews
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for service_bookmarks
CREATE POLICY "Users can view their own bookmarks"
  ON public.service_bookmarks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookmarks"
  ON public.service_bookmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON public.service_bookmarks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_reviews_product ON public.service_reviews(product_service_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_user ON public.service_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_rating ON public.service_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_service_bookmarks_product ON public.service_bookmarks(product_service_id);
CREATE INDEX IF NOT EXISTS idx_service_bookmarks_user ON public.service_bookmarks(user_id);

-- Function to get average rating for a product/service
CREATE OR REPLACE FUNCTION get_service_rating_stats(service_id uuid)
RETURNS TABLE (
  average_rating numeric,
  review_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0) as average_rating,
    COUNT(*) as review_count
  FROM service_reviews
  WHERE product_service_id = service_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has bookmarked a service
CREATE OR REPLACE FUNCTION is_service_bookmarked(service_id uuid, check_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM service_bookmarks
    WHERE product_service_id = service_id AND user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's review for a service
CREATE OR REPLACE FUNCTION get_user_service_review(service_id uuid, check_user_id uuid)
RETURNS TABLE (
  id uuid,
  rating integer,
  comment text,
  created_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.rating,
    sr.comment,
    sr.created_at
  FROM service_reviews sr
  WHERE sr.product_service_id = service_id AND sr.user_id = check_user_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on review changes
CREATE OR REPLACE FUNCTION update_service_review_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER service_review_updated_at
  BEFORE UPDATE ON public.service_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_service_review_updated_at();

-- Function to decrement free listings count
CREATE OR REPLACE FUNCTION decrement_free_listings()
RETURNS TRIGGER AS $$
BEGIN
  -- Only decrement if not featured and not premium
  IF NEW.is_featured = false AND NEW.is_premium_listing = false THEN
    UPDATE profiles
    SET free_listings_count = GREATEST(free_listings_count - 1, 0)
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-decrement free listings on insert
DROP TRIGGER IF EXISTS on_listing_created ON public.products_services;
CREATE TRIGGER on_listing_created
  AFTER INSERT ON public.products_services
  FOR EACH ROW
  EXECUTE FUNCTION decrement_free_listings();

-- Insert sample reviews (only if reviews table is empty)
DO $$
DECLARE
  sample_user_id uuid;
  sample_service_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.service_reviews LIMIT 1) THEN
    -- Get sample user and service IDs
    SELECT id INTO sample_user_id FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000001' LIMIT 1;
    SELECT id INTO sample_service_id FROM public.products_services LIMIT 1;
    
    IF sample_user_id IS NOT NULL AND sample_service_id IS NOT NULL THEN
      -- Insert sample reviews
      INSERT INTO public.service_reviews (product_service_id, user_id, rating, comment)
      VALUES 
        (sample_service_id, sample_user_id, 5, 'Excellent service! Very professional and delivered on time.'),
        (sample_service_id, '00000000-0000-0000-0000-000000000002', 4, 'Great quality work. Would recommend to others.');
      
      -- Insert sample bookmarks
      INSERT INTO public.service_bookmarks (product_service_id, user_id)
      VALUES 
        (sample_service_id, sample_user_id);
    END IF;
  END IF;
END $$;

-- Add more sample products for better demonstration
DO $$
DECLARE
  user1_id uuid := '00000000-0000-0000-0000-000000000001';
  user2_id uuid := '00000000-0000-0000-0000-000000000002';
  user3_id uuid := '00000000-0000-0000-0000-000000000003';
BEGIN
  -- Only insert if we have sample users
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user1_id) THEN
    -- More diverse marketplace listings
    INSERT INTO public.products_services (user_id, title, description, price, image_url, category_name, is_featured, is_premium_listing)
    VALUES 
      (user2_id, 'Mobile App Development', 'Custom iOS and Android app development with modern UI/UX design.', 3500.00, 'https://images.pexels.com/photos/607812/pexels-photo-607812.jpeg', 'Technical Services', false, false),
      (user3_id, 'Digital Marketing Strategy', 'Complete digital marketing plans including SEO, social media, and content strategy.', 800.00, 'https://images.pexels.com/photos/265087/pexels-photo-265087.jpeg', 'Business Services', true, false),
      (user1_id, 'English Language Tutoring', 'Experienced English teacher offering private lessons for all levels.', 35.00, 'https://images.pexels.com/photos/256395/pexels-photo-256395.jpeg', 'Education & Tutoring', false, false),
      (user2_id, 'Graphic Design Services', 'Professional design for posters, flyers, social media content, and more.', 250.00, 'https://images.pexels.com/photos/326503/pexels-photo-326503.jpeg', 'Creative & Design', true, false),
      (user3_id, 'Wedding Photography', 'Professional wedding photography packages with same-day editing available.', 1200.00, 'https://images.pexels.com/photos/1024994/pexels-photo-1024994.jpeg', 'Photography', false, false),
      (user1_id, 'Healthy Meal Prep', 'Weekly meal prep services with customizable dietary options.', 15.00, 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg', 'Food & Catering', false, false),
      (user2_id, 'Personal Training', 'Certified personal trainer offering one-on-one fitness coaching.', 60.00, 'https://images.pexels.com/photos/703016/pexels-photo-703016.jpeg', 'Healthcare', false, false),
      (user3_id, 'Book Editing & Publishing', 'Professional editing and self-publishing consultation for authors.', 500.00, 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg', 'Publishing', false, false)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
