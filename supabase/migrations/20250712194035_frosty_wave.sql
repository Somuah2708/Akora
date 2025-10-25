/*
  # Create quick_actions table

  1. New Tables
    - `quick_actions`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `icon_name` (text, not null) 
      - `color` (text, not null)
      - `route` (text, not null)
      - `order_index` (integer, not null, unique)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `quick_actions` table
    - Add policy for all users to read quick actions
    - Add policy for admins to manage quick actions

  3. Initial Data
    - Insert default quick actions matching the original hardcoded ones
*/

-- Create the quick_actions table
CREATE TABLE IF NOT EXISTS quick_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  icon_name text NOT NULL,
  color text NOT NULL,
  route text NOT NULL,
  order_index integer NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quick_actions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "All users can view quick actions"
  ON quick_actions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage quick actions"
  ON quick_actions
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Insert default quick actions
INSERT INTO quick_actions (title, icon_name, color, route, order_index) VALUES
  ('Houses', 'Building2', '#E4EAFF', '/houses', 1),
  ('Events', 'Calendar', '#FFF4E6', '/events', 2),
  ('News', 'Newspaper', '#E8F5E8', '/news', 3),
  ('Forum', 'MessageSquare', '#FFE4E1', '/forum', 4),
  ('Goals', 'Target', '#F0E6FF', '/goals', 5),
  ('Habits', 'CheckCircle', '#E6F7FF', '/habits', 6),
  ('Live', 'Video', '#FFE6F7', '/live', 7),
  ('More', 'MoreHorizontal', '#F5F5F5', '/outlook', 8)
ON CONFLICT (order_index) DO NOTHING;