-- Enhanced Articles System Migration
-- Adds expanded categories, favorites, publisher roles, and reading features

-- =====================================================
-- 1. ADD NEW COLUMNS TO TRENDING_ARTICLES TABLE
-- =====================================================

-- Add new columns for enhanced article functionality
ALTER TABLE trending_articles 
ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS source_name TEXT,
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'GH';

-- Update category to allow more diverse content
COMMENT ON COLUMN trending_articles.category IS 'Categories: school_news, alumni_news, events, sports, achievements, ghana_news, international, business, technology, lifestyle, opinion, education, health';

-- =====================================================
-- 2. CREATE ARTICLE FAVORITES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS article_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES trending_articles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

-- Enable RLS
ALTER TABLE article_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for article_favorites
CREATE POLICY "Users can view their own favorites"
  ON article_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
  ON article_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their favorites"
  ON article_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_article_favorites_user ON article_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_article_favorites_article ON article_favorites(article_id);
CREATE INDEX IF NOT EXISTS idx_article_favorites_created ON article_favorites(created_at DESC);

-- =====================================================
-- 3. CREATE ARTICLE LIKES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS article_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES trending_articles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

-- Enable RLS
ALTER TABLE article_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view article likes"
  ON article_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like articles"
  ON article_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike articles"
  ON article_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_article_likes_user ON article_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_article_likes_article ON article_likes(article_id);

-- =====================================================
-- 4. CREATE READING HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS article_reading_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES trending_articles(id) ON DELETE CASCADE,
  read_progress REAL DEFAULT 0, -- 0.0 to 1.0 (percentage read)
  time_spent_seconds INTEGER DEFAULT 0,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

-- Enable RLS
ALTER TABLE article_reading_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own reading history"
  ON article_reading_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add reading history"
  ON article_reading_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their reading history"
  ON article_reading_history FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reading_history_user ON article_reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_article ON article_reading_history(article_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_last_read ON article_reading_history(last_read_at DESC);

-- =====================================================
-- 5. ADD ARTICLE PUBLISHER ROLE TO PROFILES
-- =====================================================

-- Add column to profiles for article publishing privileges
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS can_publish_articles BOOLEAN DEFAULT false;

COMMENT ON COLUMN profiles.can_publish_articles IS 'Allows non-admin users to publish articles. Set by admins in Supabase dashboard.';

-- =====================================================
-- 6. UPDATE ARTICLE POLICIES FOR PUBLISHERS
-- =====================================================

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admins can manage trending articles" ON trending_articles;

-- Create new policy for admins AND publishers
CREATE POLICY "Admins and publishers can manage articles"
  ON trending_articles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.is_admin = true 
        OR profiles.role = 'admin'
        OR profiles.can_publish_articles = true
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.is_admin = true 
        OR profiles.role = 'admin'
        OR profiles.can_publish_articles = true
      )
    )
  );

-- Update storage policies for publishers
DROP POLICY IF EXISTS "Admins can upload trending article images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update trending article images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete trending article images" ON storage.objects;

CREATE POLICY "Admins and publishers can upload article images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'trending-articles' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.is_admin = true 
      OR profiles.role = 'admin'
      OR profiles.can_publish_articles = true
    )
  )
);

CREATE POLICY "Admins and publishers can update article images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'trending-articles'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.is_admin = true 
      OR profiles.role = 'admin'
      OR profiles.can_publish_articles = true
    )
  )
);

CREATE POLICY "Admins and publishers can delete article images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'trending-articles'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.is_admin = true 
      OR profiles.role = 'admin'
      OR profiles.can_publish_articles = true
    )
  )
);

-- =====================================================
-- 7. CREATE ARTICLE COMMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS article_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES trending_articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES article_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view comments"
  ON article_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can post comments"
  ON article_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON article_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON article_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_article_comments_article ON article_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_user ON article_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_parent ON article_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_created ON article_comments(created_at DESC);

-- =====================================================
-- 8. CREATE ARTICLE CATEGORIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS article_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT, -- lucide icon name
  color TEXT, -- hex color for UI
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE article_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON article_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage categories"
  ON article_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role = 'admin')
    )
  );

-- Insert default categories
INSERT INTO article_categories (name, display_name, description, icon_name, color, order_index) VALUES
  ('all', 'All', 'All articles', 'Newspaper', '#6B7280', 0),
  ('school_news', 'School News', 'Latest news from the school', 'GraduationCap', '#3B82F6', 1),
  ('alumni_news', 'Alumni News', 'Updates from the alumni community', 'Users', '#8B5CF6', 2),
  ('events', 'Events', 'Upcoming and past events', 'Calendar', '#EC4899', 3),
  ('achievements', 'Achievements', 'Success stories and accomplishments', 'Trophy', '#F59E0B', 4),
  ('sports', 'Sports', 'Sports news and updates', 'Trophy', '#10B981', 5),
  ('ghana_news', 'Ghana News', 'National news from Ghana', 'MapPin', '#EF4444', 6),
  ('international', 'International', 'World news and global affairs', 'Globe', '#06B6D4', 7),
  ('business', 'Business', 'Business and finance news', 'Briefcase', '#84CC16', 8),
  ('technology', 'Technology', 'Tech news and innovations', 'Cpu', '#6366F1', 9),
  ('lifestyle', 'Lifestyle', 'Lifestyle, culture, and entertainment', 'Heart', '#F472B6', 10),
  ('opinion', 'Opinion', 'Editorials and opinion pieces', 'MessageSquare', '#FB923C', 11),
  ('education', 'Education', 'Educational content and resources', 'BookOpen', '#14B8A6', 12),
  ('health', 'Health', 'Health and wellness articles', 'Activity', '#22C55E', 13)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 9. FUNCTIONS FOR ARTICLE STATS
-- =====================================================

-- Function to increment like count
CREATE OR REPLACE FUNCTION increment_article_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE trending_articles
  SET like_count = COALESCE(like_count, 0) + 1
  WHERE id = NEW.article_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement like count
CREATE OR REPLACE FUNCTION decrement_article_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE trending_articles
  SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
  WHERE id = OLD.article_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to increment comment count
CREATE OR REPLACE FUNCTION increment_article_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE trending_articles
  SET comment_count = COALESCE(comment_count, 0) + 1
  WHERE id = NEW.article_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement comment count
CREATE OR REPLACE FUNCTION decrement_article_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE trending_articles
  SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0)
  WHERE id = OLD.article_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS on_article_like_insert ON article_likes;
CREATE TRIGGER on_article_like_insert
  AFTER INSERT ON article_likes
  FOR EACH ROW EXECUTE FUNCTION increment_article_like_count();

DROP TRIGGER IF EXISTS on_article_like_delete ON article_likes;
CREATE TRIGGER on_article_like_delete
  AFTER DELETE ON article_likes
  FOR EACH ROW EXECUTE FUNCTION decrement_article_like_count();

DROP TRIGGER IF EXISTS on_article_comment_insert ON article_comments;
CREATE TRIGGER on_article_comment_insert
  AFTER INSERT ON article_comments
  FOR EACH ROW EXECUTE FUNCTION increment_article_comment_count();

DROP TRIGGER IF EXISTS on_article_comment_delete ON article_comments;
CREATE TRIGGER on_article_comment_delete
  AFTER DELETE ON article_comments
  FOR EACH ROW EXECUTE FUNCTION decrement_article_comment_count();

-- =====================================================
-- 10. INSERT SAMPLE ARTICLES FOR DIVERSE CATEGORIES
-- =====================================================

INSERT INTO trending_articles (
  title, subtitle, summary, image_url, article_content, category, 
  reading_time_minutes, tags, is_featured, order_index
) VALUES
(
  'Ghana''s Economy Shows Strong Recovery Signs',
  'GDP growth exceeds expectations in Q4',
  'Ghana''s economic indicators are showing promising signs of recovery with GDP growth surpassing analyst predictions.',
  'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&auto=format&fit=crop&q=60',
  '<h2>Economic Recovery Gains Momentum</h2><p>Ghana''s economy has demonstrated remarkable resilience, with the latest quarterly data showing GDP growth of 4.2%, exceeding most analyst expectations. The recovery is being driven by strong performance in the services sector and improved agricultural output.</p><h3>Key Highlights</h3><ul><li>Services sector grew by 5.1%</li><li>Agriculture sector expanded by 3.8%</li><li>Inflation rates stabilizing</li><li>Foreign investment increasing</li></ul><p>Economists are cautiously optimistic about the trajectory, noting that structural reforms and fiscal discipline have contributed to the positive outlook.</p>',
  'ghana_news',
  4,
  ARRAY['economy', 'ghana', 'gdp', 'recovery'],
  false,
  10
),
(
  'Tech Giants Announce New AI Partnership',
  'Collaboration aims to advance responsible AI development',
  'Major technology companies join forces to establish new standards for ethical artificial intelligence development.',
  'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop&q=60',
  '<h2>A New Era of AI Collaboration</h2><p>In an unprecedented move, leading technology companies have announced a strategic partnership focused on advancing responsible AI development. The collaboration brings together researchers, engineers, and ethicists to establish industry-wide standards.</p><h3>Partnership Goals</h3><ul><li>Develop ethical AI guidelines</li><li>Share research on AI safety</li><li>Create open-source tools for bias detection</li><li>Establish certification standards</li></ul><p>Industry experts believe this partnership marks a significant step toward ensuring AI technologies benefit society while minimizing potential risks.</p>',
  'technology',
  5,
  ARRAY['technology', 'ai', 'partnership', 'innovation'],
  true,
  11
),
(
  'African Union Summit Addresses Climate Change',
  'Continental leaders commit to green energy transition',
  'The 37th African Union Summit concluded with historic commitments to combat climate change across the continent.',
  'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=800&auto=format&fit=crop&q=60',
  '<h2>Historic Climate Commitments</h2><p>Leaders from across Africa gathered for the 37th African Union Summit, where climate change took center stage. The summit concluded with unprecedented commitments to accelerate the continent''s transition to renewable energy.</p><h3>Key Resolutions</h3><ul><li>50% renewable energy target by 2035</li><li>$100 billion green infrastructure fund</li><li>Pan-African carbon credit system</li><li>Youth climate leadership program</li></ul><p>The resolutions represent the most ambitious climate action plan ever adopted by the African Union.</p>',
  'international',
  6,
  ARRAY['africa', 'climate', 'summit', 'renewable energy'],
  false,
  12
),
(
  'Startup Ecosystem Thrives in Accra',
  'Tech hub sees record investment in 2025',
  'Accra continues to cement its position as West Africa''s leading technology and startup hub with record-breaking investments.',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&auto=format&fit=crop&q=60',
  '<h2>Accra: The Silicon Valley of West Africa</h2><p>Accra''s startup ecosystem has reached new heights, with total investments in Ghanaian startups exceeding $500 million in 2025. The city''s vibrant tech community continues to attract both local and international investors.</p><h3>Success Factors</h3><ul><li>Strong government support and policies</li><li>Growing pool of tech talent</li><li>Improved digital infrastructure</li><li>Active investor community</li></ul><p>Notable sectors seeing growth include fintech, healthtech, agritech, and edtech, with several startups achieving unicorn status.</p>',
  'business',
  5,
  ARRAY['startup', 'accra', 'technology', 'investment'],
  true,
  13
),
(
  'Wellness Trends: Mindfulness in Daily Life',
  'Simple practices for mental well-being',
  'Expert tips on incorporating mindfulness and wellness practices into your busy schedule for better mental health.',
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop&q=60',
  '<h2>Finding Peace in a Busy World</h2><p>In our increasingly connected world, finding moments of peace and mindfulness has become more important than ever. Mental health experts share practical tips for incorporating wellness practices into daily routines.</p><h3>Simple Practices</h3><ul><li>5-minute morning meditation</li><li>Mindful breathing exercises</li><li>Digital detox periods</li><li>Gratitude journaling</li><li>Nature walks</li></ul><p>Research shows that even small mindfulness practices can significantly reduce stress and improve overall well-being.</p>',
  'lifestyle',
  4,
  ARRAY['wellness', 'mindfulness', 'mental health', 'lifestyle'],
  false,
  14
),
(
  'The Future of Education in Africa',
  'How technology is transforming learning',
  'Exploring the innovative approaches reshaping education across the African continent.',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=60',
  '<h2>Education Revolution</h2><p>The education landscape in Africa is undergoing a dramatic transformation, driven by technology and innovative teaching methods. From AI-powered tutoring to virtual classrooms, new approaches are making quality education more accessible.</p><h3>Key Innovations</h3><ul><li>Mobile learning platforms</li><li>AI-assisted personalized learning</li><li>Virtual reality classrooms</li><li>Blockchain credentials</li></ul><p>These innovations are particularly impactful in rural areas, where traditional educational infrastructure may be limited.</p>',
  'education',
  6,
  ARRAY['education', 'technology', 'africa', 'innovation'],
  false,
  15
),
(
  'Opinion: Why Alumni Networks Matter',
  'Building lasting connections for success',
  'A reflection on the enduring value of maintaining strong alumni connections throughout one''s career.',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop&q=60',
  '<h2>The Power of Alumni Connections</h2><p>As someone who has benefited immensely from alumni networks, I often reflect on why these connections are so valuable. Beyond nostalgia, alumni networks provide tangible benefits that can shape careers and lives.</p><h3>Why It Matters</h3><ul><li>Access to mentorship opportunities</li><li>Professional networking</li><li>Shared values and understanding</li><li>Giving back to future generations</li></ul><p>In my experience, the relationships formed through alumni connections have been some of the most meaningful and impactful of my career.</p>',
  'opinion',
  4,
  ARRAY['alumni', 'networking', 'opinion', 'career'],
  false,
  16
);

COMMENT ON TABLE article_favorites IS 'Stores user favorite/bookmarked articles for later reading';
COMMENT ON TABLE article_likes IS 'Tracks article likes/reactions from users';
COMMENT ON TABLE article_reading_history IS 'Tracks user reading progress and history';
COMMENT ON TABLE article_comments IS 'Stores comments and replies on articles';
COMMENT ON TABLE article_categories IS 'Defines available article categories';
