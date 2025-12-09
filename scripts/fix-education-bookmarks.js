const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://eclpduejlabiazblkvgh.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ EXPO_PUBLIC_SUPABASE_ANON_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixEducationBookmarks() {
  console.log('🔧 Fixing education_bookmarks table schema...\n');
  
  try {
    // Note: We can't drop and recreate tables via the anon key
    // Instead, we'll provide instructions for the user to run this SQL in Supabase dashboard
    
    console.log('📋 SQL Migration Required:');
    console.log('='.repeat(60));
    console.log(`
-- Run this SQL in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/eclpduejlabiazblkvgh/sql

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
    `);
    console.log('='.repeat(60));
    console.log('\n✅ Copy the SQL above and run it in your Supabase dashboard');
    console.log('📍 URL: https://supabase.com/dashboard/project/eclpduejlabiazblkvgh/sql\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixEducationBookmarks();
