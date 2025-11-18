# Push Notifications Backend Guide

Complete implementation guide for push notifications using Expo and Supabase.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Supabase Edge Function](#supabase-edge-function)
3. [Notification Triggers](#notification-triggers)
4. [Testing](#testing)
5. [Monitoring](#monitoring)

## Prerequisites

### 1. Install Expo Notifications
```bash
npx expo install expo-notifications expo-device expo-constants
```

### 2. Configure app.json
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#007AFF",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ],
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#007AFF"
    }
  }
}
```

### 3. Run SQL Migration
Execute `ADD_PUSH_NOTIFICATIONS.sql` in your Supabase SQL editor.

---

## Supabase Edge Function

### Create Edge Function
```bash
supabase functions new send-push-notification
```

### Function Code
Create `supabase/functions/send-push-notification/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  sound: string;
  title: string;
  body: string;
  data: any;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

serve(async (req) => {
  try {
    const { userId, notificationType, title, body, data } = await req.json();

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user should receive notification
    const { data: shouldSend } = await supabase.rpc('should_send_notification', {
      p_user_id: userId,
      p_notification_type: notificationType,
    });

    if (!shouldSend) {
      return new Response(
        JSON.stringify({ success: true, message: 'Notification blocked by user preferences' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user's push tokens
    const { data: tokens } = await supabase.rpc('get_user_push_tokens', {
      p_user_id: userId,
    });

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No push tokens found' }),
        { headers: { 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Determine channel based on notification type
    const channelId = getChannelId(notificationType);

    // Create push messages
    const messages: PushMessage[] = tokens.map((token: any) => ({
      to: token.token,
      sound: 'default',
      title,
      body,
      data: { ...data, type: notificationType },
      channelId,
      priority: 'high',
    }));

    // Send notifications to Expo
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    // Log notification to database
    await supabase.rpc('log_notification', {
      p_user_id: userId,
      p_notification_type: notificationType,
      p_title: title,
      p_body: body,
      p_data: data,
      p_delivery_status: result.data?.[0]?.status === 'ok' ? 'sent' : 'failed',
    });

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending push notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function getChannelId(notificationType: string): string {
  if (notificationType.includes('message')) return 'messages';
  if (notificationType.includes('request')) return 'requests';
  if (notificationType.includes('session')) return 'sessions';
  return 'default';
}
```

### Deploy Edge Function
```bash
supabase functions deploy send-push-notification
```

---

## Notification Triggers

### Database Triggers for Automatic Notifications

Create triggers to automatically send notifications when events occur:

```sql
-- Trigger when request is accepted
CREATE OR REPLACE FUNCTION notify_request_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    PERFORM net.http_post(
      url := 'https://YOUR_PROJECT.supabase.co/functions/v1/send-push-notification',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body := json_build_object(
        'userId', NEW.mentee_id,
        'notificationType', 'request_accepted',
        'title', 'Request Accepted! 🎉',
        'body', 'Your mentorship request has been accepted',
        'data', json_build_object('requestId', NEW.id)
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER request_accepted_notification
AFTER UPDATE ON mentorship_requests
FOR EACH ROW
EXECUTE FUNCTION notify_request_accepted();

-- Trigger for new requests (to mentor)
CREATE OR REPLACE FUNCTION notify_new_request()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/send-push-notification',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body := json_build_object(
      'userId', NEW.mentor_id,
      'notificationType', 'new_request',
      'title', 'New Mentorship Request 🔔',
      'body', 'You have a new mentorship request',
      'data', json_build_object('requestId', NEW.id)
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER new_request_notification
AFTER INSERT ON mentorship_requests
FOR EACH ROW
EXECUTE FUNCTION notify_new_request();

-- Trigger for new messages
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
BEGIN
  -- Determine recipient (not the sender)
  IF NEW.sender_id = (SELECT mentee_id FROM mentorship_requests WHERE id = NEW.request_id) THEN
    SELECT mentor_id INTO recipient_id FROM mentorship_requests WHERE id = NEW.request_id;
  ELSE
    SELECT mentee_id INTO recipient_id FROM mentorship_requests WHERE id = NEW.request_id;
  END IF;

  PERFORM net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/send-push-notification',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body := json_build_object(
      'userId', recipient_id,
      'notificationType', 'new_message',
      'title', 'New Message 💬',
      'body', LEFT(NEW.message, 100),
      'data', json_build_object('requestId', NEW.request_id, 'messageId', NEW.id)
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER new_message_notification
AFTER INSERT ON request_messages
FOR EACH ROW
EXECUTE FUNCTION notify_new_message();
```

---

## Testing

### 1. Test Local Notification
```typescript
import { pushNotificationService } from './services/pushNotificationService';

// Schedule immediate local notification
await pushNotificationService.scheduleLocalNotification(
  'Test Notification',
  'This is a test notification',
  { type: 'new_message', messageId: '123' }
);
```

### 2. Test Edge Function
```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/send-push-notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "USER_UUID",
    "notificationType": "new_message",
    "title": "Test Notification",
    "body": "This is a test",
    "data": {}
  }'
```

### 3. Verify Token Registration
```sql
-- Check registered tokens
SELECT * FROM push_notification_tokens 
WHERE user_id = 'YOUR_USER_ID' 
AND is_active = true;
```

### 4. Check Notification History
```sql
-- View recent notifications
SELECT * FROM notification_history 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY sent_at DESC 
LIMIT 10;
```

---

## Monitoring

### Analytics Queries

#### Notification Delivery Rate
```sql
SELECT 
  notification_type,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE delivery_status = 'delivered') as delivered,
  COUNT(*) FILTER (WHERE delivery_status = 'failed') as failed,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE delivery_status = 'delivered') / COUNT(*),
    2
  ) as delivery_rate
FROM notification_history
WHERE sent_at > NOW() - INTERVAL '7 days'
GROUP BY notification_type
ORDER BY total_sent DESC;
```

#### User Engagement
```sql
SELECT 
  notification_type,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE read_at IS NOT NULL) as read,
  COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as clicked,
  ROUND(100.0 * COUNT(*) FILTER (WHERE read_at IS NOT NULL) / COUNT(*), 2) as read_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) / COUNT(*), 2) as click_rate
FROM notification_history
WHERE sent_at > NOW() - INTERVAL '30 days'
GROUP BY notification_type
ORDER BY total_sent DESC;
```

#### Active Devices
```sql
SELECT 
  device_type,
  COUNT(*) as active_tokens,
  COUNT(DISTINCT user_id) as unique_users
FROM push_notification_tokens
WHERE is_active = true
GROUP BY device_type;
```

---

## Best Practices

1. **Respect User Preferences**: Always check `should_send_notification()` before sending
2. **Batch Processing**: For multiple users, batch notifications into groups of 100
3. **Rate Limiting**: Limit to 1 notification per user per type per hour to avoid spam
4. **Error Handling**: Log failed notifications and retry with exponential backoff
5. **Token Cleanup**: Periodically remove inactive tokens (30+ days without use)
6. **Testing**: Always test on physical devices, simulators don't receive push notifications
7. **Privacy**: Never include sensitive information in notification body

---

## Troubleshooting

### Notifications Not Received
1. Verify token is registered: Check `push_notification_tokens` table
2. Check user preferences: Query `notification_preferences`
3. Verify Edge Function logs: `supabase functions logs send-push-notification`
4. Check Expo dashboard for delivery status
5. Ensure app has notification permissions enabled

### Invalid Push Token
- Tokens expire or change when app is reinstalled
- Re-register token on each app launch
- Clean up invalid tokens from database

### Silent Notifications
- Check notification channel importance (Android)
- Verify sound files exist in assets
- Check device Do Not Disturb settings

---

## Production Checklist

- [ ] SQL migration executed
- [ ] Edge Function deployed
- [ ] Database triggers created
- [ ] Notification icons added to assets
- [ ] App permissions configured in app.json
- [ ] User preferences UI implemented
- [ ] Notification center UI implemented
- [ ] Token registration on app launch
- [ ] Analytics dashboard setup
- [ ] Error monitoring enabled
