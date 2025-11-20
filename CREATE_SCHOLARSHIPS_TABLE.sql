-- Create dedicated scholarships table
-- This separates scholarships from the general products_services marketplace

CREATE TABLE IF NOT EXISTS public.scholarships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Basic Information
  title text NOT NULL,
  name text, -- For backward compatibility
  description text NOT NULL,
  image_url text,
  
  -- Organization
  source_organization text,
  
  -- Funding
  amount text,
  price text DEFAULT '0', -- For backward compatibility
  funding_currency text DEFAULT 'USD',
  
  -- Deadlines
  deadline text,
  deadline_date text,
  deadline_text text,
  
  -- Eligibility
  eligibility text,
  eligibility_criteria text,
  requirements text,
  benefits text,
  
  -- Categorization (Arrays)
  scholarship_types text[],
  eligibility_levels text[],
  fields_of_study text[],
  
  -- Contact & Links
  website_url text,
  application_url text,
  contact_email text,
  
  -- Additional Info
  is_renewable boolean DEFAULT false,
  number_of_awards integer,
  
  -- Status
  is_approved boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  
  -- Metadata
  view_count integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view approved scholarships"
  ON public.scholarships
  FOR SELECT
  TO authenticated
  USING (is_approved = true);

CREATE POLICY "Users can create scholarships"
  ON public.scholarships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scholarships"
  ON public.scholarships
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scholarships"
  ON public.scholarships
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all scholarships"
  ON public.scholarships
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
CREATE INDEX IF NOT EXISTS idx_scholarships_user_id ON public.scholarships(user_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_is_approved ON public.scholarships(is_approved);
CREATE INDEX IF NOT EXISTS idx_scholarships_is_featured ON public.scholarships(is_featured);
CREATE INDEX IF NOT EXISTS idx_scholarships_created_at ON public.scholarships(created_at);
CREATE INDEX IF NOT EXISTS idx_scholarships_deadline ON public.scholarships(deadline);
CREATE INDEX IF NOT EXISTS idx_scholarships_funding_currency ON public.scholarships(funding_currency);
CREATE INDEX IF NOT EXISTS idx_scholarships_scholarship_types ON public.scholarships USING GIN(scholarship_types);
CREATE INDEX IF NOT EXISTS idx_scholarships_eligibility_levels ON public.scholarships USING GIN(eligibility_levels);
CREATE INDEX IF NOT EXISTS idx_scholarships_fields_of_study ON public.scholarships USING GIN(fields_of_study);

-- Add comments
COMMENT ON TABLE public.scholarships IS 'Dedicated table for scholarship opportunities';
COMMENT ON COLUMN public.scholarships.scholarship_types IS 'Array of scholarship types (merit-based, need-based, athletic, etc.)';
COMMENT ON COLUMN public.scholarships.eligibility_levels IS 'Array of eligible education levels (undergraduate, graduate, etc.)';
COMMENT ON COLUMN public.scholarships.fields_of_study IS 'Array of applicable fields of study (STEM, Business, Arts, etc.)';

-- Migrate existing scholarships from products_services to scholarships table
INSERT INTO public.scholarships (
  id, user_id, created_at, title, name, description, image_url,
  source_organization, amount, price, funding_currency,
  deadline, deadline_date, deadline_text,
  eligibility, eligibility_criteria, requirements, benefits,
  scholarship_types, eligibility_levels, fields_of_study,
  website_url, application_url, contact_email,
  is_renewable, number_of_awards, is_approved, is_featured, view_count
)
SELECT 
  id, user_id, created_at, 
  COALESCE(title, name, 'Untitled Scholarship') as title,
  name,
  description, 
  image_url,
  source_organization,
  amount,
  price,
  COALESCE(funding_currency, 'USD'),
  deadline,
  deadline_date,
  deadline_text,
  eligibility,
  eligibility_criteria,
  requirements,
  benefits,
  scholarship_types,
  eligibility_levels,
  fields_of_study,
  website_url,
  application_url,
  contact_email,
  COALESCE(is_renewable, false),
  number_of_awards,
  COALESCE(is_approved, false),
  COALESCE(is_featured, false),
  COALESCE(view_count, 0)
FROM public.products_services
WHERE category_name = 'Scholarships'
ON CONFLICT (id) DO NOTHING;

-- Optional: Remove scholarships from products_services after migration
-- Uncomment the line below if you want to clean up the old table
-- DELETE FROM public.products_services WHERE category_name = 'Scholarships';
