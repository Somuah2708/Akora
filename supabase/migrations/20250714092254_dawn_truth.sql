/*
  # Create circles and circle_members tables

  1. New Tables
    - `circles`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `description` (text, not null)
      - `category` (text, not null)
      - `image_url` (text)
      - `is_private` (boolean, default false)
      - `created_by` (uuid, references profiles.id)
      - `created_at` (timestamptz, default now())
    - `circle_members`
      - `circle_id` (uuid, references circles.id)
      - `user_id` (uuid, references profiles.id)
      - `role` (text, default 'member')
      - `joined_at` (timestamptz, default now())
    - `circle_join_requests`
      - `id` (uuid, primary key)
      - `circle_id` (uuid, references circles.id)
      - `user_id` (uuid, references profiles.id)
      - `status` (text, default 'pending')
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create circles table
CREATE TABLE IF NOT EXISTS circles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  image_url text,
  is_private boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create circle_members table
CREATE TABLE IF NOT EXISTS circle_members (
  circle_id uuid REFERENCES circles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (circle_id, user_id)
);

-- Create circle_join_requests table
CREATE TABLE IF NOT EXISTS circle_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid REFERENCES circles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (circle_id, user_id)
);

-- Enable RLS on circles table
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on circle_members table
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;

-- Enable RLS on circle_join_requests table
ALTER TABLE circle_join_requests ENABLE ROW LEVEL SECURITY;

-- Circles policies
CREATE POLICY "Anyone can view circles" 
  ON circles FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can create circles" 
  ON circles FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Circle creators can update their circles" 
  ON circles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = created_by);

CREATE POLICY "Circle creators can delete their circles" 
  ON circles FOR DELETE 
  TO authenticated 
  USING (auth.uid() = created_by);

-- Circle members policies
CREATE POLICY "Anyone can view circle members" 
  ON circle_members FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Circle creators can add members" 
  ON circle_members FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM circles 
      WHERE circles.id = circle_members.circle_id 
      AND circles.created_by = auth.uid()
    )
    OR
    (
      -- Users can add themselves to public circles
      auth.uid() = circle_members.user_id
      AND EXISTS (
        SELECT 1 FROM circles
        WHERE circles.id = circle_members.circle_id
        AND circles.is_private = false
      )
    )
  );

CREATE POLICY "Circle creators can remove members" 
  ON circle_members FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM circles 
      WHERE circles.id = circle_members.circle_id 
      AND circles.created_by = auth.uid()
    )
    OR
    -- Members can remove themselves
    auth.uid() = circle_members.user_id
  );

-- Circle join requests policies
CREATE POLICY "Circle creators can view join requests" 
  ON circle_join_requests FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM circles 
      WHERE circles.id = circle_join_requests.circle_id 
      AND circles.created_by = auth.uid()
    )
    OR
    -- Users can view their own requests
    auth.uid() = circle_join_requests.user_id
  );

CREATE POLICY "Users can create join requests" 
  ON circle_join_requests FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = circle_join_requests.user_id
    AND EXISTS (
      SELECT 1 FROM circles
      WHERE circles.id = circle_join_requests.circle_id
      AND circles.is_private = true
    )
  );

CREATE POLICY "Circle creators can update join requests" 
  ON circle_join_requests FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM circles 
      WHERE circles.id = circle_join_requests.circle_id 
      AND circles.created_by = auth.uid()
    )
  );

CREATE POLICY "Circle creators can delete join requests" 
  ON circle_join_requests FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM circles 
      WHERE circles.id = circle_join_requests.circle_id 
      AND circles.created_by = auth.uid()
    )
    OR
    -- Users can delete their own requests
    auth.uid() = circle_join_requests.user_id
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_circles_created_by ON circles(created_by);
CREATE INDEX IF NOT EXISTS idx_circle_members_circle_id ON circle_members(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_user_id ON circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_join_requests_circle_id ON circle_join_requests(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_join_requests_user_id ON circle_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_join_requests_status ON circle_join_requests(status);