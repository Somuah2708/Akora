-- Create saved_listings table for users to bookmark marketplace items
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS saved_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES products_services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_saved_listings_user_id ON saved_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_listings_listing_id ON saved_listings(listing_id);
CREATE INDEX IF NOT EXISTS idx_saved_listings_created_at ON saved_listings(created_at DESC);

-- Enable Row Level Security
ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own saved listings
CREATE POLICY "Users can view their own saved listings"
  ON saved_listings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can save listings
CREATE POLICY "Users can save listings"
  ON saved_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unsave their own listings
CREATE POLICY "Users can delete their own saved listings"
  ON saved_listings FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE saved_listings IS 'Stores user bookmarked/saved marketplace listings';
