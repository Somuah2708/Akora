/*
  # Create products_services table and update profiles

  1. New Tables
    - `products_services`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `title` (text, required)
      - `description` (text, required)
      - `price` (numeric, required)
      - `image_url` (text, optional)
      - `category_name` (text, required)
      - `is_featured` (boolean, default false)
      - `is_premium_listing` (boolean, default false)
      - `created_at` (timestamp with time zone, default now)

  2. Profile Updates
    - Add `free_listings_count` column to profiles table (default 3)

  3. Security
    - Enable RLS on `products_services` table
    - Add policies for authenticated users to read all listings
    - Add policies for users to manage their own listings
    - Add policies for admins to manage all listings

  4. Sample Data
    - Insert sample products and services for demonstration
*/

-- Add free_listings_count column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'free_listings_count'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN free_listings_count integer DEFAULT 3;
  END IF;
END $$;

-- Create products_services table
CREATE TABLE IF NOT EXISTS public.products_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  price numeric NOT NULL CHECK (price > 0),
  image_url text,
  category_name text NOT NULL,
  is_featured boolean DEFAULT false,
  is_premium_listing boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products_services ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "All users can view products and services"
  ON public.products_services
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own listings"
  ON public.products_services
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listings"
  ON public.products_services
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listings"
  ON public.products_services
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all listings"
  ON public.products_services
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_services_user_id ON public.products_services(user_id);
CREATE INDEX IF NOT EXISTS idx_products_services_category ON public.products_services(category_name);
CREATE INDEX IF NOT EXISTS idx_products_services_featured ON public.products_services(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_services_created_at ON public.products_services(created_at);

-- Insert sample data (only if table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.products_services LIMIT 1) THEN
    -- Get the first admin user for sample data
    INSERT INTO public.products_services (user_id, title, description, price, image_url, category_name, is_featured, is_premium_listing)
    SELECT 
      p.id,
      'Professional Web Development',
      'Custom website development using modern technologies like React, Node.js, and cloud deployment.',
      2500.00,
      'https://images.pexels.com/photos/270348/pexels-photo-270348.jpeg',
      'Technical Services',
      true,
      false
    FROM public.profiles p
    WHERE p.is_admin = true
    LIMIT 1;

    INSERT INTO public.products_services (user_id, title, description, price, image_url, category_name, is_featured, is_premium_listing)
    SELECT 
      p.id,
      'Business Consulting Services',
      'Strategic business consulting to help grow your company and optimize operations.',
      150.00,
      'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg',
      'Business Services',
      true,
      false
    FROM public.profiles p
    WHERE p.is_admin = true
    LIMIT 1;

    INSERT INTO public.products_services (user_id, title, description, price, image_url, category_name, is_featured, is_premium_listing)
    SELECT 
      p.id,
      'Mathematics Tutoring',
      'One-on-one mathematics tutoring for high school and college students.',
      45.00,
      'https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg',
      'Education & Tutoring',
      false,
      false
    FROM public.profiles p
    WHERE p.is_admin = true
    LIMIT 1;

    INSERT INTO public.products_services (user_id, title, description, price, image_url, category_name, is_featured, is_premium_listing)
    SELECT 
      p.id,
      'Logo Design & Branding',
      'Professional logo design and complete branding packages for businesses.',
      350.00,
      'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg',
      'Creative & Design',
      true,
      false
    FROM public.profiles p
    WHERE p.is_admin = true
    LIMIT 1;

    INSERT INTO public.products_services (user_id, title, description, price, image_url, category_name, is_featured, is_premium_listing)
    SELECT 
      p.id,
      'Event Catering Services',
      'Full-service catering for corporate events, weddings, and private parties.',
      25.00,
      'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg',
      'Food & Catering',
      false,
      false
    FROM public.profiles p
    WHERE p.is_admin = true
    LIMIT 1;
  END IF;
END $$;