# 🔴 CRITICAL: Enable Real-Time for Notifications

## ⚠️ The Issue

Your badge count doesn't update in real-time because **Supabase Realtime replication is not enabled** for the `notifications` table.

## ✅ THE FIX (Takes 30 seconds)

### Option 1: Supabase Dashboard (EASIEST)

1. **Go to Supabase Dashboard** → Your Project
2. Click **Database** (left sidebar)
3. Click **Replication** (top tabs)
4. Find the **`notifications`** table in the list
5. **Toggle the switch to ON** (green)
6. Click **Save**
7. **Done!** ✅

### Option 2: SQL Editor

1. Open **SQL Editor** in Supabase
2. Paste this command:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```
3. Click **Run**
4. **Done!** ✅

## 🧪 Test Real-Time Immediately

After enabling realtime:

### Test 1: Console Logs
1. Reload your app
2. Open browser console (F12)
3. You should see:
```
✅ [LIB] Successfully subscribed to real-time notifications!
🔔 [HOME] Badge subscription status: SUBSCRIBED
```

### Test 2: Two Browsers
1. **Browser A**: Your main account (Chrome)
2. **Browser B**: Test account (Chrome Incognito)
3. **Browser B**: Like a post by Browser A's user
4. **Browser A**: Watch badge count **instantly** increase! 🎉

Expected timeline:
- **0ms**: User B clicks like
- **~200ms**: Badge count increases on User A's screen
- **~300ms**: Banner appears at top with vibration

## 🚀 What You'll See After Enabling Realtime

### Before (Current Behavior):
```
Like post → Wait → Tap notifications → Refresh → See count update ❌
```

### After (Real-Time Behavior):
```
Like post → INSTANT badge update + banner pop-up! ✅
(< 1 second from action to notification)
```

## 📊 How To Know It's Working

### Console Logs (Open F12):
When someone likes your post, you'll see this sequence:

```javascript
🔔 [LIB] RAW notification payload received: {eventType: 'INSERT', ...}
🔔 [LIB] New notification ID: abc123...
🔔 [LIB] Full notification data fetched: {type: 'like', ...}
📨 New notification received: {actor: {full_name: 'John'}, ...}
🔔 [HOME] NEW NOTIFICATION RECEIVED! Payload: {...}
🔔 [HOME] Current badge count: 0
🔔 [HOME] Badge count updated: 0 → 1
```

### Visual Indicators:
1. **Badge count** jumps from 0 → 1 (instantly)
2. **Banner slides down** from top
3. **Device vibrates**
4. **Message shows**: "John liked your post"

## 🎯 Why This Happens

### Technical Explanation:
- Supabase Realtime uses **PostgreSQL replication**
- By default, new tables are NOT included in replication
- You must explicitly add tables to the `supabase_realtime` publication
- Without this, subscriptions connect but receive no events

### The Fix:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```
This tells PostgreSQL to broadcast all INSERT/UPDATE/DELETE events on the `notifications` table to connected WebSocket clients.

## 🔍 Verify Realtime Is Enabled

Run this in SQL Editor:
```sql
-- Check if realtime is enabled
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'notifications';

-- Should return 1 row with tablename = 'notifications'
-- If empty, realtime is NOT enabled yet
```

## 📝 Complete Checklist

Before testing, make sure:

- [ ] Realtime is enabled for `notifications` table (Database → Replication)
- [ ] App is reloaded after enabling realtime
- [ ] Browser console shows "SUBSCRIBED" status
- [ ] Two different accounts ready to test
- [ ] Network is stable (not on VPN that blocks WebSockets)

## 🎉 Expected Result

After enabling realtime, your app will have:

✅ **Instant badge updates** (< 1 second)
✅ **Real-time pop-up banners** 
✅ **No refresh needed**
✅ **Professional Instagram-like experience**
✅ **Haptic feedback on notification arrival**

## 🆘 Still Not Working?

### Check 1: WebSocket Connection
- Open browser DevTools → Network tab → WS filter
- Should see: `wss://[PROJECT].supabase.co/realtime/v1/websocket`
- Status: `101 Switching Protocols` (green)

### Check 2: Supabase Realtime Setting
- Dashboard → Settings → API
- Scroll to **Realtime** section
- Ensure toggle is **ON** (green)

### Check 3: Database Triggers
```sql
-- Verify triggers exist
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name LIKE 'trigger_notify%';

-- Should return 4 triggers
```

### Check 4: Test Manual Insert
```sql
-- Insert test notification
INSERT INTO notifications (recipient_id, actor_id, type)
VALUES (
  'YOUR_USER_ID'::UUID,
  'ANOTHER_USER_ID'::UUID, 
  'like'
);

-- If badge updates instantly, realtime is working!
```

## 📖 Resources

- **Diagnostic Guide**: See `REALTIME_DIAGNOSTIC_GUIDE.md`
- **Full Documentation**: See `NOTIFICATIONS_IMPLEMENTATION_SUMMARY.md`
- **Quick Start**: See `QUICK_START_NOTIFICATIONS.md`

---

## ⚡ TL;DR

**Run this ONE command in Supabase SQL Editor:**

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

**Then reload your app and test. Badge should update in real-time!** 🚀

