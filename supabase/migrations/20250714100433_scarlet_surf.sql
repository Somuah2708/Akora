/*
  # Add Alumni Authentication

  1. New Tables
    - `alumni_records` - Stores pre-verified alumni information for authentication
  
  2. Schema Updates
    - Add `class`, `year_group`, and `house` columns to `profiles` table
  
  3. Security
    - Enable RLS on `alumni_records` table
    - Add policies for admin access to `alumni_records`
*/

-- Add new columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS class text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS year_group text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS house text;

-- Create alumni_records table
CREATE TABLE IF NOT EXISTS alumni_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  surname text NOT NULL,
  class text NOT NULL,
  year_group text NOT NULL,
  house text NOT NULL,
  email text UNIQUE,
  is_registered boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on alumni_records
ALTER TABLE alumni_records ENABLE ROW LEVEL SECURITY;

-- Create policies for alumni_records
CREATE POLICY "Admins can manage all alumni records"
  ON alumni_records
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

CREATE POLICY "Users can check their own alumni record during registration"
  ON alumni_records
  FOR SELECT
  TO anon
  USING (true);

-- Insert some sample alumni records for testing
INSERT INTO alumni_records (first_name, surname, class, year_group, house, email, is_registered)
VALUES
  ('John', 'Smith', 'Science', '2010', 'Livingstone', 'john.smith@example.com', false),
  ('Sarah', 'Johnson', 'Arts', '2012', 'Aggrey', 'sarah.johnson@example.com', false),
  ('Michael', 'Brown', 'Science', '2015', 'Fraser', 'michael.brown@example.com', false),
  ('Emma', 'Wilson', 'Business', '2018', 'Guggisberg', 'emma.wilson@example.com', false);