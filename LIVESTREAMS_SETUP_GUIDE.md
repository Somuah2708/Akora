# Live Streams Setup Guide

## 📋 Overview
This guide will help you set up the Live Streams feature with Supabase database integration, automatic reminders, and notification system.

## 🗃️ Database Setup

### Step 1: Run Migrations in Supabase

Go to your Supabase Dashboard → SQL Editor and run these migrations in order:

#### 1. Create Livestreams Table
Run: `supabase/migrations/20251031000001_create_livestreams_table.sql`

This creates:
- `livestreams` table with all stream information
- Indexes for fast queries
- RLS policies for public viewing
- 8 sample livestreams (2 live, 5 upcoming, 1 past with replay)

#### 2. Create Stream Reminders Table  
Run: `supabase/migrations/20251031000002_create_stream_reminders_table.sql`

This creates:
- `stream_reminders` table to track user reminders
- Indexes and RLS policies
- `check_stream_reminders()` function for automated reminders

### Step 2: Verify Tables Created

Run this query to verify:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('livestreams', 'stream_reminders');
```

You should see both tables listed.

## 📱 Features Implemented

### ✅ Live & Upcoming Tab
- **Live Streams**: Shows currently active streams with "LIVE" indicator
  - Real-time viewer count display
  - Red border highlighting
  - "Join Now" button to open stream URL
  
- **Upcoming Streams**: Shows future scheduled streams
  - Countdown display (e.g., "in 2 hours")
  - "Remind Me" button to set notifications
  - Preview button to check stream details

### ✅ Past Streams Tab
- Shows completed streams
- "Watch Replay" button for streams with replay URLs
- Date display for historical reference

### ✅ Stream Reminders
- Users can click "Remind Me" to get notified 15 minutes before stream starts
- Reminders are stored per user in `stream_reminders` table
- Button toggles between "Remind Me" and "Remove Reminder"
- Requires user authentication

### ✅ Stream Cards Display
- Thumbnail image (if available)
- Stream title and description
- Host information with avatar
- Category badge
- Time information (live/upcoming/past)
- Viewer count (for live streams)
- Action buttons (Join/Remind/Replay)

## 🔔 Setting Up Automatic Reminders

### Option 1: Using Supabase Edge Functions (Recommended)

Create a new Edge Function to run every minute and check for reminders:

```typescript
// supabase/functions/check-reminders/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Find reminders for streams starting in 15 minutes
  const { data: reminders, error } = await supabase
    .from('stream_reminders')
    .select(`
      id,
      user_id,
      stream_id,
      livestreams (
        title,
        start_time,
        stream_url
      )
    `)
    .eq('reminder_sent', false)
    .gte('livestreams.start_time', new Date(Date.now() + 14 * 60000).toISOString())
    .lte('livestreams.start_time', new Date(Date.now() + 16 * 60000).toISOString())

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  // Send notifications for each reminder
  for (const reminder of reminders || []) {
    // Get user email
    const { data: { user } } = await supabase.auth.admin.getUserById(reminder.user_id)
    
    if (user?.email) {
      // TODO: Send email or push notification here
      console.log(`Reminder for ${user.email}: ${reminder.livestreams.title}`)
      
      // Mark reminder as sent
      await supabase
        .from('stream_reminders')
        .update({ reminder_sent: true })
        .eq('id', reminder.id)
    }
  }

  return new Response(JSON.stringify({ checked: reminders?.length || 0 }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

Deploy the function:
```bash
supabase functions deploy check-reminders
```

### Option 2: Using Supabase pg_cron Extension

Enable pg_cron in your Supabase project and schedule the function:

```sql
SELECT cron.schedule(
  'check-stream-reminders',
  '* * * * *', -- Run every minute
  $$SELECT check_stream_reminders()$$
);
```

### Option 3: External Cron Job

Set up a cron job on your server to call the Supabase function:

```bash
# Add to crontab -e
* * * * * curl -X POST https://your-project.supabase.co/functions/v1/check-reminders
```

## 📧 Email Notifications Setup

To send actual email notifications, integrate with an email service:

### Using Resend (Recommended)

1. Sign up at https://resend.com
2. Get your API key
3. Add to Edge Function:

```typescript
import { Resend } from 'https://esm.sh/resend@2.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

await resend.emails.send({
  from: 'notifications@yourdomain.com',
  to: user.email,
  subject: `Reminder: ${stream.title} starts in 15 minutes!`,
  html: `
    <h2>${stream.title}</h2>
    <p>Your stream is starting soon!</p>
    <a href="${stream.stream_url}">Join Now</a>
  `
})
```

## 📲 Push Notifications Setup

For mobile push notifications, use Expo Notifications:

1. Install dependencies:
```bash
npx expo install expo-notifications expo-device expo-constants
```

2. Request permissions in app:
```typescript
import * as Notifications from 'expo-notifications';

async function registerForPushNotificationsAsync() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    return;
  }
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  // Save token to user profile in Supabase
}
```

3. Send notifications from Edge Function:
```typescript
const message = {
  to: pushToken,
  sound: 'default',
  title: stream.title,
  body: 'Stream starting in 15 minutes!',
  data: { streamId: stream.id }
};

await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(message),
});
```

## 🧪 Testing

### Test Sample Data

The migrations include sample livestreams:
- 2 currently live streams
- 5 upcoming streams (various times)
- 1 past stream with replay URL

### Test Reminders

1. Log in to the app
2. Navigate to Live Streams
3. Click "Remind Me" on an upcoming stream
4. Check `stream_reminders` table:
```sql
SELECT * FROM stream_reminders WHERE user_id = 'your-user-id';
```

### Test Reminder Function

Run manually:
```sql
SELECT check_stream_reminders();
```

## 📊 Monitoring

### View Active Streams
```sql
SELECT title, host_name, viewer_count, start_time
FROM livestreams
WHERE is_live = true
ORDER BY viewer_count DESC;
```

### View Reminder Statistics
```sql
SELECT 
  COUNT(*) as total_reminders,
  COUNT(CASE WHEN reminder_sent THEN 1 END) as sent,
  COUNT(CASE WHEN NOT reminder_sent THEN 1 END) as pending
FROM stream_reminders;
```

### Most Popular Streams
```sql
SELECT 
  ls.title,
  ls.host_name,
  COUNT(sr.id) as reminder_count
FROM livestreams ls
LEFT JOIN stream_reminders sr ON ls.id = sr.stream_id
GROUP BY ls.id
ORDER BY reminder_count DESC
LIMIT 10;
```

## 🎨 Customization

### Update Stream Status

To manually set a stream as live:
```sql
UPDATE livestreams
SET is_live = true, viewer_count = 100
WHERE id = 'stream-id';
```

### Add New Streams

```sql
INSERT INTO livestreams (
  title,
  description,
  short_description,
  thumbnail_url,
  stream_url,
  host_name,
  host_avatar_url,
  category,
  is_live,
  start_time
) VALUES (
  'My New Stream',
  'Full description here...',
  'Short description',
  'https://example.com/thumbnail.jpg',
  'https://meet.google.com/abc-defg-hij',
  'Host Name',
  'https://example.com/avatar.jpg',
  'Event',
  false,
  '2025-11-01 14:00:00+00'
);
```

## 🔐 Security

- RLS policies ensure users can only manage their own reminders
- Stream viewing is public (no authentication required)
- Stream creation/updates require authentication
- Service role key needed for Edge Functions to bypass RLS

## 📝 Notes

- All times are stored in UTC (TIMESTAMPTZ)
- Reminders are sent 15 minutes before stream start
- Viewer counts are manually updated (can be automated with real streaming platform APIs)
- Replay URLs are optional and can be added after stream ends

## 🚀 Next Steps

1. ✅ Run migrations in Supabase
2. ✅ Verify tables created
3. ✅ Test the app and stream cards display
4. ⚠️ Set up Edge Function for automated reminders
5. ⚠️ Configure email service (Resend/SendGrid)
6. ⚠️ Set up push notifications (optional)
7. ⚠️ Monitor and adjust reminder timing as needed

## 🆘 Troubleshooting

**Streams not showing?**
- Verify migrations ran successfully
- Check RLS policies allow SELECT
- Confirm sample data was inserted

**Reminders not working?**
- Check Edge Function is deployed
- Verify cron job is running
- Check reminder_sent flags in database

**Join button not working?**
- Ensure stream_url is valid
- Check device can open external URLs
- Test URL in browser first

---

For more help, check Supabase docs: https://supabase.com/docs
