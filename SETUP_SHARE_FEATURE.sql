-- Create post_shares table for tracking shared posts
-- Run this in Supabase SQL Editor

-- Check if table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'post_shares'
);

-- Create post_shares table if it doesn't exist
CREATE TABLE IF NOT EXISTS post_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS post_shares_post_id_idx ON post_shares(post_id);
CREATE INDEX IF NOT EXISTS post_shares_user_id_idx ON post_shares(user_id);
CREATE INDEX IF NOT EXISTS post_shares_created_at_idx ON post_shares(created_at DESC);

-- Enable Row Level Security
ALTER TABLE post_shares ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop existing ones first to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view shares" ON post_shares;
DROP POLICY IF EXISTS "Authenticated users can create shares" ON post_shares;

CREATE POLICY "Anyone can view shares"
  ON post_shares FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create shares"
  ON post_shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add post_id column to messages table if it doesn't exist
-- This allows messages to reference shared posts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'post_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN post_id UUID REFERENCES posts(id) ON DELETE SET NULL;
    CREATE INDEX messages_post_id_idx ON messages(post_id);
  END IF;
END $$;

-- Verify setup
SELECT 
  'Tables created' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'post_shares') as post_shares_exists,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'post_id') as messages_post_id_exists;

-- Expected output:
-- status           | post_shares_exists | messages_post_id_exists
-- Tables created   | 1                  | 1

-- ================================================
-- OPTIONAL: View share statistics
-- ================================================

-- Get posts with most shares
SELECT 
  p.id,
  p.content,
  COUNT(ps.id) as share_count,
  prof.full_name as author
FROM posts p
LEFT JOIN post_shares ps ON p.id = ps.post_id
LEFT JOIN profiles prof ON p.user_id = prof.id
GROUP BY p.id, p.content, prof.full_name
ORDER BY share_count DESC
LIMIT 10;

-- ================================================
-- SUCCESS! Share feature is ready to use!
-- ================================================
