# Discover Page Likes & Comments Count Fix

## Problem
The likes and comments counts on the discover page were not showing accurately. When a post was liked by multiple accounts, it would only show 1 like instead of the correct count.

## Root Cause
The issue was with how the counts were being fetched from the database. The code was using:
```typescript
.select('id, post_likes(count), post_comments(count)')
```

This Supabase query syntax doesn't actually return the count correctly. It was returning an array instead of a count, and the code was trying to get the count by checking the array length, which wasn't working properly.

## Solution
Changed the counting mechanism to:
1. **Fetch all likes/comments** for the posts directly from `post_likes` and `post_comments` tables
2. **Count them manually** using JavaScript Map objects
3. **Use Supabase's `count: 'exact'` option** for real-time updates

## What Was Fixed

### 1. Initial Load (`lib/discover.ts`)
**Before:**
```typescript
const { data: countsData } = await supabase
  .from('posts')
  .select('id, post_likes(count), post_comments(count)')
  .in('id', postIdsForCounts);

const countsMap = new Map<string, { likes: number; comments: number }>();
(countsData || []).forEach((p: any) => {
  const likesCount = Array.isArray(p.post_likes) ? p.post_likes.length : 0;
  const commentsCount = Array.isArray(p.post_comments) ? p.post_comments.length : 0;
  countsMap.set(p.id, { likes: likesCount, comments: commentsCount });
});
```

**After:**
```typescript
// Fetch likes counts
const { data: likesData } = await supabase
  .from('post_likes')
  .select('post_id')
  .in('post_id', postIdsForCounts);

// Fetch comments counts
const { data: commentsData } = await supabase
  .from('post_comments')
  .select('post_id')
  .in('post_id', postIdsForCounts);

// Count likes per post
const likesCountMap = new Map<string, number>();
(likesData || []).forEach((like: any) => {
  const count = likesCountMap.get(like.post_id) || 0;
  likesCountMap.set(like.post_id, count + 1);
});

// Count comments per post
const commentsCountMap = new Map<string, number>();
(commentsData || []).forEach((comment: any) => {
  const count = commentsCountMap.get(comment.post_id) || 0;
  commentsCountMap.set(comment.post_id, count + 1);
});

const countsMap = new Map<string, { likes: number; comments: number }>();
postIdsForCounts.forEach((postId: string) => {
  countsMap.set(postId, {
    likes: likesCountMap.get(postId) || 0,
    comments: commentsCountMap.get(postId) || 0,
  });
});
```

### 2. Like Toggle (`app/(tabs)/discover.tsx`)
**Before:**
```typescript
const { data } = await supabase
  .from('posts')
  .select('id, post_likes(count)')
  .eq('id', item.sourceId)
  .single();

const actualLikesCount = Array.isArray((data as any).post_likes) ? (data as any).post_likes.length : 0;
```

**After:**
```typescript
const { data: likesData, count } = await supabase
  .from('post_likes')
  .select('*', { count: 'exact' })
  .eq('post_id', item.sourceId);

const actualLikesCount = count || 0;
```

### 3. Real-time Updates (`app/(tabs)/discover.tsx`)
**Before:**
```typescript
const { data } = await supabase
  .from('posts')
  .select('id, post_likes(count)')
  .eq('id', postId)
  .single();

const likesCount = Array.isArray((data as any).post_likes) ? (data as any).post_likes.length : 0;
```

**After:**
```typescript
const { data: likesData, count } = await supabase
  .from('post_likes')
  .select('*', { count: 'exact' })
  .eq('post_id', postId);

const likesCount = count || 0;
```

## Database Tables Used

**No new tables were created!** The discover page uses the same tables as the home screen:
- `post_likes` - Stores all likes for both home and discover posts
- `post_comments` - Stores all comments for both home and discover posts
- `posts` - Stores all posts (both admin posts for home and user posts for discover)

The key difference is:
- **Home screen**: Shows posts from admins only (`is_admin = true`)
- **Discover screen**: Shows posts from non-admin users (`is_admin = false`)

## Testing Instructions

1. **Test with multiple accounts:**
   - Like a post with Account A
   - Like the same post with Account B
   - Refresh the discover page
   - Should see "2 likes" (not 1)

2. **Test comments:**
   - Comment on a post with multiple accounts
   - Refresh the discover page
   - Should see the correct comment count

3. **Test real-time updates:**
   - Have two devices/browsers open
   - Like a post on one device
   - The count should update immediately on the other device

## Files Modified
- ✅ `/lib/discover.ts` - Fixed initial count fetching
- ✅ `/app/(tabs)/discover.tsx` - Fixed like toggle and real-time subscriptions

## Status: FIXED ✅

The likes and comments counts should now display accurately on the discover page!
