# Chat Message Flow - Comprehensive Debug Guide

## Complete Message Flow (WhatsApp-Style)

### 1. User A Sends Message to User B

**Expected Flow:**
1. ✅ User A types message and taps send
2. ✅ Message appears instantly in User A's chat (optimistic UI)
3. ✅ Message sent to database via `sendDirectMessage()`
4. ✅ Database INSERT triggers real-time subscription
5. ✅ User B's subscription receives the message
6. ✅ Message appears in User B's chat instantly
7. ✅ Push notification sent to User B
8. ✅ Unread count updates in User B's chat list
9. ✅ When User B opens chat, messages are marked as read/delivered

### 2. Logging to Monitor

With the comprehensive logging added, you'll see:

#### On Sender Side (User A):
```
📤 [SEND] Starting to send message...
📤 [SEND] User: <user-id> Friend: <friend-id>
📤 [SEND] Temp ID: temp-1234567890
📤 [SEND] Adding optimistic message to UI
📤 [SEND] Current messages: 10
📤 [SEND] New messages after optimistic: 11
💾 [CACHE] Saving thread: thread:<key> with 11 messages
✅ [CACHE] Saved to memory cache
✅ [CACHE] Saved to AsyncStorage
📤 [SEND] Sending to server...
📧 [DB] sendDirectMessage called: {...}
✅ [DB] Message inserted successfully: {...}
🔔 [DB] Triggering push notification...
✅ [SEND] Server returned message: <real-id>
📤 [SEND] Replacing optimistic message with real one
💾 [CACHE] Saving thread: thread:<key> with 11 messages
✅ [SEND] Message sent successfully!
```

#### On Receiver Side (User B):
```
📡 [REALTIME] Received INSERT event: {...}
🔔 [REALTIME] Processing new message: {...}
👤 [REALTIME] Fetching sender profile for: <sender-id>
✅ [REALTIME] Fetched sender profile: <name>
📝 [REALTIME] Current messages count: 10
📝 [REALTIME] New messages count: 11
💾 [CACHE] Saving thread: thread:<key> with 11 messages
📬 [REALTIME] Marking incoming message as delivered/read: <msg-id>
✅ [REALTIME] Message marked as delivered and read
```

#### Push Notification Flow:
```
🔔 [PUSH] Starting notification process...
🔔 [PUSH] Sender: <sender-id> Receiver: <receiver-id>
✅ [PUSH] Sender found: <sender-name>
🔍 [PUSH] Token query result: {...}
✅ [PUSH] Found 1 token(s) for receiver
📤 [PUSH] Calling Edge Function with: {...}
📥 [PUSH] Edge Function response: {...}
✅ [PUSH] Push notification sent successfully!
```

### 3. When User B Opens Chat

```
📦 [CACHE] Getting cached thread: thread:<key>
✅ [CACHE] Found in memory: 11 messages
✅ [CACHE] Showing cached messages: 11
🕒 [CACHE] Age: 45 seconds, Fresh: true
✅ [CACHE] Cache is fresh, skipping cloud fetch
📡 [REALTIME] Setting up subscription for conversation: <conversation-id>
✅ [REALTIME] Successfully subscribed to messages
```

### 4. Common Issues & Solutions

#### Issue: "Messages not appearing for receiver"
**Check:**
- Is the subscription receiving INSERT events? (Look for `📨 [REALTIME] Received INSERT event`)
- Is `handleNewMessage` being called? (Look for `🔔 [REALTIME] Processing new message`)
- Are messages being added to state? (Look for `📝 [REALTIME] New messages count`)

**Debug:**
```javascript
// In console, filter logs:
"REALTIME"  // See all real-time events
"INSERT"    // See database inserts
"Processing new message"  // See message handling
```

#### Issue: "Unread count shows but messages don't display"
**Check:**
- Is cache being loaded? (Look for `📦 [CACHE] Getting cached thread`)
- Is database fetch working? (Look for `📥 [DB] Fetched X messages`)
- Are messages being set to state? (Look for `Messages loaded and cached`)

**Debug:**
```javascript
// Clear cache and reload:
AsyncStorage.clear()
// Restart app
```

#### Issue: "Notifications not arriving"
**Check:**
- Is notification function being called? (Look for `🔔 [DB] Triggering push notification`)
- Are tokens found? (Look for `✅ [PUSH] Found X token(s)`)
- Is Edge Function responding? (Look for `📥 [PUSH] Edge Function response`)

**Debug:**
- Check push notification tokens in database: `push_notification_tokens` table
- Verify Edge Function is deployed: `send-push-notification`
- Check receiver device has granted notification permissions

#### Issue: "Messages appear but in wrong order"
**Check:**
- Messages should be sorted descending (newest first)
- FlatList should be `inverted={true}`
- Index 0 = newest message (bottom of screen)

**Verify:**
```javascript
// Messages array should be sorted like this:
messages[0].created_at > messages[1].created_at > messages[2].created_at
```

### 5. Real-Time Subscription Health Check

**Subscription should log:**
```
📡 [REALTIME] Setting up subscription for conversation: <id>
📡 [REALTIME] Subscription status: SUBSCRIBED
✅ [REALTIME] Successfully subscribed to messages
```

**If subscription fails:**
```
📡 [REALTIME] Subscription status: CHANNEL_ERROR
❌ [REALTIME] Subscription error
```

**Fix:** Check Supabase connection, API keys, and real-time settings

### 6. Testing Checklist

- [ ] User A sends message → appears instantly in User A's chat
- [ ] User B receives real-time update → message appears in User B's chat
- [ ] User B gets push notification (if app in background)
- [ ] Unread count in chat list increases for User B
- [ ] When User B opens chat, messages are visible
- [ ] When User B opens chat, unread count resets to 0
- [ ] Messages marked as "delivered" (checkmark)
- [ ] Messages marked as "read" when User B views them
- [ ] User B sends reply → User A receives it instantly
- [ ] Both users see messages in correct order (newest at bottom)
- [ ] Messages persist after app restart (cache working)
- [ ] Messages sync from cloud if cache is stale (>5 minutes)

### 7. Performance Metrics

**Optimistic UI:** Message should appear in <100ms
**Real-time delivery:** Message should arrive in <500ms
**Push notification:** Should arrive in <2 seconds
**Cache load:** Should show messages in <200ms
**Cloud fetch:** Should complete in <1 second

### 8. Emergency Debugging

If messages are completely broken:

1. **Clear all caches:**
   ```javascript
   AsyncStorage.clear()
   // Restart app
   ```

2. **Check database directly:**
   ```sql
   SELECT * FROM direct_messages 
   WHERE (sender_id = '<user-a>' AND receiver_id = '<user-b>')
      OR (sender_id = '<user-b>' AND receiver_id = '<user-a>')
   ORDER BY created_at DESC
   LIMIT 20;
   ```

3. **Verify real-time is enabled:**
   - Supabase Dashboard → Settings → API
   - Real-time should be enabled for `direct_messages` table

4. **Check RLS policies:**
   ```sql
   -- Users should be able to read their own messages
   SELECT * FROM direct_messages WHERE receiver_id = auth.uid() OR sender_id = auth.uid();
   ```

## Summary

The chat system now has **comprehensive logging** at every step:
- ✅ Message sending (optimistic → server → confirmation)
- ✅ Real-time subscriptions (INSERT and UPDATE events)
- ✅ Message caching (memory + AsyncStorage)
- ✅ Database operations (fetch, insert, update)
- ✅ Push notifications (trigger → send → response)
- ✅ Read receipts (delivered → read)

**All logs use emojis for easy visual scanning** - just look for ❌ (errors) or ✅ (success) in your console!
