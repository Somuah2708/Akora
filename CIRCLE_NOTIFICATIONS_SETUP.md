# Circle Notifications Setup Guide

## Overview
This guide explains how to enable notifications for circle join requests, approvals, and rejections.

## Features Added
1. **Join Request Notifications** - Circle admins receive notifications when someone requests to join their circle
2. **Approval Notifications** - Users receive notifications when their join request is approved
3. **Rejection Notifications** - Users receive notifications when their join request is declined

## Database Migration

### Step 1: Update Notification Types
Run the SQL migration to add new notification types:

```bash
# In Supabase SQL Editor or your database client
```

Execute the file: `ADD_CIRCLE_NOTIFICATION_TYPES.sql`

This will add three new notification types:
- `circle_join_request` - When a user requests to join a circle
- `circle_join_approved` - When an admin approves a join request
- `circle_join_rejected` - When an admin rejects a join request

### Step 2: Verify Migration
After running the migration, verify it worked:

```sql
-- Check the constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'notifications'::regclass 
AND conname = 'notifications_type_check';
```

You should see the new notification types in the CHECK constraint.

## How It Works

### For Users Joining Circles

**Private Circles:**
1. User clicks "Request to Join" button
2. Join request is created in `circle_join_requests` table
3. Notification is sent to the circle admin/creator
4. Admin receives notification: "User wants to join your circle 'Circle Name'"

**Public Circles:**
1. User clicks "Join" button
2. User is automatically added to `circle_members` table
3. Notification is sent to the circle admin/creator
4. Admin receives notification: "User wants to join your circle 'Circle Name'"

### For Admins Reviewing Requests

**Approving a Request:**
1. Admin clicks "Approve" button
2. User is added to `circle_members` table
3. Request status updated to 'approved'
4. Notification sent to user: "Admin approved your request to join 'Circle Name'"

**Rejecting a Request:**
1. Admin clicks "Reject" button
2. Request status updated to 'rejected'
3. Notification sent to user: "Admin declined your request to join 'Circle Name'"

## Notification Viewing

Users can view their notifications in:
- The notifications bell icon in the app header
- The notifications screen (tap the bell icon)
- Real-time updates via Supabase subscriptions

## Testing

### Test Join Request Notification:
1. Create a private circle
2. Log in as a different user
3. Request to join the circle
4. Check notifications for the circle creator

### Test Approval Notification:
1. As circle admin, go to pending requests
2. Approve a request
3. Check notifications for the user who requested

### Test Rejection Notification:
1. As circle admin, go to pending requests
2. Reject a request
3. Check notifications for the user who requested

## Troubleshooting

### Notifications Not Appearing:
1. Check that `ADD_CIRCLE_NOTIFICATION_TYPES.sql` was run successfully
2. Verify real-time subscriptions are enabled for notifications table
3. Check browser console for errors
4. Verify user IDs are correct in the database

### Check Notifications in Database:
```sql
-- View all circle-related notifications
SELECT * FROM notifications 
WHERE type IN ('circle_join_request', 'circle_join_approved', 'circle_join_rejected')
ORDER BY created_at DESC;
```

### Check Pending Join Requests:
```sql
-- View all pending join requests
SELECT * FROM circle_join_requests 
WHERE status = 'pending'
ORDER BY created_at DESC;
```

## Notes
- Notifications are automatically marked as read when viewed
- Notifications are deleted if the user account is deleted (CASCADE)
- All circle notifications include the circle name in the content
- Notifications work with the existing notification system
