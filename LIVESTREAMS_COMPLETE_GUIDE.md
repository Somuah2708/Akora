# Live Streams Feature - Complete Setup Guide

## 🎥 Overview
Professional live streaming platform with YouTube integration, admin management, and real-time updates.

## ✨ Features

### User Features
- **Live Now Tab**: See all currently live streams with real-time status
- **Past Streams Tab**: Browse archived streams and recordings
- **YouTube Integration**: Seamlessly opens YouTube app or web player
- **Search**: Find streams by title, description, or category
- **Real-time Updates**: Streams appear instantly when admins add them
- **Beautiful UI**: Modern card-based design with thumbnails and metadata

### Admin Features
- **Full Stream Management**: Create, edit, and delete streams
- **Thumbnail Upload**: Upload custom 16:9 thumbnails from device
- **YouTube URL Support**: Paste any YouTube link (live or recorded)
- **Live Status Toggle**: Mark streams as live or end them with one tap
- **Category & Host Info**: Organize streams with categories and host details
- **Viewer Count Tracking**: Automatic viewer count increment

## 📋 Setup Instructions

### Step 1: Run Database Migration

Run the migration to set up the enhanced schema with admin support:

```bash
# Navigate to your Supabase project dashboard
# Go to SQL Editor and run:
```

```sql
-- File: supabase/migrations/20251110000001_enhance_livestreams_admin.sql
```

This migration will:
- Add admin-only permissions for creating/editing streams
- Create storage bucket for thumbnails
- Set up proper RLS policies
- Add creator tracking fields

### Step 2: Configure Storage

The migration automatically creates the `livestream-thumbnails` bucket, but if you need to create it manually:

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `post-media` (if it doesn't exist)
3. Make it public
4. The migration handles the rest!

### Step 3: Grant Admin Access

To make a user an admin:

```sql
-- In Supabase SQL Editor, run:
UPDATE profiles
SET is_admin = true
WHERE id = 'USER_ID_HERE';
```

Or update via the profiles table in the Supabase dashboard.

### Step 4: Test the Feature

1. **As Admin:**
   - Navigate to Live Streams from the Hub
   - Tap the Settings icon (gear) in the header
   - Tap the + button to create a new stream
   - Upload a thumbnail (16:9 ratio recommended)
   - Paste a YouTube URL (e.g., `https://youtube.com/watch?v=VIDEO_ID`)
   - Fill in title, description, category
   - Toggle "Stream is Live" if it's currently live
   - Tap Save

2. **As User:**
   - Navigate to Live Streams from the Hub
   - See streams in "Live Now" or "Past Streams" tabs
   - Tap a stream card to watch on YouTube
   - Pull down to refresh

## 🎯 How to Use

### For Admins: Adding a Live Stream

1. **Get the YouTube URL:**
   - Start your live stream on YouTube
   - Copy the stream URL or video URL
   - Example: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`

2. **Create the Stream:**
   - Open the app → Hub → Live Stream
   - Tap Settings icon → Tap + button
   - Upload a nice thumbnail (screenshot from the stream works great!)
   - Paste the YouTube URL
   - Add title like "Alumni Homecoming 2025 - Opening Ceremony"
   - Add description
   - Choose category (Event, Ceremony, Conference, etc.)
   - Toggle "Stream is Live" to ON
   - Tap Save

3. **Manage Stream:**
   - Toggle "End Stream" when the stream finishes
   - Edit details anytime by tapping the edit icon
   - Delete streams you no longer need

### For Users: Watching Streams

1. **Browse Streams:**
   - Live Now: See what's currently streaming
   - Past Streams: Watch recordings of past events

2. **Watch:**
   - Tap any stream card
   - YouTube app opens automatically
   - Watch the stream!

## 🏗️ File Structure

```
app/
├── live/
│   ├── index.tsx          # User-facing stream viewer
│   ├── admin.tsx          # Admin management panel
│   └── _layout.tsx        # Navigation layout
lib/
├── livestreams.ts         # Helper functions and API
└── supabase.ts            # Existing Supabase client
supabase/
└── migrations/
    └── 20251110000001_enhance_livestreams_admin.sql
```

## 🎨 Design Highlights

- **Modern Card Layout**: Beautiful 16:9 thumbnail cards
- **Live Indicators**: Red "LIVE" badge with WiFi icon
- **Smart Date Formatting**: "2 hours ago" or "Nov 10, 2025"
- **Viewer Count**: Formatted counts (1.2K, 5.3M)
- **Tab Navigation**: Clean tabs for Live/Past separation
- **Pull to Refresh**: Swipe down to refresh streams
- **Empty States**: Friendly messages when no streams available

## 🔐 Security

- **Admin-Only Creation**: Only admins can add/edit/delete streams
- **Public Viewing**: Anyone can view streams (no login required)
- **RLS Policies**: Proper row-level security on database
- **Thumbnail Storage**: Secure upload with admin-only write access

## 📱 Supported Platforms

- ✅ iOS
- ✅ Android
- ✅ Web (opens YouTube in browser)

## 🎬 YouTube Integration

The app supports various YouTube URL formats:

- `https://youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://youtube.com/embed/VIDEO_ID`
- `https://youtube.com/v/VIDEO_ID`

All formats automatically open in the YouTube app or web player.

## 🐛 Troubleshooting

### "Failed to upload thumbnail"
- Check that Supabase storage is properly configured
- Ensure `post-media` bucket exists and is public
- Verify admin has upload permissions

### "Access Denied" in Admin Panel
- Confirm user has `is_admin = true` in profiles table
- Check RLS policies are properly set
- Verify user is logged in

### Streams Not Appearing
- Pull down to refresh
- Check database has data
- Verify real-time subscriptions are working
- Check Supabase connection

### YouTube Not Opening
- Verify stream_url is a valid YouTube URL
- Check device has YouTube app or browser
- Test URL in browser first

## 🚀 Next Steps

Consider adding:
- Push notifications when streams go live
- Scheduled streams with countdown timers
- Stream categories filtering
- Popular/trending streams
- User favorites/bookmarks
- Share stream feature
- Stream analytics dashboard

## 💡 Tips

- Use high-quality 16:9 thumbnails (1280x720 or 1920x1080)
- Write engaging titles and descriptions
- Add relevant categories for better organization
- Toggle streams to "Past" when they end
- Keep viewer counts enabled for engagement metrics

---

**Built with:** React Native, Expo, Supabase, YouTube Integration
**Last Updated:** November 10, 2025
