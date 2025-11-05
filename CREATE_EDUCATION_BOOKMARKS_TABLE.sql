-- =====================================================
-- EDUCATION BOOKMARKS TABLE
-- For saving universities and scholarships
-- =====================================================

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS education_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  opportunity_id UUID REFERENCES products_services(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, opportunity_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_education_bookmarks_user_id ON education_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_education_bookmarks_opportunity_id ON education_bookmarks(opportunity_id);

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
COMMENT ON TABLE education_bookmarks IS 'Stores user bookmarks for universities and scholarships';
