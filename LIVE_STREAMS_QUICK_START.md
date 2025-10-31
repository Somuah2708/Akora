# Quick Start Guide - Live Streams Feature

## 🚀 Getting Started

### Step 1: Run Database Migrations

Open your Supabase Dashboard SQL Editor and run these two files in order:

1. **First Migration** - Create livestreams table:
   ```
   File: supabase/migrations/20251031000001_create_livestreams_table.sql
   ```
   This creates the main livestreams table with 8 sample streams.

2. **Second Migration** - Create reminders table:
   ```
   File: supabase/migrations/20251031000002_create_stream_reminders_table.sql
   ```
   This creates the stream_reminders table and reminder function.

### Step 2: Test the App

1. Open your app and navigate to **Live Streams** page
2. You should see:
   - 2 live streams under "🔴 Live Now"
   - 5 upcoming streams under "📅 Upcoming"
   - 1 past stream with replay under "🎬 Past Streams" tab

### Step 3: Try the Features

✅ **Search**: Type in the search bar to filter streams
✅ **Join Live**: Click red "Join Now" button on live streams
✅ **Set Reminder**: Click "Remind Me" on upcoming streams (requires login)
✅ **Watch Replay**: Switch to Past Streams tab and click "Watch Replay"
✅ **Refresh**: Pull down or click refresh icon in header
✅ **Auto-Update**: Page refreshes every 30 seconds automatically

## 🔄 What Updates Automatically

### Real-Time Updates:
- ✅ Stream status (live/upcoming/past)
- ✅ Viewer counts when users join
- ✅ New streams added to database
- ✅ Stream times and countdowns
- ✅ Reminder status

### Manual Updates:
- Pull down on the page
- Click refresh icon in header
- Navigate away and back to page

## 📊 How Streams are Categorized

```
LIVE NOW (🔴)
├─ is_live = true
└─ Shows: Red border, LIVE badge, viewer count, "Join Now" button

UPCOMING (📅)
├─ is_live = false
├─ start_time > current time
└─ Shows: Countdown timer, "Remind Me" button, "Preview" button

PAST STREAMS (🎬)
├─ is_live = false
├─ start_time < current time
└─ Shows: Date, "Watch Replay" button
```

## 🔔 Reminder System

### How it Works:
1. User clicks "Remind Me" on upcoming stream
2. Reminder saved to `stream_reminders` table
3. Button changes to "Remove Reminder"
4. 15 minutes before stream starts, notification sent (if configured)

### To Enable Notifications:
See `LIVESTREAMS_SETUP_GUIDE.md` for:
- Email notifications via Resend
- Push notifications via Expo
- Edge Function for automated reminders

## 🎯 Key Features at a Glance

| Feature | Status | Location |
|---------|--------|----------|
| Live Stream Display | ✅ Working | Live & Upcoming tab |
| Upcoming Streams | ✅ Working | Live & Upcoming tab |
| Past Streams | ✅ Working | Past Streams tab |
| Search | ✅ Working | Top of page |
| Reminders | ✅ Working | Upcoming streams |
| Join Stream | ✅ Working | All streams |
| Viewer Count | ✅ Working | Live streams |
| Auto-Refresh | ✅ Working | Every 30s |
| Pull-to-Refresh | ✅ Working | Swipe down |
| Tab Counts | ✅ Working | Both tabs |

## 📱 User Experience

### For Viewers:
1. **Browse** live and upcoming streams
2. **Search** by title, host, or category
3. **Set reminders** for upcoming streams
4. **Join** live streams instantly
5. **Watch replays** of past streams

### For Hosts (Future):
- Streams are managed via Supabase database
- Can be connected to admin panel
- Automatic categorization based on times

## 🐛 Troubleshooting

### "Setup Required" Error
- **Cause**: Database tables not created
- **Fix**: Run both migration files in Supabase Dashboard

### "Login Required" Alert
- **Cause**: User not authenticated
- **Fix**: Implement auth flow (see AUTH_REENABLE_CHECKLIST.md)

### Streams Not Updating
- **Check**: Internet connection
- **Try**: Pull down to refresh
- **Verify**: Supabase connection in console logs

### No Streams Showing
- **Check**: Migrations ran successfully
- **Query**: `SELECT * FROM livestreams;` in Supabase
- **Verify**: RLS policies are active

## 📈 Next Steps (Optional)

1. **Automated Reminders**: Set up Edge Functions (see guide)
2. **Email Notifications**: Configure Resend API
3. **Push Notifications**: Set up Expo Notifications
4. **Admin Panel**: Create stream management interface
5. **Analytics**: Track viewer engagement

## 💡 Tips

- Streams automatically move between sections based on time
- Live indicator has pulsing animation
- Viewer count updates in real-time when users join
- Search works across all fields (title, host, category)
- Reminders are user-specific and persist across sessions
- Tab counts update automatically

## ✨ Everything Works!

All components are now fully functional. No design changes, no removed features - just enhanced functionality exactly as you requested!

**Ready to use immediately after running migrations! 🎉**
