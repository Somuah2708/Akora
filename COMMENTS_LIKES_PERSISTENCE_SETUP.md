# Fix Comments and Likes Persistence - Setup Guide

This guide will help you set up persistent comment likes and accurate comment/like counts for both Home and Discover screens.

## Problem Summary
1. ❌ Comment likes were not persistent (only stored in local state)
2. ❌ Comments counts were inaccurate (showing "View all 1 comment" for posts with no comments)
3. ❌ Like counts were not accurate after refresh

## Solution Overview
1. ✅ Create `post_comment_likes` table for persistent comment likes
2. ✅ Add `like_count` column to `post_comments` table
3. ✅ Add triggers to automatically update counts
4. ✅ Add `comments_count` and `likes_count` columns to `posts` table
5. ✅ Update frontend to use accurate counts from database

## Step 1: Run SQL Migrations

Run these SQL files in your Supabase SQL Editor in this exact order:

### 1.1 Create Post Comment Likes Table
```sql
-- File: CREATE_POST_COMMENT_LIKES_TABLE.sql
-- This creates the table for storing comment likes with proper triggers
```
Run the file: `CREATE_POST_COMMENT_LIKES_TABLE.sql`

### 1.2 Fix Post Comment and Like Counts
```sql
-- File: FIX_POST_COMMENT_COUNTS.sql
-- This adds columns and triggers for accurate comment/like counts
```
Run the file: `FIX_POST_COMMENT_COUNTS.sql`

## Step 2: Verify the Setup

Run this query to check if everything is set up correctly:

```sql
-- Check if all required tables and columns exist
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('post_comments', 'post_comment_likes', 'posts')
  AND column_name IN ('like_count', 'comments_count', 'likes_count')
ORDER BY table_name, column_name;

-- Expected results:
-- post_comment_likes table should exist
-- post_comments.like_count column should exist
-- posts.comments_count column should exist
-- posts.likes_count column should exist
```

## Step 3: Verify Triggers

Check that all triggers are properly created:

```sql
-- Check triggers
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trigger_update_post_comment_like_count',
    'trigger_update_post_comment_count',
    'trigger_update_post_like_count'
  );

-- Expected results:
-- trigger_update_post_comment_like_count on post_comment_likes (AFTER INSERT/DELETE)
-- trigger_update_post_comment_count on post_comments (AFTER INSERT/DELETE)
-- trigger_update_post_like_count on post_likes (AFTER INSERT/DELETE)
```

## Step 4: Test the Functionality

### Test Comment Likes
1. Go to any post and add a comment
2. Like the comment by clicking the heart icon
3. Refresh the app or log out and log back in
4. ✅ The comment like should still be red/filled
5. ✅ The like count should show accurately

### Test Comment Counts
1. Create a new post
2. Initially it should say "Be the first to comment"
3. Add a comment
4. ✅ It should now say "View all 1 comment"
5. Add another comment
6. ✅ It should now say "View all 2 comments"

### Test Like Counts
1. Like a post
2. Check the like count increases
3. Refresh the app
4. ✅ The like should still be red and count should be accurate

## What Changed in the Code

### 1. Post Comments Screen (`app/post-comments/[postId].tsx`)
- ✅ Fetches `like_count` from database
- ✅ Fetches user's liked comments from `post_comment_likes` table
- ✅ Persists comment likes to database (INSERT/DELETE operations)
- ✅ Shows like count in UI (e.g., "5 Likes")
- ✅ Optimistic updates with error handling

### 2. Home Screen (`app/(tabs)/index.tsx`)
- ✅ Uses `comments_count` and `likes_count` columns from database
- ✅ No longer calculates counts from joined arrays
- ✅ More efficient queries (no need to join entire comments/likes tables)
- ✅ Real-time updates fetch accurate counts after changes

## Database Schema

### post_comment_likes Table
```sql
CREATE TABLE post_comment_likes (
  id UUID PRIMARY KEY,
  comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ,
  UNIQUE(comment_id, user_id) -- One like per user per comment
);
```

### post_comments Table (Updated)
```sql
ALTER TABLE post_comments 
ADD COLUMN like_count INTEGER DEFAULT 0;
```

### posts Table (Updated)
```sql
ALTER TABLE posts 
ADD COLUMN comments_count INTEGER DEFAULT 0,
ADD COLUMN likes_count INTEGER DEFAULT 0;
```

## Triggers Explained

### 1. Comment Like Count Trigger
When a user likes/unlikes a comment, the `like_count` in `post_comments` is automatically updated.

### 2. Post Comment Count Trigger
When a comment is added/deleted, the `comments_count` in `posts` is automatically updated.

### 3. Post Like Count Trigger
When a post is liked/unliked, the `likes_count` in `posts` is automatically updated.

## Troubleshooting

### Issue: Comment likes not persisting
**Solution:** Make sure you ran `CREATE_POST_COMMENT_LIKES_TABLE.sql`

### Issue: Comment counts still inaccurate
**Solution:** 
1. Run `FIX_POST_COMMENT_COUNTS.sql` again
2. Check that triggers are active using the verification query above

### Issue: "Table post_comment_likes does not exist"
**Solution:** Run `CREATE_POST_COMMENT_LIKES_TABLE.sql` in Supabase SQL Editor

### Issue: RLS policy errors
**Solution:** The SQL files include proper RLS policies. If you get errors, check that:
- You're logged in as an authenticated user
- The policies were created (check in Supabase Dashboard > Authentication > Policies)

## Manual Count Fix (If Needed)

If you notice inaccurate counts after setup, run this to recalculate all counts:

```sql
-- Recalculate all comment counts
UPDATE public.posts p
SET comments_count = (
  SELECT COUNT(*)
  FROM public.post_comments c
  WHERE c.post_id = p.id
);

-- Recalculate all like counts
UPDATE public.posts p
SET likes_count = (
  SELECT COUNT(*)
  FROM public.post_likes l
  WHERE l.post_id = p.id
);

-- Recalculate all comment like counts
UPDATE public.post_comments c
SET like_count = (
  SELECT COUNT(*)
  FROM public.post_comment_likes l
  WHERE l.comment_id = c.id
);
```

## Summary

After running these migrations:
1. ✅ Comment likes persist across app refreshes and logins
2. ✅ Comment counts are accurate and update in real-time
3. ✅ Like counts are accurate and update in real-time
4. ✅ Database triggers handle count updates automatically
5. ✅ Works for both Home and Discover screens

All changes are backward compatible and won't break existing functionality!
