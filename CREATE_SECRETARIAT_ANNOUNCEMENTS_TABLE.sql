-- Create secretariat_announcements table
-- This table stores all announcements for the OAA Secretariat section
-- Supports multiple announcement types with rich content and attachments

CREATE TABLE IF NOT EXISTS public.secretariat_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Information
  title TEXT NOT NULL,
  summary TEXT, -- Short preview text for cards
  content TEXT NOT NULL, -- Full announcement content (can be HTML/Markdown)
  
  -- Categorization
  category TEXT NOT NULL, -- General, Academic, Events, Alumni Updates, Important Notice, etc.
  priority TEXT DEFAULT 'normal', -- urgent, high, normal, low
  
  -- Tags for filtering
  tags JSONB, -- Array of tags for better organization
  
  -- Media & Attachments
  image_url TEXT, -- Featured image for the announcement (deprecated - use images array)
  images JSONB, -- Array of image URLs {url: string, caption?: string}[]
  attachments JSONB, -- Array of {name, url, type, size} objects for PDFs, documents, etc.
  
  -- Publishing
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  publish_date TIMESTAMPTZ, -- Scheduled publish date
  expiry_date TIMESTAMPTZ, -- When announcement should stop showing
  
  -- Author Information
  author_name TEXT, -- Name of the person posting
  author_title TEXT, -- Title/position (e.g., "Secretary General", "Alumni President")
  author_email TEXT,
  
  -- Engagement Metrics
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  
  -- Targeting (who can see this)
  target_audience TEXT DEFAULT 'all', -- all, alumni_only, students_only, staff_only, specific_years
  target_years JSONB, -- Array of graduation years if targeting specific classes
  
  -- Approval & Moderation
  is_approved BOOLEAN DEFAULT false,
  approval_date TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_priority CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  CONSTRAINT valid_target_audience CHECK (target_audience IN ('all', 'alumni_only', 'students_only', 'staff_only', 'specific_years'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_secretariat_announcements_user_id ON public.secretariat_announcements(user_id);
CREATE INDEX IF NOT EXISTS idx_secretariat_announcements_category ON public.secretariat_announcements(category);
CREATE INDEX IF NOT EXISTS idx_secretariat_announcements_priority ON public.secretariat_announcements(priority);
CREATE INDEX IF NOT EXISTS idx_secretariat_announcements_is_published ON public.secretariat_announcements(is_published);
CREATE INDEX IF NOT EXISTS idx_secretariat_announcements_is_approved ON public.secretariat_announcements(is_approved);
CREATE INDEX IF NOT EXISTS idx_secretariat_announcements_published_at ON public.secretariat_announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_secretariat_announcements_created_at ON public.secretariat_announcements(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_secretariat_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_secretariat_announcements_updated_at
  BEFORE UPDATE ON public.secretariat_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_secretariat_announcements_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.secretariat_announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Users can view published and approved announcements or their own
CREATE POLICY "Users can view published announcements or own"
  ON public.secretariat_announcements
  FOR SELECT
  USING (
    (is_published = true AND is_approved = true AND (expiry_date IS NULL OR expiry_date > NOW()))
    OR 
    auth.uid() = user_id
  );

-- Policy: Authenticated users can create announcements
CREATE POLICY "Users can create announcements"
  ON public.secretariat_announcements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own announcements
CREATE POLICY "Users can update own announcements"
  ON public.secretariat_announcements
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own announcements
CREATE POLICY "Users can delete own announcements"
  ON public.secretariat_announcements
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create announcement_bookmarks table for saved announcements
CREATE TABLE IF NOT EXISTS public.announcement_bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES public.secretariat_announcements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, announcement_id)
);

-- Index for announcement bookmarks
CREATE INDEX IF NOT EXISTS idx_announcement_bookmarks_user_id ON public.announcement_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_bookmarks_announcement_id ON public.announcement_bookmarks(announcement_id);

-- Enable RLS for announcement bookmarks
ALTER TABLE public.announcement_bookmarks ENABLE ROW LEVEL SECURITY;

-- Bookmark policies
CREATE POLICY "Users can view own announcement bookmarks"
  ON public.announcement_bookmarks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own announcement bookmarks"
  ON public.announcement_bookmarks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own announcement bookmarks"
  ON public.announcement_bookmarks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create announcement_likes table
CREATE TABLE IF NOT EXISTS public.announcement_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES public.secretariat_announcements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, announcement_id)
);

-- Index for announcement likes
CREATE INDEX IF NOT EXISTS idx_announcement_likes_user_id ON public.announcement_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_likes_announcement_id ON public.announcement_likes(announcement_id);

-- Enable RLS for announcement likes
ALTER TABLE public.announcement_likes ENABLE ROW LEVEL SECURITY;

-- Like policies
CREATE POLICY "Users can view announcement likes"
  ON public.announcement_likes
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create own announcement likes"
  ON public.announcement_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own announcement likes"
  ON public.announcement_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create announcement_comments table
CREATE TABLE IF NOT EXISTS public.announcement_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES public.secretariat_announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Comment content
  content TEXT NOT NULL,
  
  -- Reply system (optional - for threaded comments)
  parent_comment_id UUID REFERENCES public.announcement_comments(id) ON DELETE CASCADE,
  
  -- Moderation
  is_approved BOOLEAN DEFAULT true,
  is_flagged BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_content_length CHECK (length(content) > 0 AND length(content) <= 1000)
);

-- Index for announcement comments
CREATE INDEX IF NOT EXISTS idx_announcement_comments_announcement_id ON public.announcement_comments(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_comments_user_id ON public.announcement_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_comments_parent_id ON public.announcement_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_announcement_comments_created_at ON public.announcement_comments(created_at DESC);

-- Enable RLS for announcement comments
ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;

-- Comment policies
CREATE POLICY "Users can view approved comments"
  ON public.announcement_comments
  FOR SELECT
  USING (is_approved = true OR auth.uid() = user_id);

CREATE POLICY "Users can create comments"
  ON public.announcement_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.announcement_comments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.announcement_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create announcement_views table (optional - for tracking unique views)
CREATE TABLE IF NOT EXISTS public.announcement_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES public.secretariat_announcements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Track unique views per user
  UNIQUE(announcement_id, user_id)
);

-- Index for announcement views
CREATE INDEX IF NOT EXISTS idx_announcement_views_announcement_id ON public.announcement_views(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_views_user_id ON public.announcement_views(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_views_viewed_at ON public.announcement_views(viewed_at DESC);

-- Enable RLS for announcement views
ALTER TABLE public.announcement_views ENABLE ROW LEVEL SECURITY;

-- View policies
CREATE POLICY "Users can create announcement views"
  ON public.announcement_views
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own views"
  ON public.announcement_views
  FOR SELECT
  USING (auth.uid() = user_id);

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_announcement_view_count(announcement_uuid UUID, viewer_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Insert view record (will fail silently if already viewed by this user)
  INSERT INTO public.announcement_views (announcement_id, user_id)
  VALUES (announcement_uuid, viewer_user_id)
  ON CONFLICT (announcement_id, user_id) DO NOTHING;
  
  -- Update view count
  UPDATE public.secretariat_announcements
  SET view_count = (
    SELECT COUNT(DISTINCT user_id) 
    FROM public.announcement_views 
    WHERE announcement_id = announcement_uuid
  )
  WHERE id = announcement_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get announcement statistics
CREATE OR REPLACE FUNCTION get_announcement_stats(announcement_uuid UUID)
RETURNS TABLE(
  total_views INTEGER,
  total_likes INTEGER,
  total_comments INTEGER,
  total_bookmarks INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(a.view_count, 0) as total_views,
    COALESCE(COUNT(DISTINCT l.id), 0)::INTEGER as total_likes,
    COALESCE(COUNT(DISTINCT c.id), 0)::INTEGER as total_comments,
    COALESCE(COUNT(DISTINCT b.id), 0)::INTEGER as total_bookmarks
  FROM public.secretariat_announcements a
  LEFT JOIN public.announcement_likes l ON l.announcement_id = a.id
  LEFT JOIN public.announcement_comments c ON c.announcement_id = a.id AND c.is_approved = true
  LEFT JOIN public.announcement_bookmarks b ON b.announcement_id = a.id
  WHERE a.id = announcement_uuid
  GROUP BY a.id, a.view_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update comment count
CREATE OR REPLACE FUNCTION update_announcement_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_approved = true THEN
    UPDATE public.secretariat_announcements
    SET comment_count = comment_count + 1
    WHERE id = NEW.announcement_id;
  ELSIF TG_OP = 'DELETE' AND OLD.is_approved = true THEN
    UPDATE public.secretariat_announcements
    SET comment_count = GREATEST(0, comment_count - 1)
    WHERE id = OLD.announcement_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_approved != NEW.is_approved THEN
    IF NEW.is_approved THEN
      UPDATE public.secretariat_announcements
      SET comment_count = comment_count + 1
      WHERE id = NEW.announcement_id;
    ELSE
      UPDATE public.secretariat_announcements
      SET comment_count = GREATEST(0, comment_count - 1)
      WHERE id = NEW.announcement_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_announcement_comment_count
  AFTER INSERT OR UPDATE OR DELETE ON public.announcement_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_announcement_comment_count();

-- Function to update like count
CREATE OR REPLACE FUNCTION update_announcement_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.secretariat_announcements
    SET like_count = like_count + 1
    WHERE id = NEW.announcement_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.secretariat_announcements
    SET like_count = GREATEST(0, like_count - 1)
    WHERE id = OLD.announcement_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_announcement_like_count
  AFTER INSERT OR DELETE ON public.announcement_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_announcement_like_count();

-- Comments for documentation
COMMENT ON TABLE public.secretariat_announcements IS 'Stores all announcements for the OAA Secretariat section';
COMMENT ON TABLE public.announcement_bookmarks IS 'Stores user bookmarks/saved announcements';
COMMENT ON TABLE public.announcement_likes IS 'Stores announcement likes';
COMMENT ON TABLE public.announcement_comments IS 'Stores comments on announcements';
COMMENT ON TABLE public.announcement_views IS 'Tracks unique announcement views per user';
COMMENT ON COLUMN public.secretariat_announcements.priority IS 'urgent, high, normal, or low - affects display order';
COMMENT ON COLUMN public.secretariat_announcements.target_audience IS 'Who can see this announcement';
COMMENT ON COLUMN public.secretariat_announcements.expiry_date IS 'When announcement should stop showing (NULL = never expires)';
COMMENT ON COLUMN public.secretariat_announcements.is_published IS 'Whether announcement is visible to users';
COMMENT ON COLUMN public.secretariat_announcements.is_approved IS 'Whether announcement has been approved by admin';

-- Sample announcement categories (you can customize these based on your needs)
COMMENT ON COLUMN public.secretariat_announcements.category IS 'Suggested categories: General, Academic, Events, Alumni Updates, Important Notice, Opportunities, News, Resources';
