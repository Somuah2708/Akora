# Debug Push Notifications

## Current Status

✅ Code is updated and ready
✅ Push token registration added to app/_layout.tsx
✅ Parameter names are correct (pushTokens)

## Steps to Test & Debug

### 1. Close and Reopen the App

**Both devices (iOS and Android):**
1. **Force quit the app completely**
2. **Reopen the app**
3. Check the Metro console for these logs:
   - `📱 Got push token: ExponentPushToken[...]`
   - `✅ Push token registered successfully`

If you DON'T see these logs, the token isn't being registered.

### 2. Verify Tokens in Supabase

1. Go to Supabase Dashboard
2. Navigate to **Table Editor**
3. Open the `push_notification_tokens` table
4. You should see **2 rows** (one for iOS, one for Android)
5. Check that `is_active` is `true` for both

### 3. Check Edge Function Logs

1. Go to **Edge Functions** in Supabase
2. Click on `send-push-notification`
3. Go to the **Logs** tab
4. Send a test message
5. Check if the Edge Function was invoked

### 4. Test the Full Flow

**On Android device:**
1. Open a chat with the iOS user
2. Send a message: "Test notification"

**On iOS device:**
1. Lock your screen or put app in background
2. You should see a notification appear within 1-2 seconds
3. You should hear the default notification sound

### 5. Common Issues & Fixes

#### Issue: No push token logs appear
**Fix:** Make sure you're logged in. The token registration only runs when `user` exists.

#### Issue: Token logs appear but "Error saving push token"
**Fix:** Run the SQL migrations from CHAT_NOTIFICATIONS_SETUP.md

```sql
-- Check if RPC function exists
SELECT * FROM pg_proc WHERE proname = 'register_push_token';
```

If it doesn't exist, create it using the SQL from Step 6 in the setup guide.

#### Issue: Edge Function not being called
**Check:** Look at Metro console for:
- `Push notification sent successfully` ✅ Good
- `Error sending push notification: ...` ❌ Problem

#### Issue: Notifications work on iOS but not Android
**Reason:** Android requires a development build in Expo. Expo Go doesn't support push notifications on Android.

**Solution for Android:**
```bash
npx expo install expo-dev-client
npx expo prebuild
npx expo run:android
```

This creates a custom development app with full notification support.

### 6. Quick Test Command

Run this in your Supabase SQL Editor to check tokens:

```sql
SELECT 
  user_id, 
  token, 
  device_type, 
  is_active, 
  created_at 
FROM push_notification_tokens 
ORDER BY created_at DESC;
```

You should see entries for both users with their device types.

### 7. Manual Test (If Needed)

Test the Edge Function directly in Supabase:

1. Go to **Edge Functions → send-push-notification**
2. Click **"Invoke"**
3. Paste this (replace with real token from step 6):

```json
{
  "pushTokens": ["ExponentPushToken[YOUR_ACTUAL_TOKEN_HERE]"],
  "title": "Test",
  "body": "Manual test notification",
  "data": {
    "type": "test"
  }
}
```

4. Click **"Invoke"**
5. Check if notification appears on device

---

## Expected Console Output

When everything works correctly:

```
📱 Got push token: ExponentPushToken[xxxxxxxxxxxxxx]
✅ Push token registered successfully
[Message sent]
Push notification sent successfully
```

## Next Steps

1. **Close and reopen both apps**
2. **Check console logs for token registration**
3. **Verify tokens in Supabase table**
4. **Send test message**
5. **Report back what you see** in the console logs
