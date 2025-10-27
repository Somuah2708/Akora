-- Temporarily disable RLS for testing with mock auth
-- WARNING: This should only be used in development!
-- In production, enable real authentication and re-enable RLS

-- Disable RLS on chat tables
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- Also disable on other tables for testing
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_bookmarks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_shares DISABLE ROW LEVEL SECURITY;
