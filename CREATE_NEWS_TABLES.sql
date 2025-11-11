-- News Bookmarks Table
CREATE TABLE IF NOT EXISTS news_bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,
  article_data JSONB NOT NULL,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

-- News Reading History Table
CREATE TABLE IF NOT EXISTS news_reading_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,
  article_data JSONB NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_progress INTEGER DEFAULT 0, -- 0-100
  read_duration INTEGER DEFAULT 0, -- in seconds
  shared_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, article_id)
);

-- News Likes Table
CREATE TABLE IF NOT EXISTS news_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

-- News Preferences Table
CREATE TABLE IF NOT EXISTS news_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  favorite_categories TEXT[] DEFAULT '{}',
  muted_sources TEXT[] DEFAULT '{}',
  notifications_enabled BOOLEAN DEFAULT true,
  breaking_news_alerts BOOLEAN DEFAULT true,
  font_size TEXT DEFAULT 'medium', -- small, medium, large
  dark_mode_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE news_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_reading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for news_bookmarks
CREATE POLICY "Users can view their own bookmarks"
  ON news_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
  ON news_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON news_bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for news_reading_history
CREATE POLICY "Users can view their own reading history"
  ON news_reading_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reading history"
  ON news_reading_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading history"
  ON news_reading_history FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for news_likes
CREATE POLICY "Users can view their own likes"
  ON news_likes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own likes"
  ON news_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON news_likes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for news_preferences
CREATE POLICY "Users can view their own preferences"
  ON news_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences"
  ON news_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON news_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_news_bookmarks_user_id ON news_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_news_bookmarks_article_id ON news_bookmarks(article_id);
CREATE INDEX IF NOT EXISTS idx_news_bookmarks_created_at ON news_bookmarks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_news_reading_history_user_id ON news_reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_news_reading_history_article_id ON news_reading_history(article_id);
CREATE INDEX IF NOT EXISTS idx_news_reading_history_read_at ON news_reading_history(read_at DESC);

CREATE INDEX IF NOT EXISTS idx_news_likes_user_id ON news_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_news_likes_article_id ON news_likes(article_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for news_preferences
CREATE TRIGGER update_news_preferences_updated_at
  BEFORE UPDATE ON news_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
