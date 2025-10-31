# Secretariat Notification System Setup Guide

## Overview
This guide will help you set up the notification system for the OAA Secretariat page. The system tracks when users view the page and shows a notification badge when there are new announcements.

## Features Implemented
1. **Notification Badge**: Shows count of unread announcements on the bell icon
2. **Mark as Read**: Clicking the bell icon opens a dedicated notifications page
3. **New Item Indicators**: Announcements show a "NEW" badge if posted after the user's last view
4. **Auto-refresh**: Checks for new items when the page is focused
5. **Notifications Page**: Dedicated page showing all updates with filtering options

## Database Setup

### Step 1: Apply the Migration
Run the SQL migration to create the required table:

```bash
# In Supabase SQL Editor, run:
CREATE_SECRETARIAT_VIEWS.sql
```

Or manually execute the SQL commands in the file.

### Step 2: Verify Table Creation
Check that the `secretariat_views` table was created:
- Go to Supabase Dashboard > Table Editor
- Look for `secretariat_views` table
- Verify it has columns: id, user_id, last_viewed_at, created_at, updated_at

## How It Works

### 1. Tracking Views
- When a user opens the secretariat page, the system fetches their last view timestamp
- The system compares announcement creation dates with the last view timestamp
- Unread count = announcements created after last view

### 2. Notification Badge
- Red badge appears on bell icon when there are unread items
- Shows count (e.g., "3" or "9+" for 10 or more)
- Badge persists until items are marked as read

### 3. Notifications Page
- Clicking bell icon opens dedicated notifications page
- Shows all updates with images and descriptions
- Two filter tabs: "New" (unread only) and "All Updates"
- "Mark All as Read" button for clearing all notifications

### 4. Mark as Read
- User clicks "Mark All as Read" button on notifications page
- System updates/inserts a record in `secretariat_views` table
- Records current timestamp as `last_viewed_at`
- Badge count resets to 0
- "NEW" badges disappear from all items

### 5. New Item Badges
- Each announcement shows a "NEW" badge if it's unread
- Red "NEW" label appears next to the announcement type
- Badge is hidden once the user marks items as read

## Testing the Feature

### Test 1: First Time Visit
1. Open the OAA Secretariat page
2. Should see notification badge with count
3. All announcements should show "NEW" badge
4. Click bell icon to open notifications page
5. Should see all updates in "New" tab

### Test 2: Notifications Page
1. Click bell icon from secretariat page
2. Should open notifications page
3. See filter tabs: "New" and "All Updates"
4. "New" tab shows only unread items
5. Each new item has "NEW" badge

### Test 3: Mark as Read
1. On notifications page, click "Mark All as Read"
2. Badge should disappear from bell icon
3. "NEW" labels on announcements should disappear
4. "New" tab should show empty state
5. All items still visible in "All Updates" tab

### Test 4: New Announcements
1. Add a new announcement to the system
2. Return to the secretariat page
3. Should see badge with count "1"
4. New announcement should have "NEW" label
5. Click bell icon to see it in notifications page

### Test 5: Filter Tabs
1. Open notifications page
2. Switch between "New" and "All Updates" tabs
3. "New" shows only unread items
4. "All Updates" shows complete history
5. Counts update correctly

### Test 6: Persistence
1. Mark items as read
2. Navigate away and come back
3. Badge should stay at 0
4. No "NEW" labels should appear

## Future Enhancements

### Option 1: Real-time Announcements
To use real announcements from database instead of static data:

```typescript
// In fetchAnnouncementsAndCheckNew():
const { data: announcementsData } = await supabase
  .from('secretariat_announcements')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);

setAnnouncements(announcementsData || []);
```

### Option 2: Push Notifications
Add real-time subscriptions for new announcements:

```typescript
useEffect(() => {
  const channel = supabase
    .channel('secretariat_announcements')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'secretariat_announcements' },
      (payload) => {
        // Show notification
        // Update unread count
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

### Option 3: Different Categories
Track views separately for different sections:
- Announcements
- Shop items
- Events
- Documents

## Troubleshooting

### Badge not showing
- Check if user is authenticated
- Verify `secretariat_views` table exists
- Check console for errors

### Badge not clearing
- Verify RLS policies are correct
- Check if user_id matches auth.uid()
- Check network tab for failed requests

### "NEW" badges not appearing
- Verify announcement timestamps are correct
- Check if lastViewedAt is being set properly
- Console log the comparison logic

## Support
For issues or questions, check the Supabase logs and React Native debugger console.
