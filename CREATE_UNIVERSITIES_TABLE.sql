-- Create dedicated universities table
-- This separates universities from the general products_services marketplace

CREATE TABLE IF NOT EXISTS public.universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Basic Information
  title text NOT NULL,
  name text, -- For backward compatibility
  description text NOT NULL,
  image_url text,
  
  -- Location
  location text,
  country text,
  city text,
  address text,
  
  -- Contact & Links
  website_url text,
  contact_email text,
  phone text,
  
  -- Academic Information
  programs_offered text[],
  accreditation text,
  ranking integer,
  
  -- Admission
  admission_requirements text,
  application_deadline text,
  tuition_fees text,
  
  -- Additional Info
  established_year integer,
  student_population integer,
  campus_size text,
  
  -- Status
  is_approved boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  
  -- Metadata
  view_count integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view approved universities"
  ON public.universities
  FOR SELECT
  TO authenticated
  USING (is_approved = true);

CREATE POLICY "Users can create universities"
  ON public.universities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own universities"
  ON public.universities
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own universities"
  ON public.universities
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all universities"
  ON public.universities
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_universities_user_id ON public.universities(user_id);
CREATE INDEX IF NOT EXISTS idx_universities_is_approved ON public.universities(is_approved);
CREATE INDEX IF NOT EXISTS idx_universities_is_featured ON public.universities(is_featured);
CREATE INDEX IF NOT EXISTS idx_universities_created_at ON public.universities(created_at);
CREATE INDEX IF NOT EXISTS idx_universities_location ON public.universities(location);
CREATE INDEX IF NOT EXISTS idx_universities_country ON public.universities(country);
CREATE INDEX IF NOT EXISTS idx_universities_programs_offered ON public.universities USING GIN(programs_offered);

-- Add comments
COMMENT ON TABLE public.universities IS 'Dedicated table for university information';
COMMENT ON COLUMN public.universities.programs_offered IS 'Array of academic programs offered by the university';

-- Migrate existing universities from products_services to universities table
INSERT INTO public.universities (
  id, user_id, created_at, title, name, description, image_url,
  location, country, city, address,
  website_url, contact_email, phone,
  programs_offered, accreditation, ranking,
  admission_requirements, application_deadline, tuition_fees,
  established_year, student_population, campus_size,
  is_approved, is_featured, view_count
)
SELECT 
  id, user_id, created_at,
  COALESCE(title, name, 'Untitled University') as title,
  name,
  description,
  image_url,
  location,
  country,
  city,
  address,
  website_url,
  contact_email,
  phone,
  programs_offered,
  accreditation,
  ranking,
  admission_requirements,
  application_deadline,
  tuition_fees,
  established_year,
  student_population,
  campus_size,
  COALESCE(is_approved, false),
  COALESCE(is_featured, false),
  COALESCE(view_count, 0)
FROM public.products_services
WHERE category_name = 'Universities'
ON CONFLICT (id) DO NOTHING;

-- Optional: Remove universities from products_services after migration
-- Uncomment the line below if you want to clean up the old table
-- DELETE FROM public.products_services WHERE category_name = 'Universities';
