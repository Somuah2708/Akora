-- ============================================
-- CRITICAL: Run this SQL in your Supabase SQL Editor NOW
-- ============================================
-- This adds the required columns for the enhanced chat features
-- Go to: Supabase Dashboard > SQL Editor > New Query > Paste & Run

-- Add columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;

-- Add columns to direct_messages table
ALTER TABLE direct_messages 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen);
CREATE INDEX IF NOT EXISTS idx_direct_messages_read_at ON direct_messages(read_at);
CREATE INDEX IF NOT EXISTS idx_direct_messages_delivered_at ON direct_messages(delivered_at);

-- Verify the columns were created
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('last_seen', 'is_online');

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'direct_messages' 
AND column_name IN ('read_at', 'delivered_at');
