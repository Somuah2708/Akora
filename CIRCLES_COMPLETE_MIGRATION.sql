-- ============================================================
-- CIRCLES COMPLETE MIGRATION
-- ============================================================
-- This script drops all old circle tables and creates fresh ones
-- with all new features for the enhanced circles system
-- ============================================================

-- ============================================================
-- PART 1: DROP ALL OLD CIRCLE-RELATED OBJECTS
-- ============================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_create_circle_group_chat ON circles;
DROP TRIGGER IF EXISTS trigger_add_circle_member_to_group ON circle_members;
DROP TRIGGER IF EXISTS trigger_remove_circle_member_from_group ON circle_members;
DROP TRIGGER IF EXISTS trigger_update_circle_activity ON circles;

-- Drop functions
DROP FUNCTION IF EXISTS create_circle_group_chat() CASCADE;
DROP FUNCTION IF EXISTS add_circle_member_to_group() CASCADE;
DROP FUNCTION IF EXISTS remove_circle_member_from_group() CASCADE;
DROP FUNCTION IF EXISTS update_circle_activity() CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_circles_created_by;
DROP INDEX IF EXISTS idx_circles_group_chat;
DROP INDEX IF EXISTS idx_circles_category;
DROP INDEX IF EXISTS idx_circles_is_featured;
DROP INDEX IF EXISTS idx_circle_members_circle_id;
DROP INDEX IF EXISTS idx_circle_members_user_id;
DROP INDEX IF EXISTS idx_circle_join_requests_circle_id;
DROP INDEX IF EXISTS idx_circle_join_requests_user_id;
DROP INDEX IF EXISTS idx_circle_join_requests_status;

-- Drop tables (CASCADE will drop dependent policies, foreign keys, etc.)
DROP TABLE IF EXISTS circle_poll_votes CASCADE;
DROP TABLE IF EXISTS circle_polls CASCADE;
DROP TABLE IF EXISTS circle_files CASCADE;
DROP TABLE IF EXISTS circle_announcements CASCADE;
DROP TABLE IF EXISTS circle_event_rsvps CASCADE;
DROP TABLE IF EXISTS circle_events CASCADE;
DROP TABLE IF EXISTS circle_post_likes CASCADE;
DROP TABLE IF EXISTS circle_post_comments CASCADE;
DROP TABLE IF EXISTS circle_posts CASCADE;
DROP TABLE IF EXISTS circle_join_requests CASCADE;
DROP TABLE IF EXISTS circle_members CASCADE;
DROP TABLE IF EXISTS circles CASCADE;

-- ============================================================
-- PART 2: CREATE FRESH CIRCLE TABLES
-- ============================================================

-- Main circles table with all new features
CREATE TABLE circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Fun Clubs', 'Year Groups', 'Class Pages', 'House Groups', 'Study Groups', 'Sports', 'Arts')),
  
  -- Images
  image_url TEXT, -- Circle avatar/logo
  cover_image TEXT, -- Hero cover image
  
  -- Privacy & Status
  is_private BOOLEAN DEFAULT false,
  is_official BOOLEAN DEFAULT false, -- Admin-created official circles
  is_featured BOOLEAN DEFAULT false, -- Featured on main page
  
  -- Metadata
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Activity tracking
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  member_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  
  -- Group chat integration
  group_chat_id UUID REFERENCES groups(id) ON DELETE SET NULL
);

-- Circle members table with roles
CREATE TABLE circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (circle_id, user_id)
);

-- Circle join requests for private circles
CREATE TABLE circle_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT, -- Optional message from requester
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (circle_id, user_id)
);

-- ============================================================
-- PART 3: CIRCLE POSTS (FEED)
-- ============================================================

CREATE TABLE circle_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  images TEXT[], -- Array of image URLs
  
  -- Engagement
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  
  -- Pinning
  is_pinned BOOLEAN DEFAULT false,
  pinned_at TIMESTAMPTZ,
  pinned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Post likes
CREATE TABLE circle_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES circle_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (post_id, user_id)
);

-- Post comments
CREATE TABLE circle_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES circle_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PART 4: CIRCLE EVENTS
-- ============================================================

CREATE TABLE circle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  
  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ, -- Optional end time
  location TEXT, -- Physical location or "Online"
  location_url TEXT, -- Google Maps link or online meeting link
  cover_image TEXT,
  
  -- RSVP tracking
  going_count INTEGER DEFAULT 0,
  maybe_count INTEGER DEFAULT 0,
  not_going_count INTEGER DEFAULT 0,
  
  -- Status
  is_cancelled BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Event RSVPs
CREATE TABLE circle_event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES circle_events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- ============================================================
-- PART 5: CIRCLE ANNOUNCEMENTS
-- ============================================================

CREATE TABLE circle_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  
  -- Priority
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Visibility
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ, -- Optional expiry
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PART 6: CIRCLE FILES/RESOURCES
-- ============================================================

CREATE TABLE circle_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  
  -- File details
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT, -- pdf, image, doc, etc.
  file_size INTEGER, -- in bytes
  
  -- Category
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'photos', 'documents', 'videos', 'links')),
  
  -- Downloads
  download_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PART 7: CIRCLE POLLS
-- ============================================================

CREATE TABLE circle_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  
  -- Poll details
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of {id, text, votes}
  
  -- Settings
  allow_multiple BOOLEAN DEFAULT false, -- Allow multiple choice
  is_anonymous BOOLEAN DEFAULT false, -- Anonymous voting
  ends_at TIMESTAMPTZ, -- Optional end time
  
  -- Status
  is_closed BOOLEAN DEFAULT false,
  total_votes INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Poll votes
CREATE TABLE circle_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES circle_polls(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  option_id TEXT NOT NULL, -- References option.id in poll's options JSONB
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (poll_id, user_id, option_id)
);

-- ============================================================
-- PART 8: INDEXES FOR PERFORMANCE
-- ============================================================

-- Circles indexes
CREATE INDEX idx_circles_created_by ON circles(created_by);
CREATE INDEX idx_circles_category ON circles(category);
CREATE INDEX idx_circles_is_official ON circles(is_official);
CREATE INDEX idx_circles_is_featured ON circles(is_featured);
CREATE INDEX idx_circles_last_activity ON circles(last_activity_at DESC);
CREATE INDEX idx_circles_created_at ON circles(created_at DESC);
CREATE INDEX idx_circles_group_chat ON circles(group_chat_id);

-- Circle members indexes
CREATE INDEX idx_circle_members_circle_id ON circle_members(circle_id);
CREATE INDEX idx_circle_members_user_id ON circle_members(user_id);
CREATE INDEX idx_circle_members_role ON circle_members(role);

-- Join requests indexes
CREATE INDEX idx_circle_join_requests_circle_id ON circle_join_requests(circle_id);
CREATE INDEX idx_circle_join_requests_user_id ON circle_join_requests(user_id);
CREATE INDEX idx_circle_join_requests_status ON circle_join_requests(status);

-- Posts indexes
CREATE INDEX idx_circle_posts_circle_id ON circle_posts(circle_id);
CREATE INDEX idx_circle_posts_user_id ON circle_posts(user_id);
CREATE INDEX idx_circle_posts_created_at ON circle_posts(created_at DESC);
CREATE INDEX idx_circle_posts_is_pinned ON circle_posts(is_pinned) WHERE is_pinned = true;

-- Events indexes
CREATE INDEX idx_circle_events_circle_id ON circle_events(circle_id);
CREATE INDEX idx_circle_events_event_date ON circle_events(event_date);

-- Announcements indexes
CREATE INDEX idx_circle_announcements_circle_id ON circle_announcements(circle_id);
CREATE INDEX idx_circle_announcements_is_active ON circle_announcements(is_active) WHERE is_active = true;

-- Files indexes
CREATE INDEX idx_circle_files_circle_id ON circle_files(circle_id);
CREATE INDEX idx_circle_files_category ON circle_files(category);

-- Polls indexes
CREATE INDEX idx_circle_polls_circle_id ON circle_polls(circle_id);
CREATE INDEX idx_circle_polls_is_closed ON circle_polls(is_closed);

-- ============================================================
-- PART 9: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_poll_votes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CIRCLES POLICIES
-- ============================================================

-- Anyone can view circles
CREATE POLICY "Anyone can view circles" 
  ON circles FOR SELECT 
  TO authenticated 
  USING (true);

-- Users can create circles (non-official only)
CREATE POLICY "Users can create non-official circles" 
  ON circles FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = created_by 
    AND (
      is_official = false 
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND (is_admin = true OR role IN ('admin', 'staff'))
      )
    )
  );

-- Circle admins can update their circles
CREATE POLICY "Circle admins can update circles" 
  ON circles FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM circle_members 
      WHERE circle_id = circles.id 
      AND user_id = auth.uid() 
      AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (is_admin = true OR role IN ('admin', 'staff'))
    )
  );

-- Circle admins can delete circles
CREATE POLICY "Circle admins can delete circles" 
  ON circles FOR DELETE 
  TO authenticated 
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (is_admin = true OR role IN ('admin', 'staff'))
    )
  );

-- ============================================================
-- CIRCLE MEMBERS POLICIES
-- ============================================================

CREATE POLICY "Anyone can view circle members" 
  ON circle_members FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can join public circles" 
  ON circle_members FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Public circle: anyone can join
      EXISTS (
        SELECT 1 FROM circles 
        WHERE id = circle_id 
        AND is_private = false
      )
      OR
      -- Private circle: must be circle admin adding members
      EXISTS (
        SELECT 1 FROM circle_members cm
        WHERE cm.circle_id = circle_members.circle_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
      )
    )
  );

CREATE POLICY "Circle admins can manage members" 
  ON circle_members FOR DELETE 
  TO authenticated 
  USING (
    auth.uid() = user_id -- Can leave yourself
    OR EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_members.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Circle admins can update member roles" 
  ON circle_members FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_members.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
    )
  );

-- ============================================================
-- JOIN REQUESTS POLICIES
-- ============================================================

CREATE POLICY "Users can view relevant join requests" 
  ON circle_join_requests FOR SELECT 
  TO authenticated 
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_join_requests.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Users can create join requests" 
  ON circle_join_requests FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM circles
      WHERE id = circle_id
      AND is_private = true
    )
  );

CREATE POLICY "Circle admins can update join requests" 
  ON circle_join_requests FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_join_requests.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Users can delete their own requests" 
  ON circle_join_requests FOR DELETE 
  TO authenticated 
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_join_requests.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

-- ============================================================
-- POSTS POLICIES
-- ============================================================

CREATE POLICY "Members can view circle posts" 
  ON circle_posts FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_posts.circle_id
      AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM circles c
      WHERE c.id = circle_posts.circle_id
      AND c.is_private = false
    )
  );

CREATE POLICY "Members can create posts" 
  ON circle_posts FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_posts.circle_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own posts" 
  ON circle_posts FOR UPDATE 
  TO authenticated 
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_posts.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Users can delete their own posts" 
  ON circle_posts FOR DELETE 
  TO authenticated 
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_posts.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

-- ============================================================
-- POST LIKES POLICIES
-- ============================================================

CREATE POLICY "Anyone can view post likes" 
  ON circle_post_likes FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Members can like posts" 
  ON circle_post_likes FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM circle_posts cp
      JOIN circle_members cm ON cm.circle_id = cp.circle_id
      WHERE cp.id = post_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can unlike posts" 
  ON circle_post_likes FOR DELETE 
  TO authenticated 
  USING (user_id = auth.uid());

-- ============================================================
-- POST COMMENTS POLICIES
-- ============================================================

CREATE POLICY "Anyone can view post comments" 
  ON circle_post_comments FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Members can comment on posts" 
  ON circle_post_comments FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM circle_posts cp
      JOIN circle_members cm ON cm.circle_id = cp.circle_id
      WHERE cp.id = post_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their comments" 
  ON circle_post_comments FOR UPDATE 
  TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their comments" 
  ON circle_post_comments FOR DELETE 
  TO authenticated 
  USING (user_id = auth.uid());

-- ============================================================
-- EVENTS POLICIES
-- ============================================================

CREATE POLICY "Members can view circle events" 
  ON circle_events FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_events.circle_id
      AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM circles c
      WHERE c.id = circle_events.circle_id
      AND c.is_private = false
    )
  );

CREATE POLICY "Circle admins can create events" 
  ON circle_events FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_events.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Circle admins can update events" 
  ON circle_events FOR UPDATE 
  TO authenticated 
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_events.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Circle admins can delete events" 
  ON circle_events FOR DELETE 
  TO authenticated 
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_events.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
    )
  );

-- ============================================================
-- EVENT RSVPS POLICIES
-- ============================================================

CREATE POLICY "Anyone can view event RSVPs" 
  ON circle_event_rsvps FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Members can RSVP to events" 
  ON circle_event_rsvps FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM circle_events ce
      JOIN circle_members cm ON cm.circle_id = ce.circle_id
      WHERE ce.id = event_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their RSVP" 
  ON circle_event_rsvps FOR UPDATE 
  TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their RSVP" 
  ON circle_event_rsvps FOR DELETE 
  TO authenticated 
  USING (user_id = auth.uid());

-- ============================================================
-- ANNOUNCEMENTS POLICIES
-- ============================================================

CREATE POLICY "Members can view announcements" 
  ON circle_announcements FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_announcements.circle_id
      AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM circles c
      WHERE c.id = circle_announcements.circle_id
      AND c.is_private = false
    )
  );

CREATE POLICY "Circle admins can create announcements" 
  ON circle_announcements FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_announcements.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Circle admins can update announcements" 
  ON circle_announcements FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_announcements.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Circle admins can delete announcements" 
  ON circle_announcements FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_announcements.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
    )
  );

-- ============================================================
-- FILES POLICIES
-- ============================================================

CREATE POLICY "Members can view circle files" 
  ON circle_files FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_files.circle_id
      AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM circles c
      WHERE c.id = circle_files.circle_id
      AND c.is_private = false
    )
  );

CREATE POLICY "Members can upload files" 
  ON circle_files FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_files.circle_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "File owners and admins can delete files" 
  ON circle_files FOR DELETE 
  TO authenticated 
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_files.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
    )
  );

-- ============================================================
-- POLLS POLICIES
-- ============================================================

CREATE POLICY "Members can view polls" 
  ON circle_polls FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_polls.circle_id
      AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM circles c
      WHERE c.id = circle_polls.circle_id
      AND c.is_private = false
    )
  );

CREATE POLICY "Circle admins can create polls" 
  ON circle_polls FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_polls.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Circle admins can update polls" 
  ON circle_polls FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_polls.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Circle admins can delete polls" 
  ON circle_polls FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_polls.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
    )
  );

-- ============================================================
-- POLL VOTES POLICIES
-- ============================================================

CREATE POLICY "Anyone can view poll votes" 
  ON circle_poll_votes FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Members can vote on polls" 
  ON circle_poll_votes FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM circle_polls cp
      JOIN circle_members cm ON cm.circle_id = cp.circle_id
      WHERE cp.id = poll_id
      AND cm.user_id = auth.uid()
      AND cp.is_closed = false
    )
  );

CREATE POLICY "Users can change their vote" 
  ON circle_poll_votes FOR DELETE 
  TO authenticated 
  USING (user_id = auth.uid());

-- ============================================================
-- PART 10: FUNCTIONS & TRIGGERS
-- ============================================================

-- Function to update member count
CREATE OR REPLACE FUNCTION update_circle_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE circles SET member_count = member_count + 1 WHERE id = NEW.circle_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE circles SET member_count = member_count - 1 WHERE id = OLD.circle_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_circle_member_count
  AFTER INSERT OR DELETE ON circle_members
  FOR EACH ROW
  EXECUTE FUNCTION update_circle_member_count();

-- Function to update post count
CREATE OR REPLACE FUNCTION update_circle_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE circles 
    SET post_count = post_count + 1, 
        last_activity_at = NOW() 
    WHERE id = NEW.circle_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE circles SET post_count = post_count - 1 WHERE id = OLD.circle_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_circle_post_count
  AFTER INSERT OR DELETE ON circle_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_circle_post_count();

-- Function to update post likes count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE circle_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE circle_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_post_likes_count
  AFTER INSERT OR DELETE ON circle_post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();

-- Function to update post comments count
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE circle_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE circle_posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_post_comments_count
  AFTER INSERT OR DELETE ON circle_post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comments_count();

-- Function to update event RSVP counts
CREATE OR REPLACE FUNCTION update_event_rsvp_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'going' THEN
      UPDATE circle_events SET going_count = going_count + 1 WHERE id = NEW.event_id;
    ELSIF NEW.status = 'maybe' THEN
      UPDATE circle_events SET maybe_count = maybe_count + 1 WHERE id = NEW.event_id;
    ELSIF NEW.status = 'not_going' THEN
      UPDATE circle_events SET not_going_count = not_going_count + 1 WHERE id = NEW.event_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Decrement old status
    IF OLD.status = 'going' THEN
      UPDATE circle_events SET going_count = going_count - 1 WHERE id = OLD.event_id;
    ELSIF OLD.status = 'maybe' THEN
      UPDATE circle_events SET maybe_count = maybe_count - 1 WHERE id = OLD.event_id;
    ELSIF OLD.status = 'not_going' THEN
      UPDATE circle_events SET not_going_count = not_going_count - 1 WHERE id = OLD.event_id;
    END IF;
    -- Increment new status
    IF NEW.status = 'going' THEN
      UPDATE circle_events SET going_count = going_count + 1 WHERE id = NEW.event_id;
    ELSIF NEW.status = 'maybe' THEN
      UPDATE circle_events SET maybe_count = maybe_count + 1 WHERE id = NEW.event_id;
    ELSIF NEW.status = 'not_going' THEN
      UPDATE circle_events SET not_going_count = not_going_count + 1 WHERE id = NEW.event_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'going' THEN
      UPDATE circle_events SET going_count = going_count - 1 WHERE id = OLD.event_id;
    ELSIF OLD.status = 'maybe' THEN
      UPDATE circle_events SET maybe_count = maybe_count - 1 WHERE id = OLD.event_id;
    ELSIF OLD.status = 'not_going' THEN
      UPDATE circle_events SET not_going_count = not_going_count - 1 WHERE id = OLD.event_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_event_rsvp_counts
  AFTER INSERT OR UPDATE OR DELETE ON circle_event_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION update_event_rsvp_counts();

-- Function to update poll total votes
CREATE OR REPLACE FUNCTION update_poll_votes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE circle_polls SET total_votes = total_votes + 1 WHERE id = NEW.poll_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE circle_polls SET total_votes = total_votes - 1 WHERE id = OLD.poll_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_poll_votes_count
  AFTER INSERT OR DELETE ON circle_poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_poll_votes_count();

-- Function to auto-create group chat for circles
CREATE OR REPLACE FUNCTION create_circle_group_chat()
RETURNS TRIGGER AS $$
DECLARE
  new_group_id UUID;
BEGIN
  -- Create a group for this circle
  INSERT INTO groups (name, avatar_url, created_by)
  VALUES (NEW.name, NEW.image_url, NEW.created_by)
  RETURNING id INTO new_group_id;
  
  -- Add creator as admin member
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (new_group_id, NEW.created_by, 'admin');
  
  -- Update circle with group chat id
  NEW.group_chat_id := new_group_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_circle_group_chat
  BEFORE INSERT ON circles
  FOR EACH ROW
  EXECUTE FUNCTION create_circle_group_chat();

-- Function to sync circle members to group chat
CREATE OR REPLACE FUNCTION sync_circle_member_to_group()
RETURNS TRIGGER AS $$
DECLARE
  circle_group_id UUID;
BEGIN
  SELECT group_chat_id INTO circle_group_id
  FROM circles
  WHERE id = NEW.circle_id;
  
  IF circle_group_id IS NOT NULL THEN
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (circle_group_id, NEW.user_id, 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_sync_circle_member_to_group
  AFTER INSERT ON circle_members
  FOR EACH ROW
  EXECUTE FUNCTION sync_circle_member_to_group();

-- Function to remove circle member from group chat
CREATE OR REPLACE FUNCTION remove_circle_member_from_group()
RETURNS TRIGGER AS $$
DECLARE
  circle_group_id UUID;
BEGIN
  SELECT group_chat_id INTO circle_group_id
  FROM circles
  WHERE id = OLD.circle_id;
  
  IF circle_group_id IS NOT NULL THEN
    DELETE FROM group_members
    WHERE group_id = circle_group_id AND user_id = OLD.user_id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_remove_circle_member_from_group
  AFTER DELETE ON circle_members
  FOR EACH ROW
  EXECUTE FUNCTION remove_circle_member_from_group();

-- ============================================================
-- PART 11: CREATE STORAGE BUCKET FOR CIRCLE FILES
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'circle-files',
  'circle-files',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'video/mp4']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'video/mp4'];

-- Storage policies
CREATE POLICY "Circle members can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'circle-files'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Anyone can view circle files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'circle-files');

CREATE POLICY "File owners can delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'circle-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- PART 12: SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Circles migration completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tables created:';
  RAISE NOTICE '   - circles (with cover_image, is_official, is_featured, activity tracking)';
  RAISE NOTICE '   - circle_members (with moderator role)';
  RAISE NOTICE '   - circle_join_requests (with message and reviewed_by)';
  RAISE NOTICE '   - circle_posts (with likes, comments, pinning)';
  RAISE NOTICE '   - circle_post_likes';
  RAISE NOTICE '   - circle_post_comments';
  RAISE NOTICE '   - circle_events (with RSVP tracking)';
  RAISE NOTICE '   - circle_event_rsvps';
  RAISE NOTICE '   - circle_announcements (with priority and expiry)';
  RAISE NOTICE '   - circle_files (with categories and download count)';
  RAISE NOTICE '   - circle_polls (with multiple choice and anonymous options)';
  RAISE NOTICE '   - circle_poll_votes';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS policies applied to all tables';
  RAISE NOTICE '⚡ Triggers for auto-updating counts';
  RAISE NOTICE '💬 Group chat integration maintained';
  RAISE NOTICE '📁 Storage bucket created for circle files';
END $$;


/*
📋 Remaining Phases for Circles Implementation
Phase 2: Tier System 🔐
#	Task	Status
7	Block non-admins from creating Year Groups/House Groups/Class Pages	⏳ Pending
8	Add verified badge (✓) for official circles	⏳ Pending
9	Update create modal to show available categories per role	⏳ Pending
Phase 3: Main Screen UI Redesign 🎨
#	Task	Status
10	Dark theme (#0F172A) + gold accents (#ffc857)	⏳ Pending
11	Featured Circles horizontal section	⏳ Pending
12	My Circles with member avatars	⏳ Pending
13	Activity indicators (last active)	⏳ Pending
14	Cover images on cards	⏳ Pending
15	Member avatar stack on cards	⏳ Pending
Phase 4: Circle Detail Screen 📱
#	Task	Status
16	Hero cover header with gradient	⏳ Pending
17	Tab navigation (Posts, Events, Files, Members)	⏳ Pending
18	Pinned announcements section	⏳ Pending
19	Create post UI	⏳ Pending
Phase 5: Events & Polls 📅
#	Task	Status
20	Create event screen	⏳ Pending
21	Event RSVP (Going/Maybe/Not Going)	⏳ Pending
22	Create poll screen	⏳ Pending
23	Vote & live results	⏳ Pending
Phase 6: Discovery 🔍
#	Task	Status
24	Trending circles (most active)	⏳ Pending
25	Recommended (based on graduation year)	⏳ Pending
26	Recently created circles	⏳ Pending
Phase 7: Files & Resources 📁
#	Task	Status
27	Storage bucket setup	✅ Done (in migration)
28	Upload files UI	⏳ Pending
29	File list & download	⏳ Pending
Phase 8: Final Polish ✨
#	Task	Status
30	Animations & transitions	⏳ Pending
31	End-to-end testing	⏳ Pending
32	Push to GitHub	⏳ Pending
📊 Progress Summary:
✅ Phase 1 Complete: Database schema with 12 tables, RLS, triggers, storage
⏳ Phases 2-8: App code implementation pending
Go ahead and make your quick update! When you're ready, just say "Continue with circles" and I'll pick up from Phase 2: Tier System. 🚀
*/