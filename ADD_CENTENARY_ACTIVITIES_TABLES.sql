-- =====================================================
-- Centenary Activities & Milestones Tables
-- =====================================================
-- This migration creates tables for managing centenary
-- activities/preparation items and road to 2027 milestones
-- =====================================================

-- Table for Activities & Preparation section
CREATE TABLE IF NOT EXISTS centenary_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  activity_date DATE,
  month TEXT, -- e.g., 'Jan', 'Feb', etc.
  year INTEGER, -- e.g., 2026, 2027
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table for Road to 2027 milestones
CREATE TABLE IF NOT EXISTS centenary_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  milestone_date TEXT, -- e.g., 'Q1 2026', 'Q2 2026', '2027'
  sort_order INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE centenary_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE centenary_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for centenary_activities
-- Anyone can read active activities
CREATE POLICY "Anyone can read active centenary activities"
ON centenary_activities FOR SELECT
USING (is_active = true);

-- Only admins can insert activities
CREATE POLICY "Admins can insert centenary activities"
ON centenary_activities FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM alumni 
    WHERE alumni.id = auth.uid() 
    AND alumni.is_admin = true
  )
);

-- Only admins can update activities
CREATE POLICY "Admins can update centenary activities"
ON centenary_activities FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM alumni 
    WHERE alumni.id = auth.uid() 
    AND alumni.is_admin = true
  )
);

-- Only admins can delete activities
CREATE POLICY "Admins can delete centenary activities"
ON centenary_activities FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM alumni 
    WHERE alumni.id = auth.uid() 
    AND alumni.is_admin = true
  )
);

-- RLS Policies for centenary_milestones
-- Anyone can read active milestones
CREATE POLICY "Anyone can read active centenary milestones"
ON centenary_milestones FOR SELECT
USING (is_active = true);

-- Only admins can insert milestones
CREATE POLICY "Admins can insert centenary milestones"
ON centenary_milestones FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM alumni 
    WHERE alumni.id = auth.uid() 
    AND alumni.is_admin = true
  )
);

-- Only admins can update milestones
CREATE POLICY "Admins can update centenary milestones"
ON centenary_milestones FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM alumni 
    WHERE alumni.id = auth.uid() 
    AND alumni.is_admin = true
  )
);

-- Only admins can delete milestones
CREATE POLICY "Admins can delete centenary milestones"
ON centenary_milestones FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM alumni 
    WHERE alumni.id = auth.uid() 
    AND alumni.is_admin = true
  )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_centenary_activities_active ON centenary_activities(is_active);
CREATE INDEX IF NOT EXISTS idx_centenary_activities_sort ON centenary_activities(sort_order);
CREATE INDEX IF NOT EXISTS idx_centenary_milestones_active ON centenary_milestones(is_active);
CREATE INDEX IF NOT EXISTS idx_centenary_milestones_sort ON centenary_milestones(sort_order);

-- Insert default activities (same as current hardcoded data)
INSERT INTO centenary_activities (title, description, month, year, sort_order) VALUES
('Committee Onboarding', 'Kick-off workshops and alignment sessions for all centenary committees', 'Jan', 2026, 1),
('Sponsorship Drive', 'Launch official sponsor packages and partnership opportunities', 'Apr', 2026, 2),
('Heritage Exhibition Prep', 'Curation and archival digitization of historical materials', 'Aug', 2026, 3),
('Volunteers Recruitment', 'Campus and alumni volunteer recruitment and training', 'Nov', 2026, 4),
('Centenary Gala', 'Flagship celebration night marking 100 years of Achimota', 'Mar', 2027, 5);

-- Insert default milestones (same as current hardcoded data)
INSERT INTO centenary_milestones (title, description, milestone_date, sort_order) VALUES
('Committee onboarding & scopes', 'Formation and scope definition for all centenary committees', 'Q1 2026', 1),
('Sponsorship packages & partnerships', 'Finalize sponsor tiers and secure corporate partnerships', 'Q2 2026', 2),
('Media campaign & heritage curation', 'Launch media campaigns and curate heritage materials', 'Q3 2026', 3),
('Volunteer training & logistics checks', 'Train volunteers and finalize event logistics', 'Q4 2026', 4),
('Centenary celebrations', 'Main centenary celebration events and activities', '2027', 5);
