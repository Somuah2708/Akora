# Circle Group Chat Setup Guide

## Overview
Every circle now automatically has a linked group chat where members can communicate. This integration creates a seamless experience for circle members.

## Features
- **Automatic Chat Creation**: When a circle is created, a group chat is automatically created
- **Automatic Member Sync**: When users join/leave a circle, they're automatically added/removed from the group chat
- **Chat Button**: Members see a "Chat" button on circles they've joined
- **Full Group Chat Features**: Voice messages, images, videos, mentions, typing indicators, etc.

## Installation Steps

### Step 1: Run the Database Migration

Execute the SQL migration file in your Supabase SQL Editor:

```bash
# File: ADD_CIRCLE_GROUP_CHAT.sql
```

This migration will:
1. Add `group_chat_id` column to the circles table
2. Create triggers to automatically create group chats for new circles
3. Create triggers to sync circle members with group chat members
4. Backfill existing circles with group chats

### Step 2: Verify the Migration

After running the migration, verify it worked:

```sql
-- Check that all circles have group chats
SELECT 
  c.id,
  c.name as circle_name,
  c.group_chat_id,
  g.name as chat_name,
  (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id) as circle_members,
  (SELECT COUNT(*) FROM group_members WHERE group_id = c.group_chat_id) as chat_members
FROM circles c
LEFT JOIN groups g ON c.group_chat_id = g.id;
```

Expected result: All circles should have a `group_chat_id` and matching member counts.

## How It Works

### Creating a New Circle

1. User creates a circle
2. **Trigger fires** → `create_circle_group_chat()`
3. Group chat is created with the same name as the circle
4. Creator is added as admin to the group chat
5. `group_chat_id` is saved to the circle

### Joining a Circle

1. User joins a circle (approved or directly)
2. **Trigger fires** → `add_circle_member_to_group()`
3. User is automatically added to the group chat as a member
4. User can now see and click the "Chat" button

### Leaving a Circle

1. User leaves or is removed from a circle
2. **Trigger fires** → `remove_circle_member_from_group()`
3. User is automatically removed from the group chat
4. User can no longer access the chat

## User Experience

### For Circle Members:
- See a **"Chat" button** next to the "Joined" badge
- Click the button to open the circle's group chat
- Full featured chat with:
  - Text messages
  - Voice messages
  - Image/video sharing
  - @mentions
  - Typing indicators
  - Read receipts
  - Emoji reactions

### For Non-Members:
- Only see "Join" or "Request to Join" buttons
- No chat access until they're a member

### For Circle Creators:
- Automatically admin of the group chat
- Can manage the chat from the group info page
- All members added automatically

## Technical Details

### Database Schema

```sql
-- Circles table
circles
  - id (uuid)
  - name (text)
  - group_chat_id (uuid) → references groups(id)
  - ...

-- Groups table (existing)
groups
  - id (uuid)
  - name (text)
  - created_by (uuid)
  - ...

-- Group members (existing)
group_members
  - group_id (uuid)
  - user_id (uuid)
  - role (text) -- 'admin' or 'member'
```

### Triggers

1. **create_circle_group_chat**
   - Fires: BEFORE INSERT on circles
   - Action: Creates group chat and adds creator

2. **add_circle_member_to_group**
   - Fires: AFTER INSERT on circle_members
   - Action: Adds user to group chat

3. **remove_circle_member_from_group**
   - Fires: AFTER DELETE on circle_members
   - Action: Removes user from group chat

## Testing

### Test Circle Creation:
1. Create a new circle
2. Check that it has a `group_chat_id`
3. Click the "Chat" button
4. Verify you can send messages

### Test Joining:
1. As a different user, join a circle
2. Verify the "Chat" button appears
3. Open the chat and verify you're a member
4. Send a message to confirm access

### Test Leaving:
1. Leave a circle
2. Try to access the group chat
3. Verify you no longer have access

### Test Approval Flow:
1. Request to join a private circle
2. Admin approves
3. Verify you're added to both circle and chat
4. Verify you can send messages

## Troubleshooting

### Chat button doesn't appear:
- Check if user is actually a member: `SELECT * FROM circle_members WHERE circle_id = 'circle_id' AND user_id = 'user_id'`
- Check if circle has group_chat_id: `SELECT group_chat_id FROM circles WHERE id = 'circle_id'`
- Refresh the circles list

### Can't send messages in chat:
- Check group membership: `SELECT * FROM group_members WHERE group_id = 'group_id' AND user_id = 'user_id'`
- Verify RLS policies on group_messages table

### Members not syncing:
- Check trigger status: `SELECT * FROM pg_trigger WHERE tgname LIKE '%circle%'`
- Manually sync: Run the trigger functions manually

### Group chat shows "being set up":
- Circle might not have a group_chat_id
- Run: `SELECT group_chat_id FROM circles WHERE id = 'circle_id'`
- If null, manually create: Run migration again or create manually

## Manual Sync (if needed)

If members are out of sync, run this to fix:

```sql
-- Add missing members to group chats
INSERT INTO group_members (group_id, user_id, role)
SELECT c.group_chat_id, cm.user_id, 
  CASE WHEN cm.user_id = c.created_by THEN 'admin' ELSE 'member' END
FROM circle_members cm
JOIN circles c ON cm.circle_id = c.id
WHERE c.group_chat_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM group_members gm 
  WHERE gm.group_id = c.group_chat_id 
  AND gm.user_id = cm.user_id
);
```

## Features in Group Chat

All existing group chat features are available:
- ✅ Real-time messaging
- ✅ Voice messages
- ✅ Image/video sharing
- ✅ @mentions with autocomplete
- ✅ Typing indicators
- ✅ Read receipts
- ✅ Emoji picker
- ✅ Message history
- ✅ Group info page
- ✅ Member list

## Notes

- Group chats use the same name as the circle
- Circle image_url is used as the group avatar
- Circle creators are automatically group admins
- Group chat creation is automatic and transparent
- All member changes are synced in real-time
- Triggers handle all the synchronization
