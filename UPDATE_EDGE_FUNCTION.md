# Update Edge Function for Badge Support

Your Edge Function needs to be updated to handle badge counts and proper notification settings. Here's the updated code:

## Updated Edge Function Code

Replace your `send-push-notification` Edge Function with this code:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  try {
    const { pushTokens, title, body, data, badge = 1, sound = 'default', priority = 'default' } = await req.json();

    if (!pushTokens || !Array.isArray(pushTokens) || pushTokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'pushTokens array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Format messages for Expo Push API
    const messages = pushTokens.map(token => ({
      to: token,
      sound: sound,
      title: title,
      body: body,
      data: data || {},
      badge: badge,
      priority: priority,
      channelId: 'default',
    }));

    console.log('Sending push notifications:', JSON.stringify(messages, null, 2));

    // Send to Expo Push API
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log('Expo Push API response:', JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

## What Changed

1. **Added `badge` parameter**: Sets the badge count on the app icon (default: 1)
2. **Added `sound` parameter**: Enables notification sound (default: 'default')
3. **Added `priority` parameter**: Sets notification priority (default: 'default', can be 'high')
4. **Added `channelId`**: References the Android notification channel

## How to Deploy

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions**
3. Find `send-push-notification` function
4. Click **Edit**
5. Replace the code with the updated version above
6. Click **Deploy**

## Testing

After deployment, send a message and check:
- ✅ Banner appears at top of screen
- ✅ Notification stays in notification center
- ✅ Badge count appears on app icon (iOS)
- ✅ Sound plays
- ✅ Tapping notification opens correct screen
