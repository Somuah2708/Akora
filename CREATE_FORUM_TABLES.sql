-- Create forum discussions table
CREATE TABLE IF NOT EXISTS forum_discussions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create forum comments table
CREATE TABLE IF NOT EXISTS forum_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discussion_id UUID NOT NULL REFERENCES forum_discussions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create forum attachments table (for both discussions and comments)
CREATE TABLE IF NOT EXISTS forum_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discussion_id UUID REFERENCES forum_discussions(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image' or 'document'
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT attachment_parent CHECK (
    (discussion_id IS NOT NULL AND comment_id IS NULL) OR
    (discussion_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Create forum discussion likes table
CREATE TABLE IF NOT EXISTS forum_discussion_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discussion_id UUID NOT NULL REFERENCES forum_discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(discussion_id, user_id)
);

-- Create forum comment likes table
CREATE TABLE IF NOT EXISTS forum_comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES forum_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Create forum discussion bookmarks table
CREATE TABLE IF NOT EXISTS forum_discussion_bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discussion_id UUID NOT NULL REFERENCES forum_discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(discussion_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_forum_discussions_category ON forum_discussions(category);
CREATE INDEX IF NOT EXISTS idx_forum_discussions_author ON forum_discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_discussions_created ON forum_discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_comments_discussion ON forum_comments(discussion_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_author ON forum_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_attachments_discussion ON forum_attachments(discussion_id);
CREATE INDEX IF NOT EXISTS idx_forum_attachments_comment ON forum_attachments(comment_id);
CREATE INDEX IF NOT EXISTS idx_forum_discussion_likes_discussion ON forum_discussion_likes(discussion_id);
CREATE INDEX IF NOT EXISTS idx_forum_discussion_likes_user ON forum_discussion_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_comment_likes_comment ON forum_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_forum_comment_likes_user ON forum_comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_discussion_bookmarks_user ON forum_discussion_bookmarks(user_id);

-- Enable Row Level Security
ALTER TABLE forum_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_discussion_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_discussion_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forum_discussions
CREATE POLICY "Anyone can view discussions" ON forum_discussions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create discussions" ON forum_discussions
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their discussions" ON forum_discussions
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their discussions" ON forum_discussions
  FOR DELETE USING (auth.uid() = author_id);

-- RLS Policies for forum_comments
CREATE POLICY "Anyone can view comments" ON forum_comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON forum_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their comments" ON forum_comments
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their comments" ON forum_comments
  FOR DELETE USING (auth.uid() = author_id);

-- RLS Policies for forum_attachments
CREATE POLICY "Anyone can view attachments" ON forum_attachments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create attachments" ON forum_attachments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own attachments" ON forum_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM forum_discussions WHERE id = discussion_id AND author_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM forum_comments WHERE id = comment_id AND author_id = auth.uid()
    )
  );

-- RLS Policies for forum_discussion_likes
CREATE POLICY "Anyone can view discussion likes" ON forum_discussion_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like discussions" ON forum_discussion_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes" ON forum_discussion_likes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for forum_comment_likes
CREATE POLICY "Anyone can view comment likes" ON forum_comment_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like comments" ON forum_comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes" ON forum_comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for forum_discussion_bookmarks
CREATE POLICY "Users can view their own bookmarks" ON forum_discussion_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookmarks" ON forum_discussion_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks" ON forum_discussion_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update discussion likes_count
CREATE OR REPLACE FUNCTION update_discussion_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_discussions
    SET likes_count = likes_count + 1
    WHERE id = NEW.discussion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_discussions
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.discussion_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_discussion_likes_count
AFTER INSERT OR DELETE ON forum_discussion_likes
FOR EACH ROW EXECUTE FUNCTION update_discussion_likes_count();

-- Create trigger to update discussion comments_count
CREATE OR REPLACE FUNCTION update_discussion_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_discussions
    SET comments_count = comments_count + 1
    WHERE id = NEW.discussion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_discussions
    SET comments_count = GREATEST(comments_count - 1, 0)
    WHERE id = OLD.discussion_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_discussion_comments_count
AFTER INSERT OR DELETE ON forum_comments
FOR EACH ROW EXECUTE FUNCTION update_discussion_comments_count();

-- Create trigger to update comment likes_count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_comments
    SET likes_count = likes_count + 1
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_comments
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comment_likes_count
AFTER INSERT OR DELETE ON forum_comment_likes
FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_discussion_timestamp
BEFORE UPDATE ON forum_discussions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_comment_timestamp
BEFORE UPDATE ON forum_comments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample discussions
INSERT INTO forum_discussions (title, content, category, author_id) VALUES
('Emerging Markets Investment Strategies', 'Looking at the current trends in emerging markets, particularly in Southeast Asia, I''ve noticed some interesting patterns that I''d like to discuss with the community.

The rapid digitalization and growing middle class in these regions present unique opportunities for investors. However, currency volatility and regulatory uncertainties remain significant challenges.

What are your thoughts on balancing risk and reward in these markets? Has anyone had experience investing in companies in Vietnam, Indonesia, or the Philippines?

I''m particularly interested in:
• Fintech and digital payment platforms
• E-commerce infrastructure
• Renewable energy projects
• Healthcare technology

Would love to hear your perspectives and experiences!', 'Finance', (SELECT id FROM profiles LIMIT 1)),

('The Future of AI in Healthcare', 'Artificial Intelligence is revolutionizing healthcare in ways we never imagined. From early disease detection to personalized treatment plans, AI is making healthcare more accessible and effective.

Key areas I''m excited about:
- Diagnostic imaging and radiology
- Drug discovery and development
- Patient monitoring and predictive analytics
- Robotic surgery assistance

What are your thoughts on the ethical implications? How do we balance innovation with patient privacy and safety?', 'Technology', (SELECT id FROM profiles LIMIT 1)),

('Sustainable Architecture Trends 2024', 'Sustainable architecture is no longer just a trend—it''s becoming the standard. As architects and developers, we have a responsibility to create buildings that minimize environmental impact while maximizing human comfort.

Current innovations:
- Net-zero energy buildings
- Biophilic design principles
- Recycled and renewable materials
- Smart building systems

What sustainable practices have you implemented in your projects? Share your experiences!', 'Architecture', (SELECT id FROM profiles LIMIT 1));

-- Verify tables were created
SELECT 
  'forum_discussions' as table_name, 
  COUNT(*) as row_count 
FROM forum_discussions
UNION ALL
SELECT 
  'forum_comments' as table_name, 
  COUNT(*) as row_count 
FROM forum_comments
UNION ALL
SELECT 
  'forum_attachments' as table_name, 
  COUNT(*) as row_count 
FROM forum_attachments;
