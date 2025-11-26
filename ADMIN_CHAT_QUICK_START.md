# Admin Chat Setup - Quick Start

## Prerequisites
✅ Expo app with React Native
✅ Supabase project configured
✅ User authentication working
✅ Admin role system in place

## Step 1: Run Database Migrations

Run these SQL migrations in Supabase SQL Editor in order:

### 1. Contact Settings Table
```bash
File: CREATE_APP_CONTACT_SETTINGS_TABLE.sql
```
Creates the contact settings system (email, phone, address, GPS coordinates, office hours).

### 2. Admin Messages Tables
```bash
File: CREATE_ADMIN_MESSAGES_TABLE.sql
```
Creates:
- `admin_messages` - Individual messages
- `admin_conversations` - Conversation metadata
- RLS policies for security
- Auto-update trigger

### 3. Add Media Support
```bash
File: ADD_MEDIA_TO_ADMIN_MESSAGES.sql
```
Adds `media_url` and `media_type` columns to support image and document uploads.

## Step 2: Verify Storage Bucket

Check if `chat-media` bucket exists in Supabase Storage:

1. Go to Supabase Dashboard → Storage
2. Look for bucket named `chat-media`
3. If it doesn't exist, create it:
   - Name: `chat-media`
   - Public: Yes (for read access)
   - File size limit: 50MB (or as needed)

## Step 3: Install Required Dependencies

If not already installed:

```bash
npx expo install expo-image-picker expo-document-picker
```

## Step 4: Configure App Permissions

Ensure `app.json` includes image picker permissions:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow Akora to access your photos to share in chat"
        }
      ]
    ]
  }
}
```

## Step 5: Test the System

### User Flow Test
1. Open app and navigate to **Secretariat**
2. Tap **"Send us a Message"** button
3. Type a message and tap Send
4. Message should appear instantly
5. Tap paperclip icon → Select **Photo**
6. Choose an image → Preview shows
7. Tap Send → Image uploads and displays
8. Tap paperclip icon → Select **Document**
9. Choose a PDF → Preview shows
10. Tap Send → Document uploads with icon

### Admin Flow Test
1. Login as admin user (profile.role = 'admin')
2. Navigate to **Admin → Messages**
3. Should see list of user conversations
4. Tap a conversation to open chat
5. Type a reply and send
6. User should receive message instantly
7. Images/documents from user should display correctly

## Troubleshooting

### "Send us a Message" button not visible
- Check you're on the Secretariat screen
- Button is at the bottom of Contact Us section
- Ensure latest code is deployed

### Navigation doesn't work
- Check `/app/admin-chat/index.tsx` exists
- Verify no syntax errors: `npx expo start` and check console

### Messages not real-time
- Check Supabase real-time is enabled for tables
- Verify subscription status in console logs
- Check device has internet connection

### Media upload fails
- Verify `chat-media` bucket exists and is public
- Check file size (default limit: 50MB)
- Request camera roll permissions
- Check console for upload errors

### Admin can't see messages
- Verify admin user has `role = 'admin'` in profiles table:
  ```sql
  SELECT id, email, role FROM profiles WHERE email = 'admin@example.com';
  ```
- If role is not admin, update it:
  ```sql
  UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
  ```

### Permissions denied for image picker
- Check `app.json` has expo-image-picker plugin
- Run `npx expo prebuild --clean` if using bare workflow
- Request permissions explicitly in code (already implemented)

## File Changes Summary

### Created Files
- `/app/admin-chat/index.tsx` - User support chat screen (700+ lines)
- `/app/admin/contact-settings.tsx` - Admin contact settings form
- `/app/admin/messages/index.tsx` - Admin conversations list
- `/app/admin/messages/[userId].tsx` - Admin individual chat
- `CREATE_APP_CONTACT_SETTINGS_TABLE.sql` - Contact settings migration
- `CREATE_ADMIN_MESSAGES_TABLE.sql` - Admin messages migration
- `ADD_MEDIA_TO_ADMIN_MESSAGES.sql` - Media columns migration

### Modified Files
- `/app/secretariat/index.tsx` - Added "Send us a Message" button and navigation

## Features Included

### User Side
✅ Direct messaging to support team
✅ Real-time message delivery
✅ Send text messages
✅ Upload images (from gallery)
✅ Upload documents (PDF, DOC, DOCX)
✅ Preview attachments before sending
✅ View sent images in chat
✅ View document icons for sent files
✅ Date separators (Today, Yesterday, etc.)
✅ Timestamp on each message
✅ "Support Team" badge on admin messages
✅ Auto-scroll to latest message
✅ Loading states and error handling

### Admin Side
✅ View all user conversations
✅ Unread message badges
✅ Real-time conversation updates
✅ Individual chat with users
✅ Send replies instantly
✅ View user images and documents
✅ Auto mark-as-read
✅ User profile in chat header
✅ Access control (admin role required)

## Next Steps

After setup is complete and tested:

1. **Customize Contact Settings**
   - Go to Admin → Contact Settings
   - Update email, phone, address
   - Set GPS coordinates (use Google Maps)
   - Set office hours (weekdays/weekends)

2. **Monitor Conversations**
   - Check Admin → Messages regularly
   - Respond to user queries promptly
   - Mark conversations as resolved

3. **Train Support Staff**
   - Show admins how to access Messages
   - Explain unread badges
   - Demonstrate sending replies with media

## Support

For detailed information, see:
- **[ADMIN_CHAT_SYSTEM_GUIDE.md](./ADMIN_CHAT_SYSTEM_GUIDE.md)** - Complete technical documentation
- **[CUSTOMER_CARE_CENTER.md](./CUSTOMER_CARE_CENTER.md)** - Contact settings overview

## Quick Commands

### Check if migrations applied
```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('admin_messages', 'admin_conversations', 'app_contact_settings');

-- Check if media columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'admin_messages' 
AND column_name IN ('media_url', 'media_type');
```

### Check storage bucket
```sql
-- Check if chat-media bucket exists
SELECT * FROM storage.buckets WHERE id = 'chat-media';
```

### Make user an admin
```sql
-- Update user role to admin
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'youradmin@example.com';
```

### Test real-time subscription
Open browser console in Supabase Dashboard → Table Editor → admin_messages
Look for: `📡 Subscription status: SUBSCRIBED`

---

**Setup Time**: ~10 minutes
**Difficulty**: Easy
**Last Updated**: January 2025
