-- Alumni Mentors System
-- Free mentorship program connecting experienced alumni with mentees (students, young professionals, anyone seeking guidance)

-- 1. Create alumni_mentors table
CREATE TABLE IF NOT EXISTS public.alumni_mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  profile_photo_url TEXT,
  
  -- Professional Info
  current_title TEXT NOT NULL, -- e.g., "Senior Software Engineer at Google"
  company TEXT,
  industry TEXT, -- e.g., "Technology", "Finance", "Healthcare"
  years_of_experience INTEGER,
  
  -- Alumni Info
  graduation_year INTEGER,
  degree TEXT, -- e.g., "BSc Computer Science"
  
  -- Mentorship Details
  expertise_areas TEXT[], -- Array of areas: ["Career Guidance", "Technical Skills", "Entrepreneurship"]
  available_hours TEXT, -- e.g., "5 hours/month", "Flexible"
  meeting_formats TEXT[], -- ["In-Person", "Video Call", "Phone", "Email"]
  preferred_days TEXT[], -- ["Weekdays", "Weekends", "Evenings"]
  
  -- Contact Preferences
  linkedin_url TEXT,
  twitter_url TEXT,
  website_url TEXT,
  
  -- Bio
  short_bio TEXT, -- Brief introduction (200 chars)
  detailed_bio TEXT, -- Detailed background and what they can offer
  mentorship_philosophy TEXT, -- Why they want to mentor
  
  -- Admin Fields
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'inactive')),
  application_type TEXT DEFAULT 'admin_added' CHECK (application_type IN ('admin_added', 'self_applied')),
  admin_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Create mentor_applications table (for volunteers)
CREATE TABLE IF NOT EXISTS public.mentor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Applicant Info
  user_id UUID REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Professional Info
  current_title TEXT NOT NULL,
  company TEXT,
  industry TEXT,
  years_of_experience INTEGER,
  
  -- Alumni Info
  graduation_year INTEGER NOT NULL,
  degree TEXT NOT NULL,
  
  -- Mentorship Details
  expertise_areas TEXT[] NOT NULL,
  available_hours TEXT,
  meeting_formats TEXT[],
  preferred_days TEXT[],
  
  -- Social Links
  linkedin_url TEXT,
  
  -- Application
  why_mentor TEXT NOT NULL, -- Why they want to be a mentor
  what_offer TEXT NOT NULL, -- What they can offer to mentees
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create mentor_requests table (anyone requesting mentorship)
CREATE TABLE IF NOT EXISTS public.mentor_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  mentor_id UUID REFERENCES public.alumni_mentors(id) ON DELETE CASCADE,
  mentee_id UUID REFERENCES auth.users(id),
  
  -- Request Details
  mentee_name TEXT NOT NULL,
  mentee_email TEXT NOT NULL,
  mentee_phone TEXT,
  current_status TEXT, -- e.g., "Student", "Recent Graduate", "Young Professional", "Career Changer"
  areas_of_interest TEXT[], -- What they want help with
  message TEXT NOT NULL, -- Why they're reaching out
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
  mentor_response TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.alumni_mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_requests ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for alumni_mentors

-- Anyone can view approved mentors
DROP POLICY IF EXISTS "Anyone can view approved mentors" ON public.alumni_mentors;
CREATE POLICY "Anyone can view approved mentors"
  ON public.alumni_mentors
  FOR SELECT
  USING (status = 'approved');

-- Admins can view all mentors
DROP POLICY IF EXISTS "Admins can view all mentors" ON public.alumni_mentors;
CREATE POLICY "Admins can view all mentors"
  ON public.alumni_mentors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role IN ('admin', 'staff'))
    )
  );

-- Admins can insert mentors
DROP POLICY IF EXISTS "Admins can insert mentors" ON public.alumni_mentors;
CREATE POLICY "Admins can insert mentors"
  ON public.alumni_mentors
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role IN ('admin', 'staff'))
    )
  );

-- Admins can update mentors
DROP POLICY IF EXISTS "Admins can update mentors" ON public.alumni_mentors;
CREATE POLICY "Admins can update mentors"
  ON public.alumni_mentors
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role IN ('admin', 'staff'))
    )
  );

-- Admins can delete mentors
DROP POLICY IF EXISTS "Admins can delete mentors" ON public.alumni_mentors;
CREATE POLICY "Admins can delete mentors"
  ON public.alumni_mentors
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role IN ('admin', 'staff'))
    )
  );

-- 6. RLS Policies for mentor_applications

-- Anyone authenticated can submit mentor application
DROP POLICY IF EXISTS "Authenticated users can submit application" ON public.mentor_applications;
CREATE POLICY "Authenticated users can submit application"
  ON public.mentor_applications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can view their own mentor applications
DROP POLICY IF EXISTS "Users can view own applications" ON public.mentor_applications;
CREATE POLICY "Users can view own applications"
  ON public.mentor_applications
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all applications
DROP POLICY IF EXISTS "Admins can view all applications" ON public.mentor_applications;
CREATE POLICY "Admins can view all applications"
  ON public.mentor_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role IN ('admin', 'staff'))
    )
  );

-- Admins can update applications
DROP POLICY IF EXISTS "Admins can update applications" ON public.mentor_applications;
CREATE POLICY "Admins can update applications"
  ON public.mentor_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role IN ('admin', 'staff'))
    )
  );

-- 7. RLS Policies for mentor_requests

-- Authenticated users can submit mentorship requests
DROP POLICY IF EXISTS "Authenticated users can submit requests" ON public.mentor_requests;
CREATE POLICY "Authenticated users can submit requests"
  ON public.mentor_requests
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can view their own mentorship requests
DROP POLICY IF EXISTS "Users can view own requests" ON public.mentor_requests;
CREATE POLICY "Users can view own requests"
  ON public.mentor_requests
  FOR SELECT
  USING (mentee_id = auth.uid());

-- Admins can view all requests
DROP POLICY IF EXISTS "Admins can view all requests" ON public.mentor_requests;
CREATE POLICY "Admins can view all requests"
  ON public.mentor_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role IN ('admin', 'staff'))
    )
  );

-- Admins can update requests
DROP POLICY IF EXISTS "Admins can update requests" ON public.mentor_requests;
CREATE POLICY "Admins can update requests"
  ON public.mentor_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role IN ('admin', 'staff'))
    )
  );

-- 8. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alumni_mentors TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.mentor_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.mentor_requests TO authenticated;

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alumni_mentors_status ON public.alumni_mentors(status);
CREATE INDEX IF NOT EXISTS idx_alumni_mentors_industry ON public.alumni_mentors(industry);
CREATE INDEX IF NOT EXISTS idx_mentor_applications_status ON public.mentor_applications(status);
CREATE INDEX IF NOT EXISTS idx_mentor_applications_user_id ON public.mentor_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_mentor_id ON public.mentor_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_mentee_id ON public.mentor_requests(mentee_id);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_status ON public.mentor_requests(status);

-- 10. Insert sample data (optional)
INSERT INTO public.alumni_mentors (
  full_name,
  email,
  phone,
  profile_photo_url,
  current_title,
  company,
  industry,
  years_of_experience,
  graduation_year,
  degree,
  expertise_areas,
  available_hours,
  meeting_formats,
  preferred_days,
  linkedin_url,
  short_bio,
  detailed_bio,
  mentorship_philosophy,
  status,
  application_type
) VALUES 
(
  'Dr. Kwame Mensah',
  'kwame.mensah@example.com',
  '+233 24 123 4567',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
  'Chief Technology Officer at MTN Ghana',
  'MTN Ghana',
  'Technology',
  15,
  2008,
  'BSc Computer Science',
  ARRAY['Career Guidance', 'Technical Skills', 'Leadership', 'Entrepreneurship'],
  '5-10 hours/month',
  ARRAY['Video Call', 'In-Person', 'Email'],
  ARRAY['Weekdays', 'Evenings'],
  'https://linkedin.com/in/kwamemensah',
  'CTO with 15+ years experience in tech leadership and innovation across Africa',
  'I started my journey at Achimota School and pursued Computer Science. Over the years, I''ve led technology teams at multinational companies and startups. I''m passionate about nurturing the next generation of African tech leaders.',
  'I believe in giving back. The mentors who guided me early in my career made all the difference. Now it''s my turn to help young minds navigate their professional journey.',
  'approved',
  'admin_added'
),
(
  'Ama Asante',
  'ama.asante@example.com',
  '+233 20 987 6543',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
  'Managing Partner at Asante & Co Law Firm',
  'Asante & Co',
  'Law',
  12,
  2011,
  'LLB Law',
  ARRAY['Career Guidance', 'Law & Legal', 'Public Speaking', 'Networking'],
  '3-5 hours/month',
  ARRAY['Video Call', 'Phone'],
  ARRAY['Weekends'],
  'https://linkedin.com/in/amaasante',
  'Corporate lawyer specializing in business law and advocacy for women in law',
  'After graduating with top honors, I built a successful law practice focused on helping startups and small businesses navigate legal complexities. I''m deeply committed to mentoring young women entering the legal profession.',
  'Mentorship changed my life. A senior lawyer took me under her wing and showed me that success and integrity can coexist. I want to be that person for others.',
  'approved',
  'admin_added'
);

-- 11. Verify setup
DO $$
DECLARE
  mentors_count INTEGER;
  applications_count INTEGER;
  policies_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mentors_count FROM public.alumni_mentors;
  SELECT COUNT(*) INTO applications_count FROM public.mentor_applications;
  SELECT COUNT(*) INTO policies_count FROM pg_policies WHERE tablename IN ('alumni_mentors', 'mentor_applications', 'mentor_requests');
  
  RAISE NOTICE '✅ Alumni Mentors System Setup Complete';
  RAISE NOTICE '📊 Mentors: %', mentors_count;
  RAISE NOTICE '📝 Applications: %', applications_count;
  RAISE NOTICE '🔐 RLS Policies: %', policies_count;
END $$;
