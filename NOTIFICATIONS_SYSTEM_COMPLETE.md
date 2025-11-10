# 🔔 Notifications System - Instagram-Style Implementation

## Overview

Complete Instagram-style notifications system with real-time updates, accurate unread counts, automatic triggers, and beautiful UI.

## Features Implemented

### ✅ Database Schema
- **Table**: `notifications` with comprehensive fields
- **Types**: like, comment, follow, mention, post, friend_request, friend_accept
- **RLS Policies**: Privacy-focused access control
- **Indexes**: Optimized for fast queries
- **Functions**:
  - `get_unread_notification_count()` - Returns unread count
  - `mark_all_notifications_read()` - Bulk mark as read
  - `create_notification()` - Smart creation with duplicate prevention

### ✅ Automatic Triggers
Notifications are automatically created when:
1. **Someone likes your post** - Creates 'like' notification
2. **Someone comments on your post** - Creates 'comment' notification with preview
3. **Someone sends friend request** - Creates 'friend_request' notification
4. **Friend request is accepted** - Creates 'friend_accept' notification

### ✅ Real-Time Updates
- **Live subscriptions** to new notifications
- **Instant badge updates** on home screen
- **Auto-increment** count when new notification arrives
- **Persistent across tabs** with focus refresh

### ✅ Professional UI
- **Tab navigation**: All, Likes, Comments, Follows
- **Avatar + Icon badges**: Shows notification type with colored icons
- **Time ago formatting**: "just now", "5m", "2h", "3d"
- **Unread indicators**: Blue dot and gray background
- **Post thumbnails**: Shows related post image
- **Pull to refresh**: Manual refresh support
- **Empty states**: Beautiful placeholders when no notifications
- **Mark all read**: Bulk action button

### ✅ Home Screen Integration
- **Bell icon** in header navigates to notifications
- **Dynamic badge** shows unread count (max "99+")
- **Real-time updates** when new notification arrives
- **Auto-refresh** on screen focus

## Files Created

### 1. Database Migration
**File**: `CREATE_NOTIFICATIONS_SYSTEM.sql`
- Creates `notifications` table
- Sets up RLS policies
- Creates helper functions
- Adds automatic triggers for likes, comments, friends

### 2. Notifications Library
**File**: `lib/notifications.ts`
- `getNotifications()` - Fetch all notifications with details
- `getNotificationsByType()` - Filter by type
- `getUnreadCount()` - Get unread count
- `markNotificationRead()` - Mark single as read
- `markAllNotificationsRead()` - Mark all as read
- `subscribeToNotifications()` - Real-time subscription
- `getNotificationMessage()` - Format notification text
- `getTimeAgo()` - Format timestamp

### 3. Notifications Screen
**File**: `app/notifications/index.tsx`
- Full-screen notifications view
- Tab filtering (All, Likes, Comments, Follows)
- Real-time subscription
- Navigation to profiles and posts
- Mark as read on tap
- Pull to refresh

### 4. Home Screen Updates
**File**: `app/(tabs)/index.tsx` (updated)
- Import notifications library
- Added `unreadNotifications` state
- Load count on screen focus
- Real-time subscription for new notifications
- Bell icon navigates to `/notifications`
- Dynamic badge with unread count

## How It Works

### Notification Flow

```
User Action → Database Trigger → Notification Created → Real-time Update → Badge Updates
```

#### Example: Post Like
1. User taps heart on post
2. `post_likes` table insert
3. `trigger_notify_post_like` fires
4. `notify_post_like()` function runs
5. `create_notification()` creates notification
6. Real-time subscription broadcasts
7. Recipient sees badge update instantly
8. Notification appears in notifications screen

### Duplicate Prevention

The system prevents spam by:
- **Same actor + type + post within 24h**: Updates timestamp instead of creating new
- **Actor = Recipient**: No notification (you can't notify yourself)
- **Automatic cleanup**: Old notifications can be archived/deleted

### Real-Time Architecture

```typescript
// Home Screen
useEffect(() => {
  subscribeToNotifications(userId, (newNotification) => {
    setUnreadNotifications(prev => prev + 1); // Increment badge
  });
}, [userId]);

// Notifications Screen
useEffect(() => {
  subscribeToNotifications(userId, (newNotification) => {
    setNotifications(prev => [newNotification, ...prev]); // Add to list
  });
}, [userId]);
```

## Installation Steps

### 1. Apply Database Migration

```bash
# Open Supabase Dashboard → SQL Editor
# Copy and paste contents of CREATE_NOTIFICATIONS_SYSTEM.sql
# Execute the SQL
```

Or use the helper script:
```bash
chmod +x apply-notifications-migration.sh
./apply-notifications-migration.sh
```

### 2. Verify Installation

Run this query in Supabase SQL Editor:
```sql
-- Check if table exists
SELECT * FROM notifications LIMIT 1;

-- Check if functions exist
SELECT get_unread_notification_count('YOUR_USER_ID_HERE');

-- Test notification creation
SELECT create_notification(
  'recipient_user_id',
  'actor_user_id', 
  'like',
  NULL,
  'post_id_here',
  NULL
);
```

### 3. Test the System

1. **Test automatic triggers**:
   - Like a post → Check if notification is created
   - Comment on a post → Check notification with content
   - Send friend request → Check notification appears

2. **Test UI**:
   - Tap bell icon on home screen
   - See notifications list
   - Tap notification → Navigate to post/profile
   - Pull to refresh
   - Switch tabs (All, Likes, Comments, Follows)
   - Tap "Mark all read"

3. **Test real-time**:
   - Have another user like your post
   - Watch badge update without refresh
   - Open notifications screen → See new item appear

## Database Schema

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  recipient_id UUID REFERENCES profiles(id),  -- Who receives notification
  actor_id UUID REFERENCES profiles(id),      -- Who triggered it
  type TEXT,                                   -- Notification type
  content TEXT,                                -- Comment preview, etc.
  post_id UUID REFERENCES posts(id),          -- Related post
  comment_id UUID REFERENCES post_comments(id), -- Related comment
  is_read BOOLEAN DEFAULT false,              -- Read status
  created_at TIMESTAMP WITH TIME ZONE
);
```

## API Reference

### Get Notifications
```typescript
const notifications = await getNotifications(50, 0);
// Returns: Notification[] with actor and post details
```

### Get Unread Count
```typescript
const count = await getUnreadCount();
// Returns: number
```

### Mark as Read
```typescript
await markNotificationRead(notificationId);
// Marks single notification as read
```

### Mark All Read
```typescript
await markAllNotificationsRead();
// Marks all user's notifications as read
```

### Subscribe to Real-Time
```typescript
const unsubscribe = subscribeToNotifications(userId, (notification) => {
  console.log('New notification:', notification);
});

// Later: unsubscribe()
```

## Customization

### Add New Notification Type

1. **Update type enum** in SQL:
```sql
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('like', 'comment', 'follow', 'mention', 'post', 'friend_request', 'friend_accept', 'your_new_type'));
```

2. **Create trigger function**:
```sql
CREATE OR REPLACE FUNCTION notify_your_action()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(
    recipient_id,
    actor_id,
    'your_new_type',
    content,
    post_id,
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

3. **Add to UI**: Update `getNotificationIcon()` and `getNotificationMessage()` in `lib/notifications.ts`

### Customize Notification Message

Edit `getNotificationMessage()` in `lib/notifications.ts`:
```typescript
case 'like':
  return `${actorName} loved your post ❤️`;  // Changed message
```

### Change Badge Color

Edit `styles.notificationBadge` in `app/(tabs)/index.tsx`:
```typescript
notificationBadge: {
  backgroundColor: '#34C759',  // Change to green
  // ... rest of styles
}
```

## Performance Considerations

### Indexes
Optimized queries with:
- `idx_notifications_recipient` - Fast user queries
- `idx_notifications_unread` - Quick unread count
- `idx_notifications_type` - Fast type filtering
- `idx_notifications_actor` - Actor lookups

### Query Limits
- Default: 50 notifications per load
- Pagination supported with `offset` parameter
- Consider implementing infinite scroll for large lists

### Real-Time Connections
- One subscription per screen (home + notifications)
- Automatically cleaned up on unmount
- Minimal data transfer (only IDs, then fetch details)

## Troubleshooting

### Badge Not Updating
```typescript
// Check if subscription is working
console.log('User ID:', user?.id);
// Should see subscription logs in console
```

### Notifications Not Created
```sql
-- Check if triggers are enabled
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname LIKE '%notify%';

-- Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'notifications';
```

### Count Incorrect
```typescript
// Manually refresh count
const count = await getUnreadCount();
setUnreadNotifications(count);
```

## Future Enhancements

Possible additions:
- ✨ Push notifications (Expo Notifications)
- ✨ Email notifications
- ✨ Notification preferences/settings
- ✨ Mute specific users
- ✨ Archive old notifications
- ✨ Group similar notifications ("John and 5 others liked your post")
- ✨ Rich notifications with action buttons
- ✨ Notification history/archive view

## Summary

You now have a production-ready, Instagram-style notifications system with:
- ✅ Real-time updates
- ✅ Accurate unread counts
- ✅ Automatic triggers on user actions
- ✅ Beautiful, professional UI
- ✅ Tab filtering
- ✅ Privacy-focused RLS policies
- ✅ Optimized performance
- ✅ Full navigation integration

The system works seamlessly with your existing posts, likes, comments, and friend request features!
