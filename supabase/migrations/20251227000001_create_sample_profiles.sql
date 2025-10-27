/*
  # Create Sample Profiles
  
  Creates 3 sample user profiles for testing:
  - User 1 (Dev User): 11111111-1111-1111-1111-111111111111
  - User 2 (Test User): 22222222-2222-2222-2222-222222222222
  - User 3 (Demo User): 33333333-3333-3333-3333-333333333333
*/

-- Ensure email column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- Insert sample profiles (only if they don't exist)
INSERT INTO profiles (
  id,
  username,
  full_name,
  email,
  avatar_url,
  bio,
  created_at,
  updated_at
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'developer',
    'Dev User',
    'dev@test.com',
    NULL,
    'Software developer and tech enthusiast',
    now(),
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'testuser',
    'Test User',
    'test@test.com',
    NULL,
    'Testing features and breaking things',
    now(),
    now()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'demouser',
    'Demo User',
    'demo@test.com',
    NULL,
    'Demo account for showcasing features',
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  bio = EXCLUDED.bio,
  updated_at = now();
