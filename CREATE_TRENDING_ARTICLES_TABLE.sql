-- Create trending_articles table for alumni association news and updates
-- This stores rich content that appears in the trending cards on home screen

CREATE TABLE IF NOT EXISTS trending_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  summary TEXT, -- Short description for the card preview
  image_url TEXT NOT NULL,
  article_content TEXT, -- Rich HTML/markdown content for full article view
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  category TEXT, -- e.g., 'alumni_news', 'events', 'achievements', 'announcements'
  link_url TEXT, -- Optional external link
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false, -- Whether to show in trending carousel
  view_count INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_trending_articles_active ON trending_articles(is_active, is_featured, order_index);
CREATE INDEX IF NOT EXISTS idx_trending_articles_published ON trending_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_articles_author ON trending_articles(author_id);

-- Enable Row Level Security
ALTER TABLE trending_articles ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active articles
CREATE POLICY "Anyone can view active trending articles"
  ON trending_articles
  FOR SELECT
  USING (is_active = true);

-- Policy: Admins can do everything
CREATE POLICY "Admins can manage trending articles"
  ON trending_articles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role = 'admin')
    )
  );

-- Create storage bucket for trending article images
INSERT INTO storage.buckets (id, name, public)
VALUES ('trending-articles', 'trending-articles', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to view images
CREATE POLICY "Public Access for trending article images"
ON storage.objects FOR SELECT
USING (bucket_id = 'trending-articles');

-- Allow authenticated admins to upload images
CREATE POLICY "Admins can upload trending article images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'trending-articles' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.is_admin = true OR profiles.role = 'admin')
  )
);

-- Allow authenticated admins to update images
CREATE POLICY "Admins can update trending article images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'trending-articles'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.is_admin = true OR profiles.role = 'admin')
  )
);

-- Allow authenticated admins to delete images
CREATE POLICY "Admins can delete trending article images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'trending-articles'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.is_admin = true OR profiles.role = 'admin')
  )
);

-- Function to track article views
CREATE OR REPLACE FUNCTION increment_article_view_count(article_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE trending_articles
  SET view_count = view_count + 1
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql;

-- Insert sample trending articles for alumni association
INSERT INTO trending_articles (title, subtitle, summary, image_url, article_content, category, is_featured, order_index) VALUES
(
  'Annual Alumni Homecoming 2025',
  'Join us for a memorable reunion',
  'Mark your calendars! Our annual homecoming celebration brings together generations of alumni.',
  'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop&q=60',
  '<h2>Welcome Home, Akoras!</h2><p>We''re thrilled to invite all alumni to our Annual Homecoming 2025. This year promises to be our biggest celebration yet, with special activities planned for every generation.</p><h3>Event Highlights</h3><ul><li>Grand Reunion Dinner</li><li>Campus Tour & Nostalgia Walk</li><li>Alumni Awards Ceremony</li><li>Sports & Games</li><li>Live Music & Entertainment</li></ul><p><strong>Date:</strong> December 15-17, 2025<br><strong>Venue:</strong> School Campus<br><strong>Registration:</strong> Open until December 1st</p>',
  'events',
  true,
  1
),
(
  'Alumni Scholarship Fund Reaches $1M',
  'Supporting the next generation',
  'Thanks to generous contributions from our alumni community, we''ve reached a major milestone.',
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=60',
  '<h2>A Historic Achievement</h2><p>We are proud to announce that the Alumni Scholarship Fund has officially surpassed $1 million in total contributions. This incredible milestone is a testament to the generosity and commitment of our alumni community.</p><h3>Impact by the Numbers</h3><ul><li>Over 200 students supported since inception</li><li>Average scholarship: $5,000 per student</li><li>100% graduation rate among scholarship recipients</li></ul><p>Your continued support changes lives and builds futures. Thank you to every donor who has contributed to this success.</p>',
  'achievements',
  true,
  2
),
(
  'Mentorship Program Launch',
  'Connect, Guide, Inspire',
  'New initiative pairs experienced alumni with current students for career guidance and support.',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=60',
  '<h2>Building Bridges Between Generations</h2><p>The Old Students Association is excited to launch our new Alumni Mentorship Program. This initiative connects accomplished alumni professionals with current students seeking guidance in their career journeys.</p><h3>Program Benefits</h3><ul><li>One-on-one mentorship matching</li><li>Monthly networking events</li><li>Career workshops and webinars</li><li>Job shadowing opportunities</li></ul><p><strong>How to Participate:</strong></p><p>Alumni can register as mentors through the app. Students can apply for mentorship starting next month. Together, we''re building a stronger, more connected community.</p>',
  'alumni_news',
  true,
  3
);

COMMENT ON TABLE trending_articles IS 'Stores trending news, articles, and updates for the alumni association home screen';
