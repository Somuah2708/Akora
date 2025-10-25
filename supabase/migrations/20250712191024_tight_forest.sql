/*
  # Create posts table

  1. New Tables
    - `posts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles.id)
      - `content` (text)
      - `image_url` (text, nullable)
      - `created_at` (timestamptz)
  2. Security
    - Enable RLS on `posts` table
    - Add policy for admins to insert posts
    - Add policy for all authenticated users to view posts
    - Add policy for admins to update their own posts
    - Add policy for admins to delete their own posts
*/

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  content text NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow admins to insert posts
CREATE POLICY "Admins can create posts"
  ON posts
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Allow all authenticated users to view posts
CREATE POLICY "All users can view posts"
  ON posts
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to update their own posts
CREATE POLICY "Admins can update their own posts"
  ON posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_admin())
  WITH CHECK (auth.uid() = user_id AND is_admin());

-- Allow admins to delete their own posts
CREATE POLICY "Admins can delete their own posts"
  ON posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND is_admin());