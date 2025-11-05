# Real-time Likes & Comments Setup Guide

## ✅ What I've Done

I've optimized your discover page to have **Instagram-like real-time updates** for likes and comments!

### Key Improvements:

1. **🚀 Optimized Subscriptions**
   - Now subscribes to ALL post likes/comments (not just visible posts)
   - Subscriptions don't recreate when feed changes (better performance)
   - Added unique channel names to prevent conflicts

2. **📊 Better Logging**
   - Added console logs so you can see real-time updates happening
   - Check your browser console for messages like:
     - `🔥 Real-time like change detected`
     - `✅ Updated post [id]: X likes`
     - `📡 Likes subscription status: SUBSCRIBED`

3. **⚡ Faster Queries**
   - Using `head: true` to just get counts without fetching all data
   - More efficient than the previous approach

## 🔧 Supabase Configuration Required

For real-time to work, you need to enable it in Supabase:

### Step 1: Check if Realtime is Enabled

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **Database** → **Replication** (in the left sidebar)
4. Look for these tables and make sure they have checkboxes enabled:
   - ✅ `post_likes`
   - ✅ `post_comments`

### Step 2: Enable Realtime (if not already enabled)

If the tables are NOT checked:

1. Click on the table name (e.g., `post_likes`)
2. Toggle the **"Enable Realtime"** switch
3. Repeat for `post_comments`

**OR** run this SQL in your Supabase SQL Editor:

```sql
-- Enable realtime for post_likes
ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;

-- Enable realtime for post_comments
ALTER PUBLICATION supabase_realtime ADD TABLE post_comments;

-- Verify it's enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

You should see both `post_likes` and `post_comments` in the results.

## 🧪 Testing Real-time Updates

### Test 1: Like a Post
1. Open your app on **Device A** (or Browser 1)
2. Open your app on **Device B** (or Browser 2) with a different account
3. Like a post on Device A
4. **Device B should update immediately** showing the new like count!
5. Check console on Device B - you should see:
   ```
   🔥 Real-time like change detected: INSERT
   ✅ Updated post [uuid]: 2 likes
   ```

### Test 2: Unlike a Post
1. Unlike the post on Device A
2. Device B should update immediately showing decreased count
3. Console on Device B:
   ```
   🔥 Real-time like change detected: DELETE
   ✅ Updated post [uuid]: 1 likes
   ```

### Test 3: Add a Comment
1. Add a comment on Device A
2. Device B should show increased comment count immediately
3. Console on Device B:
   ```
   🔥 Real-time comment change detected: INSERT
   ✅ Updated post [uuid]: 3 comments
   ```

## 🐛 Troubleshooting

### Issue: "Nothing happens in real-time"

**Check 1: Realtime is enabled**
```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('post_likes', 'post_comments');
```
Should return 2 rows. If not, enable it (see Step 2 above).

**Check 2: Browser console shows subscription status**
Look for: `📡 Likes subscription status: SUBSCRIBED`

If you see `CLOSED` or `CHANNEL_ERROR`:
- Check your internet connection
- Verify Supabase project is active
- Check if you've exceeded Supabase real-time limits (free tier has limits)

**Check 3: RLS Policies allow SELECT**
```sql
-- Check policies on post_likes
SELECT * FROM pg_policies WHERE tablename = 'post_likes';

-- Check policies on post_comments  
SELECT * FROM pg_policies WHERE tablename = 'post_comments';
```

Both tables should have policies that allow SELECT for authenticated users.

### Issue: "Works for my likes but not others' likes"

This is likely an RLS policy issue. Make sure your policies allow viewing all likes:

```sql
-- For post_likes
CREATE POLICY "Anyone can view likes" ON post_likes
  FOR SELECT USING (true);

-- For post_comments
CREATE POLICY "Anyone can view comments" ON post_comments
  FOR SELECT USING (true);
```

## 📱 Expected Behavior (Like Instagram)

✅ **When you like a post**: Count updates instantly everywhere
✅ **When someone else likes**: Count updates on your screen in real-time
✅ **When comments are added**: Count updates instantly
✅ **Multiple devices**: All stay in sync
✅ **Optimistic updates**: Your own actions feel instant (UI updates before server confirms)

## 🎯 Performance Notes

- **Subscriptions are efficient**: Only one per table, not per post
- **Automatic cleanup**: Channels unsubscribe when you leave the page
- **Minimal data transfer**: Only counts are fetched, not full records
- **No polling**: Uses WebSocket connection (much better than polling)

## 📝 Files Modified

- ✅ `app/(tabs)/discover.tsx` - Optimized real-time subscriptions
- ✅ `lib/discover.ts` - Fixed initial count fetching

## 🚀 Next Steps

1. **Run the SQL** to enable realtime (if not already)
2. **Test with 2 devices** to see real-time updates
3. **Check console logs** to verify subscriptions are working
4. **Enjoy Instagram-like real-time updates!** 🎉

---

## 💡 Pro Tip

Keep your browser console open while testing. The logs will help you understand exactly what's happening in real-time!
