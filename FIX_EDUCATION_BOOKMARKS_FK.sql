-- =====================================================
-- FIX EDUCATION BOOKMARKS TABLE
-- Remove invalid FK constraint and add type column
-- =====================================================

-- Drop the existing table and recreate with proper structure
DROP TABLE IF EXISTS education_bookmarks CASCADE;

-- Recreate bookmarks table with type column instead of FK
CREATE TABLE education_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  opportunity_id UUID NOT NULL,
  opportunity_type TEXT NOT NULL CHECK (opportunity_type IN ('university', 'scholarship', 'mentor')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, opportunity_id, opportunity_type)
);

-- Create indexes for faster queries
CREATE INDEX idx_education_bookmarks_user_id ON education_bookmarks(user_id);
CREATE INDEX idx_education_bookmarks_opportunity_id ON education_bookmarks(opportunity_id);
CREATE INDEX idx_education_bookmarks_type ON education_bookmarks(opportunity_type);

-- Enable RLS
ALTER TABLE education_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own bookmarks"
  ON education_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
  ON education_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON education_bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE education_bookmarks IS 'Stores user bookmarks for universities, scholarships, and mentors';
