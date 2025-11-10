# Real-Time Notifications Diagnostic Guide

## 🔍 Step 1: Check Supabase Realtime Settings

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Enable Realtime for notifications table**
   - Go to: **Database** → **Replication**
   - Find `notifications` table
   - **Toggle ON** the realtime switch
   - Click **Save**

3. **Verify Realtime API is enabled**
   - Go to: **Settings** → **API**
   - Scroll to **Realtime**
   - Ensure it's **Enabled**

## 🧪 Step 2: Test Real-Time Connection

### Browser Console Test:
1. Open your app in browser
2. Open Developer Console (F12)
3. Look for these logs:

**Expected logs when app loads:**
```
🔔 [LIB] Subscribing to notifications for user: [USER_ID]
🔔 [LIB] Subscription status: SUBSCRIBED
✅ [LIB] Successfully subscribed to real-time notifications!
🔔 [HOME] Setting up REAL-TIME badge count subscription for user: [USER_ID]
🔔 [HOME] Badge subscription status: SUBSCRIBED
```

**When notification is created (like/comment from another account):**
```
🔔 [LIB] RAW notification payload received: {eventType: 'INSERT', ...}
🔔 [LIB] New notification ID: [NOTIFICATION_ID]
🔔 [LIB] Full notification data fetched: {...}
📨 New notification received: {...}
🔔 [HOME] NEW NOTIFICATION RECEIVED! Payload: {...}
🔔 [HOME] Current badge count: 0
🔔 [HOME] Badge count updated: 0 → 1
```

### If you DON'T see "SUBSCRIBED" status:
- ❌ Realtime is not enabled in Supabase
- ❌ Network/firewall blocking WebSocket connections
- ❌ API key is incorrect

## 🐛 Step 3: Common Issues & Fixes

### Issue 1: Badge count not updating
**Symptom:** Notifications work in the notifications screen, but badge stays at 0

**Fix:**
- The subscription is there, but it needs the realtime replication enabled
- Go to Database → Replication → Enable for `notifications` table

### Issue 2: No real-time connection
**Symptom:** Console shows "CHANNEL_ERROR" or "TIMED_OUT"

**Fix:**
```typescript
// Check your Supabase URL and anon key in lib/supabase.ts
export const supabase = createClient(
  'YOUR_SUPABASE_URL',  // Must be correct
  'YOUR_ANON_KEY'       // Must be correct
);
```

### Issue 3: Notifications delayed
**Symptom:** Notifications appear after 5-10 seconds

**Fix:**
- This is normal if Realtime wasn't enabled before
- After enabling Realtime, it should be instant (<1 second)

### Issue 4: Multiple notification banners
**Symptom:** Same notification appears multiple times

**Fix:**
- This happens if you have multiple tabs/windows open
- Each tab maintains its own subscription (this is expected behavior)

## 🎯 Step 4: Force Real-Time Test

### SQL Test (Run in Supabase SQL Editor):
```sql
-- Manually insert a test notification
-- Replace UUIDs with actual values from your database

INSERT INTO notifications (recipient_id, actor_id, type, content, created_at)
VALUES (
  'YOUR_USER_ID_HERE'::UUID,           -- User who should receive notification
  'ANOTHER_USER_ID_HERE'::UUID,        -- User who triggered action
  'like',                               -- Type
  'Test notification',                  -- Content
  NOW()                                 -- Timestamp
);
```

**Expected result:**
- Banner appears immediately on screen
- Badge count increments
- Console logs show all the 🔔 messages

## 📊 Step 5: Monitor Real-Time Activity

### View active connections:
1. Supabase Dashboard
2. **Database** → **Roles**
3. Check for active subscriptions

### View notification triggers:
```sql
-- Check if triggers are active
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE 'trigger_notify%';

-- Should return 4 rows:
-- trigger_notify_post_like
-- trigger_notify_post_comment
-- trigger_notify_friend_request
-- trigger_notify_friend_accept
```

## ✅ Step 6: Verification Checklist

Before testing, confirm all these are TRUE:

- [ ] Supabase Realtime is enabled (Settings → API)
- [ ] `notifications` table has Realtime enabled (Database → Replication)
- [ ] All 4 triggers exist and are enabled
- [ ] Console shows "SUBSCRIBED" status
- [ ] No console errors
- [ ] Badge count loads on app start (shows current count)

## 🚀 Step 7: Final Test

### Two-Browser Test:
1. **Browser A** (Chrome): Login as User A
   - Open console (F12)
   - Look for "✅ Successfully subscribed" message

2. **Browser B** (Chrome Incognito): Login as User B
   - Navigate to User A's post
   - Click the heart/like button

3. **Back to Browser A**:
   - **Within 1 second**, you should see:
     - Console logs showing notification received
     - Banner slides down at top
     - Badge count increases from 0 → 1
     - Haptic feedback (vibration)

### Two-Device Test:
1. **Phone A**: Login as User A
2. **Phone B**: Login as User B
3. **Phone B**: Like/comment on User A's post
4. **Phone A**: Instant notification appears!

## 🔧 Advanced Debugging

### Check WebSocket Connection:
Open browser Network tab → WS (WebSockets)
- Should see connection to: `wss://[YOUR-PROJECT].supabase.co/realtime/v1/websocket`
- Status should be: `101 Switching Protocols`
- Messages tab should show heartbeat messages

### Test with curl:
```bash
# Test notification creation
curl -X POST 'https://[YOUR-PROJECT].supabase.co/rest/v1/notifications' \
-H "apikey: YOUR_ANON_KEY" \
-H "Authorization: Bearer YOUR_USER_TOKEN" \
-H "Content-Type: application/json" \
-H "Prefer: return=representation" \
-d '{
  "recipient_id": "USER_ID",
  "actor_id": "ACTOR_ID",
  "type": "like",
  "is_read": false
}'
```

## 📝 What Should Happen

### Correct Flow:
```
User B likes post
  ↓ (< 10ms)
Database trigger fires
  ↓ (< 10ms)
Notification row inserted
  ↓ (< 50ms)
Realtime broadcasts to User A's WebSocket
  ↓ (< 50ms)
User A's app receives event
  ↓ (< 50ms)
Badge increments + Banner shows
  ↓ (< 100ms)
Total time: ~200ms (instant!)
```

### If it takes longer than 1 second:
- Realtime is not enabled
- Triggers are not firing
- WebSocket connection is broken

## 🆘 Still Not Working?

Run this in Supabase SQL Editor:
```sql
-- Check if realtime is enabled for notifications table
SELECT schemaname, tablename, 
       (select count(*) from pg_publication_tables where tablename = 'notifications') as is_replicated
FROM pg_tables 
WHERE tablename = 'notifications';

-- Should show is_replicated = 1
-- If 0, run this:
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

---

After following this guide, your notifications should work in real-time with <1 second latency!
