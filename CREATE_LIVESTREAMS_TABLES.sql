-- =====================================================
-- LIVESTREAMS TABLES - SIMPLIFIED WORKING VERSION
-- This version works without errors in Supabase
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS stream_reminders CASCADE;
DROP TABLE IF EXISTS livestreams CASCADE;

-- 1. Main Livestreams Table (simplified)
CREATE TABLE livestreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  stream_url TEXT NOT NULL,
  host_name TEXT NOT NULL,
  category TEXT,
  is_live BOOLEAN DEFAULT FALSE,
  start_time TIMESTAMPTZ NOT NULL,
  viewer_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Stream Reminders Table (for saved streams)
CREATE TABLE stream_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stream_id UUID REFERENCES livestreams(id) ON DELETE CASCADE NOT NULL,
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, stream_id)
);

-- Enable RLS
ALTER TABLE livestreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_reminders ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies
CREATE POLICY "Anyone can view livestreams" ON livestreams FOR SELECT USING (true);
CREATE POLICY "Users can create their own streams" ON livestreams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own streams" ON livestreams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own streams" ON livestreams FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own reminders" ON stream_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own reminders" ON stream_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reminders" ON stream_reminders FOR DELETE USING (auth.uid() = user_id);

-- Insert sample data
INSERT INTO livestreams (user_id, title, description, thumbnail_url, stream_url, host_name, category, is_live, start_time, viewer_count)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'Tech Talk: React Native Best Practices',
  'Join us for an in-depth discussion about building mobile apps with React Native.',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
  'https://youtube.com/live/example123',
  'John Doe',
  'Technology',
  true,
  NOW(),
  127
);
