/*
  # Setup Complete Authentication System

  1. Alumni Records Table
    - Stores pre-verified alumni information for registration validation
  
  2. Profile Updates
    - Add alumni-related columns to profiles table
  
  3. Auth Trigger
    - Auto-create profile when user signs up
    
  4. Security
    - RLS policies for alumni_records
    - Re-enable RLS on all tables
*/

-- Add alumni columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS class text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS year_group text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS house text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS surname text;

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

CREATE POLICY "Anyone can check alumni records during registration"
  ON alumni_records
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Insert sample alumni records for testing
INSERT INTO alumni_records (first_name, surname, class, year_group, house, email, is_registered)
VALUES
  ('John', 'Doe', 'Science 1', '2020', 'Aggrey House', 'john.doe@alumni.com', false),
  ('Jane', 'Smith', 'Arts 2', '2021', 'Kingsley House', 'jane.smith@alumni.com', false),
  ('Alex', 'Wilson', 'Business 3', '2019', 'Guggisberg House', 'alex.wilson@alumni.com', false),
  ('Sarah', 'Johnson', 'Science 2', '2020', 'McCarthy House', 'sarah.j@alumni.com', false),
  ('Michael', 'Brown', 'Arts 1', '2022', 'Livingstone House', 'mike.brown@alumni.com', false)
ON CONFLICT (email) DO NOTHING;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username text;
  v_full_name text;
  v_first_name text;
  v_surname text;
  v_class text;
  v_year_group text;
  v_house text;
BEGIN
  -- Extract metadata from raw_user_meta_data
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_surname := COALESCE(NEW.raw_user_meta_data->>'surname', '');
  v_class := COALESCE(NEW.raw_user_meta_data->>'class', '');
  v_year_group := COALESCE(NEW.raw_user_meta_data->>'year_group', '');
  v_house := COALESCE(NEW.raw_user_meta_data->>'house', '');

  -- Create profile
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    first_name,
    surname,
    class,
    year_group,
    house,
    email,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    v_username,
    v_full_name,
    v_first_name,
    v_surname,
    v_class,
    v_year_group,
    v_house,
    NEW.email,
    now(),
    now()
  );

  -- Mark alumni record as registered if exists
  UPDATE alumni_records
  SET is_registered = true
  WHERE email = NEW.email;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Re-enable RLS on all tables for security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_shares ENABLE ROW LEVEL SECURITY;
