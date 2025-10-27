/*
  # Complete Posts Setup for Instagram-like Feed
  
  This migration ensures all tables needed for the posts functionality are created.
  It includes profiles, posts, and all interaction tables (likes, comments, bookmarks, shares).
  
  Tables:
  1. profiles - User profiles (standalone for testing, can be linked to auth.users later)
  2. posts - User posts with content and images
  3. post_likes - Post likes
  4. post_comments - Post comments (with nested replies support)
  5. post_bookmarks - Bookmarked posts
  6. post_shares - Post shares
  
  Note: The profiles table is created without a foreign key to auth.users to allow
  inserting sample data for testing. In production, you can add the foreign key constraint
  and create a trigger to automatically create profiles when users sign up.
*/

-- =====================================================
-- 1. PROFILES TABLE (if not exists from auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  bio text,
  is_admin boolean DEFAULT false,
  free_listings_count integer DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- =====================================================
-- 2. POSTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Posts policies
CREATE POLICY "Anyone can view posts"
  ON public.posts FOR SELECT
  USING (true);

CREATE POLICY "Users can create posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. POST LIKES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);

-- Enable RLS
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- Post likes policies
CREATE POLICY "Anyone can view likes"
  ON public.post_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like posts"
  ON public.post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON public.post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 4. POST COMMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id ON public.post_comments(parent_comment_id);

-- Enable RLS
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- Post comments policies
CREATE POLICY "Anyone can view comments"
  ON public.post_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments"
  ON public.post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.post_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.post_comments FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 5. POST BOOKMARKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.post_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_post_id ON public.post_bookmarks(post_id);
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user_id ON public.post_bookmarks(user_id);

-- Enable RLS
ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;

-- Post bookmarks policies
CREATE POLICY "Users can view own bookmarks"
  ON public.post_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can bookmark posts"
  ON public.post_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove bookmarks"
  ON public.post_bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 6. POST SHARES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.post_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_post_shares_post_id ON public.post_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_user_id ON public.post_shares(user_id);

-- Enable RLS
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

-- Post shares policies
CREATE POLICY "Anyone can view shares"
  ON public.post_shares FOR SELECT
  USING (true);

CREATE POLICY "Users can share posts"
  ON public.post_shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 7. HELPER FUNCTIONS FOR COUNTS
-- =====================================================

-- Get likes count for a post
CREATE OR REPLACE FUNCTION public.get_post_likes_count(p_post_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*) FROM public.post_likes WHERE post_id = p_post_id;
$$;

-- Get comments count for a post
CREATE OR REPLACE FUNCTION public.get_post_comments_count(p_post_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*) FROM public.post_comments WHERE post_id = p_post_id;
$$;

-- Get bookmarks count for a post
CREATE OR REPLACE FUNCTION public.get_post_bookmarks_count(p_post_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*) FROM public.post_bookmarks WHERE post_id = p_post_id;
$$;

-- Get shares count for a post
CREATE OR REPLACE FUNCTION public.get_post_shares_count(p_post_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*) FROM public.post_shares WHERE post_id = p_post_id;
$$;

-- Check if user has liked a post
CREATE OR REPLACE FUNCTION public.has_user_liked_post(p_post_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS(SELECT 1 FROM public.post_likes WHERE post_id = p_post_id AND user_id = p_user_id);
$$;

-- Check if user has bookmarked a post
CREATE OR REPLACE FUNCTION public.has_user_bookmarked_post(p_post_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS(SELECT 1 FROM public.post_bookmarks WHERE post_id = p_post_id AND user_id = p_user_id);
$$;

-- =====================================================
-- 8. INSERT SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert sample users (only if profiles table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) THEN
    -- Note: These are placeholder users. In production, profiles are created from auth.users
    INSERT INTO public.profiles (id, username, full_name, avatar_url, bio) VALUES
      ('00000000-0000-0000-0000-000000000001', 'john_doe', 'John Doe', 'https://i.pravatar.cc/150?img=1', 'Photographer | Travel enthusiast 📸'),
      ('00000000-0000-0000-0000-000000000002', 'jane_smith', 'Jane Smith', 'https://i.pravatar.cc/150?img=2', 'Artist | Creative director 🎨'),
      ('00000000-0000-0000-0000-000000000003', 'alex_wilson', 'Alex Wilson', 'https://i.pravatar.cc/150?img=3', 'Food blogger | Recipe creator 🍳');
  END IF;
END $$;

-- Insert sample posts (only if posts table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.posts LIMIT 1) THEN
    INSERT INTO public.posts (user_id, content, image_url) VALUES
      ('00000000-0000-0000-0000-000000000001', 'Beautiful sunset at the beach 🌅', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800'),
      ('00000000-0000-0000-0000-000000000002', 'My latest art piece! What do you think? 🎨', 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800'),
      ('00000000-0000-0000-0000-000000000003', 'Homemade pasta for dinner tonight 🍝', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800'),
      ('00000000-0000-0000-0000-000000000001', 'Exploring new places ✈️', 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800'),
      ('00000000-0000-0000-0000-000000000002', 'Studio vibes today 💫', 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800');
  END IF;
END $$;

-- =====================================================
-- 9. OPTIONAL: PRODUCTION AUTH INTEGRATION
-- =====================================================
-- Uncomment the following to link profiles to auth.users in production:

-- Add foreign key constraint to auth.users (only after removing sample data)
-- ALTER TABLE public.profiles 
--   ADD CONSTRAINT profiles_id_fkey 
--   FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create trigger to automatically create profile when user signs up
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS trigger AS $$
-- BEGIN
--   INSERT INTO public.profiles (id, username, full_name, avatar_url)
--   VALUES (
--     NEW.id,
--     NEW.raw_user_meta_data->>'username',
--     NEW.raw_user_meta_data->>'full_name',
--     NEW.raw_user_meta_data->>'avatar_url'
--   );
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

