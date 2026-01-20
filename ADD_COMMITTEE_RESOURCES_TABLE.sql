-- =====================================================
-- CENTENARY COMMITTEE RESOURCES TABLE
-- =====================================================
-- Run this if centenary_committee_resources table doesn't exist yet
-- =====================================================

-- Create the resources table
CREATE TABLE IF NOT EXISTS centenary_committee_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES centenary_committees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'document' CHECK (category IN ('document', 'link')),
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES profiles(id),
  download_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE centenary_committee_resources ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (makes it safe to re-run)
DROP POLICY IF EXISTS "Anyone can view active resources" ON centenary_committee_resources;
DROP POLICY IF EXISTS "Committee admins can insert resources" ON centenary_committee_resources;
DROP POLICY IF EXISTS "Committee admins can update resources" ON centenary_committee_resources;
DROP POLICY IF EXISTS "Committee admins can delete resources" ON centenary_committee_resources;

-- RLS Policies for resources
CREATE POLICY "Anyone can view active resources"
ON centenary_committee_resources FOR SELECT
USING (is_active = true);

CREATE POLICY "Committee admins can insert resources"
ON centenary_committee_resources FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM centenary_committee_members ccm
    WHERE ccm.committee_id = centenary_committee_resources.committee_id
    AND ccm.user_id = auth.uid()
    AND ccm.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Committee admins can update resources"
ON centenary_committee_resources FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM centenary_committee_members ccm
    WHERE ccm.committee_id = centenary_committee_resources.committee_id
    AND ccm.user_id = auth.uid()
    AND ccm.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Committee admins can delete resources"
ON centenary_committee_resources FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM centenary_committee_members ccm
    WHERE ccm.committee_id = centenary_committee_resources.committee_id
    AND ccm.user_id = auth.uid()
    AND ccm.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_resources_committee ON centenary_committee_resources(committee_id);
