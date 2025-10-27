/*
  # Create post interaction tables

  1. New Tables
    - `post_likes`
      - `id` (uuid, primary key)
      - `post_id` (uuid, foreign key to posts.id)
      - `user_id` (uuid, foreign key to profiles.id)
      - `created_at` (timestamptz)
      - Unique constraint on (post_id, user_id) to prevent duplicate likes
    
    - `post_comments`
      - `id` (uuid, primary key)
      - `post_id` (uuid, foreign key to posts.id)
      - `user_id` (uuid, foreign key to profiles.id)
      - `content` (text)
      - `parent_comment_id` (uuid, nullable, for nested replies)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `post_bookmarks`
      - `id` (uuid, primary key)
      - `post_id` (uuid, foreign key to posts.id)
      - `user_id` (uuid, foreign key to profiles.id)
      - `created_at` (timestamptz)
      - Unique constraint on (post_id, user_id) to prevent duplicate bookmarks
    
    - `post_shares`
      - `id` (uuid, primary key)
      - `post_id` (uuid, foreign key to posts.id)
      - `user_id` (uuid, foreign key to profiles.id)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to interact with posts
    - Add policies to view public interactions (likes count, comments)

  3. Functions
    - Create helper functions to get counts for likes, comments, bookmarks
*/

-- Create post_likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create post_comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES post_comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create post_bookmarks table
CREATE TABLE IF NOT EXISTS post_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create post_shares table
CREATE TABLE IF NOT EXISTS post_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id ON post_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_post_id ON post_bookmarks(post_id);
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user_id ON post_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_post_id ON post_shares(post_id);

-- Enable Row Level Security
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_shares ENABLE ROW LEVEL SECURITY;

-- Policies for post_likes
CREATE POLICY "Users can view all likes"
  ON post_likes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like posts"
  ON post_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON post_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for post_comments
CREATE POLICY "Users can view all comments"
  ON post_comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON post_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON post_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON post_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for post_bookmarks
CREATE POLICY "Users can view their own bookmarks"
  ON post_bookmarks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can bookmark posts"
  ON post_bookmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove bookmarks"
  ON post_bookmarks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for post_shares
CREATE POLICY "Users can view all shares"
  ON post_shares
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can share posts"
  ON post_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Helper function to get like count for a post
CREATE OR REPLACE FUNCTION get_post_likes_count(post_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = $1;
$$;

-- Helper function to get comment count for a post
CREATE OR REPLACE FUNCTION get_post_comments_count(post_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*) FROM post_comments WHERE post_comments.post_id = $1;
$$;

-- Helper function to get bookmark count for a post
CREATE OR REPLACE FUNCTION get_post_bookmarks_count(post_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*) FROM post_bookmarks WHERE post_bookmarks.post_id = $1;
$$;

-- Helper function to get share count for a post
CREATE OR REPLACE FUNCTION get_post_shares_count(post_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*) FROM post_shares WHERE post_shares.post_id = $1;
$$;

-- Helper function to check if current user liked a post
CREATE OR REPLACE FUNCTION has_user_liked_post(post_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM post_likes 
    WHERE post_likes.post_id = $1 
    AND post_likes.user_id = auth.uid()
  );
$$;

-- Helper function to check if current user bookmarked a post
CREATE OR REPLACE FUNCTION has_user_bookmarked_post(post_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM post_bookmarks 
    WHERE post_bookmarks.post_id = $1 
    AND post_bookmarks.user_id = auth.uid()
  );
$$;

-- Function to update updated_at timestamp for comments
CREATE OR REPLACE FUNCTION update_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating comment timestamps
CREATE TRIGGER update_post_comments_updated_at
  BEFORE UPDATE ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_updated_at();
