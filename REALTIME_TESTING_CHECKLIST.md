# Real-time Testing Checklist

## Before Testing

1. **Run the SQL file** `ENABLE_REALTIME.sql` in Supabase SQL Editor
2. **Restart your app** (close and reopen)
3. **Open browser console** (to see real-time logs)

## Test Scenarios

### ✅ Test 1: Real-time Likes (Same Post, Different Devices)

**Setup:**
- Device A: Your account
- Device B: Friend's account or incognito browser
- Both viewing the same post in Discover feed

**Steps:**
1. On Device A, tap the heart icon to like a post
2. **Expected on Device B**: Heart fills and count increases from "1 like" to "2 likes" instantly
3. On Device A, tap heart again to unlike
4. **Expected on Device B**: Heart empties and count decreases to "1 like" instantly

**Console Logs (Device B):**
```
📡 Likes subscription status: SUBSCRIBED
🔥 Real-time like change detected: INSERT
✅ Updated post abc-123: 2 likes
🔥 Real-time like change detected: DELETE
✅ Updated post abc-123: 1 likes
```

---

### ✅ Test 2: Real-time Comments

**Setup:**
- Same as Test 1

**Steps:**
1. On Device A, tap comment icon and add a comment
2. **Expected on Device B**: Comment count updates immediately (e.g., "View all 5 comments" becomes "View all 6 comments")

**Console Logs (Device B):**
```
📡 Comments subscription status: SUBSCRIBED
🔥 Real-time comment change detected: INSERT
✅ Updated post abc-123: 6 comments
```

---

### ✅ Test 3: Multiple People Liking Simultaneously

**Setup:**
- 3+ devices/browsers with different accounts
- All viewing the same post

**Steps:**
1. Everyone tap the heart icon at roughly the same time
2. **Expected**: All devices show the total count updating in real-time
3. Each device should show the correct total (e.g., 3 likes if 3 people liked)

---

### ✅ Test 4: Your Own Actions (Optimistic Updates)

**Setup:**
- Single device

**Steps:**
1. Like a post
2. **Expected**: Heart fills INSTANTLY (before server response)
3. Count updates INSTANTLY
4. If network fails, it reverts back (error handling)

This is called "optimistic updating" - makes the app feel super fast!

---

## Troubleshooting Checklist

### ❌ Nothing updates in real-time

- [ ] Did you run `ENABLE_REALTIME.sql`?
- [ ] Did you restart the app after running SQL?
- [ ] Check console - do you see `📡 Likes subscription status: SUBSCRIBED`?
- [ ] Check Supabase Dashboard → Database → Replication - are checkboxes enabled for `post_likes` and `post_comments`?

### ❌ Console shows "CHANNEL_ERROR" or "CLOSED"

- [ ] Check internet connection
- [ ] Verify Supabase project is active (not paused)
- [ ] Check if free tier real-time limits exceeded (Supabase Dashboard → Settings → Usage)
- [ ] Try creating a new Supabase client connection (restart app)

### ❌ Updates work sometimes but not always

- [ ] This might be due to RLS policies - make sure SELECT policies allow viewing all likes/comments
- [ ] Check if both devices are logged in
- [ ] Verify both devices have internet connection

### ❌ Only my own actions update, not others'

- [ ] Definitely an RLS policy issue
- [ ] Run this SQL:
```sql
-- Allow everyone to view all likes
CREATE POLICY "Anyone can view likes" ON post_likes
  FOR SELECT USING (true);

-- Allow everyone to view all comments  
CREATE POLICY "Anyone can view comments" ON post_comments
  FOR SELECT USING (true);
```

---

## Success Indicators

You know it's working when:

✅ Console shows `SUBSCRIBED` status
✅ Likes update across devices instantly (< 1 second)
✅ Comments count updates in real-time
✅ Multiple rapid likes all register correctly
✅ Your own actions feel instant (optimistic updates)

---

## Performance Check

Open browser console and run:
```javascript
// Check how many channels are subscribed
console.log('Active channels:', window.supabase?.getChannels?.().length);
```

Should show 2 channels (one for likes, one for comments).

If you see many channels (5+), there might be a subscription leak. Refresh the page and check again.

---

## 🎉 When Everything Works

You should see:
- ❤️ Likes update instantly like Instagram
- 💬 Comments count updates in real-time  
- 📱 Multiple devices stay perfectly in sync
- ⚡ Your actions feel lightning-fast (optimistic updates)
- 🎯 Accurate counts even with rapid interactions

This is exactly how Instagram's real-time system works!
