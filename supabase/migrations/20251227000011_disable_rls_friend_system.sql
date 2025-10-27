/*
  # Disable RLS for Friend System Tables (Testing Only)
  
  This migration disables Row Level Security on the new friend system tables
  to allow testing with mock authentication.
  
  WARNING: Re-enable RLS in production with proper policies!
*/

-- Disable RLS on friend system tables
ALTER TABLE friend_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE friends DISABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages DISABLE ROW LEVEL SECURITY;
