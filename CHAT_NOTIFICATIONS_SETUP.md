# Chat Push Notifications Setup

## Implementation Status

✅ **Completed:**
1. Created `lib/chatNotifications.ts` with notification functions
2. Integrated notifications into `sendDirectMessage()` and `sendGroupMessage()`
3. Push notifications will trigger automatically when messages are sent

## What's Working:

When a user sends a message:
- The message is saved to the database
- A push notification is automatically sent to the receiver
- Notification includes sender name, message preview, and sound
- Works for both direct messages and group chats

## Notification Types:

### Direct Messages:
- **Text**: Shows actual message content (truncated to 100 chars)
- **Image**: Shows "📷 Photo"
- **Video**: Shows "🎥 Video"
- **Voice**: Shows "🎤 Voice message"
- **Document**: Shows "📄 Document"
- **Post**: Shows "📝 Shared a post"

### Group Messages:
- Shows group name as title
- Shows "SenderName: Message" as body
- Includes appropriate emoji for media types

## Required Backend Setup (Supabase Edge Function)

You need to create a Supabase Edge Function called `send-push-notification`:

### 1. Create the Edge Function:

```bash
supabase functions new send-push-notification
```

### 2. Add this code to `supabase/functions/send-push-notification/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface PushNotificationPayload {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  channelId?: string;
}

serve(async (req) => {
  try {
    const { tokens, title, body, data, sound = 'default', channelId = 'default' } = await req.json() as PushNotificationPayload;

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No tokens provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prepare Expo push notifications
    const messages = tokens.map(token => ({
      to: token,
      sound: sound,
      title: title,
      body: body,
      data: data || {},
      channelId: channelId,
      priority: 'high',
    }));

    // Send to Expo Push Notification service
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending push notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### 3. Deploy the Edge Function:

```bash
supabase functions deploy send-push-notification
```

## Database Requirements:

Make sure you have the `push_notification_tokens` table with this structure:

```sql
CREATE TABLE IF NOT EXISTS push_notification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type TEXT NOT NULL, -- 'ios', 'android', 'web'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE INDEX idx_push_tokens_user_id ON push_notification_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON push_notification_tokens(is_active);
```

And this RPC function:

```sql
CREATE OR REPLACE FUNCTION register_push_token(
  p_user_id UUID,
  p_token TEXT,
  p_device_type TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO push_notification_tokens (user_id, token, device_type, is_active)
  VALUES (p_user_id, p_token, p_device_type, true)
  ON CONFLICT (user_id, token)
  DO UPDATE SET 
    is_active = true,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Testing:

1. **Register for notifications**: App automatically registers on login
2. **Send a message**: Open direct chat and send any message
3. **Check notification**: Receiver should get a notification at the top of their phone
4. **Test different types**: Try sending images, videos, voice notes

## Troubleshooting:

If notifications aren't working:

1. Check Expo Go logs: `npx expo start`
2. Verify push tokens are saved: Query `push_notification_tokens` table
3. Check Edge Function logs: `supabase functions logs send-push-notification`
4. Ensure phone has notifications enabled for the app
5. Test on physical device (push notifications don't work in simulator)

## What Happens When User Receives Notification:

1. **App in foreground**: Banner appears at top, sound plays
2. **App in background**: Notification appears in notification center with sound
3. **App closed**: Notification appears in notification center with sound
4. **Tapping notification**: Opens the chat with that person/group

## Sound:

- Uses default system notification sound
- Can be customized per notification type
- Respects phone's Do Not Disturb settings

---

**Note**: Make sure to test on a real device, as push notifications don't work in iOS Simulator or Android Emulator.
