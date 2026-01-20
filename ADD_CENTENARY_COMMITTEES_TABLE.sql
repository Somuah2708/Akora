-- =====================================================
-- Centenary Committees Table
-- =====================================================
-- This migration creates a table for managing centenary
-- committees dynamically from the database
-- =====================================================

-- Table for Centenary Committees
CREATE TABLE IF NOT EXISTS centenary_committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  db_name TEXT NOT NULL, -- e.g., 'Memorabilia Committee' for matching with circles
  description TEXT,
  icon_name TEXT DEFAULT 'Users', -- Lucide icon name
  color TEXT DEFAULT '#EDE9FE', -- Background color for the card
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE centenary_committees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for centenary_committees
-- Anyone can read active committees
CREATE POLICY "Anyone can read active centenary committees"
ON centenary_committees FOR SELECT
USING (is_active = true);

-- Only admins can insert committees
CREATE POLICY "Admins can insert centenary committees"
ON centenary_committees FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Only admins can update committees
CREATE POLICY "Admins can update centenary committees"
ON centenary_committees FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Only admins can delete committees
CREATE POLICY "Admins can delete centenary committees"
ON centenary_committees FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_centenary_committees_active ON centenary_committees(is_active);
CREATE INDEX IF NOT EXISTS idx_centenary_committees_sort ON centenary_committees(sort_order);
CREATE INDEX IF NOT EXISTS idx_centenary_committees_db_name ON centenary_committees(db_name);

-- Insert default committees (same as current hardcoded data)
INSERT INTO centenary_committees (name, db_name, description, icon_name, color, sort_order) VALUES
('Memorabilia', 'Memorabilia Committee', 'Preserving Achimota''s rich history and heritage through archives and exhibitions', 'Archive', '#EDE9FE', 1),
('Publicity', 'Publicity Committee', 'Global media coverage and social campaigns for the centenary', 'Radio', '#ECFDF5', 2),
('Health Walks', 'Health Walks Committee', 'Wellness activities, campus tours, and fitness challenges', 'Heart', '#FFF7ED', 3),
('Historical Documentation', 'Historical Documentation Committee', 'Archive preservation and video documentation', 'FileText', '#EFF6FF', 4),
('Health Walks II', 'Health Walks II Committee', 'Extended wellness programs across regions', 'Footprints', '#FFF7ED', 5),
('Achimota Subjugates', 'Achimota Subjugates Committee', 'Sports tournaments and athletic competitions', 'Trophy', '#F0FDF4', 6),
('Sports', 'Sports Committee', 'Inter-school competitions and sports galas', 'Target', '#FAF5FF', 7),
('Homecoming', 'Homecoming Committee', 'Alumni reunions and networking sessions', 'Home', '#EFF6FF', 8),
('Finance', 'Finance Committee', 'Fundraising, budgeting, and sponsor relations', 'Wallet', '#EDE9FE', 9),
('Gambaga to Accra', 'Gambaga to Accra Committee', 'Heritage tours and historical journey documentation', 'Compass', '#F0FDF4', 10),
('Achimota Speaks', 'Achimota Speaks Committee', 'Lectures, seminars, and panel discussions', 'Mic', '#EFF6FF', 11),
('Year Group Celebrations', 'Year Group Celebrations Committee', 'Year group events and reunion celebrations', 'Gift', '#FFF7ED', 12),
('Opera and Drama', 'Opera and Drama Committee', 'Theatrical productions and cultural performances', 'Music', '#ECFDF5', 13),
('Centenary Planning', 'Centenary Planning Committee', 'Central coordination of all centenary activities', 'ClipboardCheck', '#EDE9FE', 14);
