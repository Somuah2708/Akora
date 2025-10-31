-- Migration: Create news table for News Daily section
CREATE TABLE IF NOT EXISTS news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  content text,
  image_url text,
  category text NOT NULL,
  author_id uuid REFERENCES profiles(id),
  published_at timestamptz DEFAULT now(),
  is_approved boolean DEFAULT false,
  external_link text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at);
CREATE INDEX IF NOT EXISTS idx_news_is_approved ON news(is_approved);
