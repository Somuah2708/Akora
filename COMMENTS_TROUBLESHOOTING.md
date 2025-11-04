# OAA Secretariat Comments - Troubleshooting Guide

## Problem: Cannot See Posted Comments

### Quick Fix (Run this SQL file)

**Run in Supabase SQL Editor**: `SETUP_COMMENTS_COMPLETE.sql`

This single file will:
- ✅ Check if tables exist
- ✅ Create `announcement_comments` table
- ✅ Create `announcement_comment_likes` table  
- ✅ Set up all RLS policies
- ✅ Create triggers for auto-counting
- ✅ Grant all necessary permissions
- ✅ Verify setup is complete

---

## Step-by-Step Instructions

### 1. Open Supabase
1. Go to your Supabase project
2. Click on "SQL Editor" in the left menu
3. Click "New Query"

### 2. Run Setup SQL
1. Copy the entire contents of `SETUP_COMMENTS_COMPLETE.sql`
2. Paste into the SQL Editor
3. Click "Run" button
4. Check the output for success messages:
   ```
   ✓ secretariat_announcements table exists
   ✓ announcement_comments table created successfully
   ✓ announcement_comment_likes table created successfully
   
   SETUP COMPLETE!
   ```

### 3. Test Comments
1. Open your app
2. Navigate to any announcement in OAA Secretariat
3. Scroll to bottom
4. Type a test comment
5. Tap send button
6. Comment should appear immediately

---

## What Tables Are Needed?

For the **OAA Secretariat Announcements** comment system, you need:

### Main Tables:
1. ✅ `secretariat_announcements` - Already exists (stores announcements)
2. ✅ `announcement_comments` - **Needed for comments**
3. ✅ `announcement_comment_likes` - **Needed for comment likes**

### How They Connect:
```
secretariat_announcements (id)
    ↓
announcement_comments (announcement_id) ← References announcement
    ↓
announcement_comment_likes (comment_id) ← References comment
```

---

## Common Issues & Solutions

### Issue 1: "Table does not exist"
**Error**: `relation "announcement_comments" does not exist`

**Solution**: Run `SETUP_COMMENTS_COMPLETE.sql` - this creates the table

---

### Issue 2: "Permission denied"
**Error**: `permission denied for table announcement_comments`

**Solution**: Run `SETUP_COMMENTS_COMPLETE.sql` - this grants permissions

---

### Issue 3: "New row violates row-level security"
**Error**: `new row violates row-level security policy`

**Solution**: Run `SETUP_COMMENTS_COMPLETE.sql` - this sets up RLS policies correctly

---

### Issue 4: Comments post but don't appear
**Possible causes**:
1. RLS policy only shows approved comments
2. `is_approved` field is set to `false`

**Solution**: Run `SETUP_COMMENTS_COMPLETE.sql` - sets `is_approved` default to `true` and updates policies

---

### Issue 5: Comment count doesn't update
**Cause**: Missing trigger function

**Solution**: Run `SETUP_COMMENTS_COMPLETE.sql` - creates triggers for auto-counting

---

## Verification Checklist

After running `SETUP_COMMENTS_COMPLETE.sql`, verify:

**In Supabase Dashboard → Table Editor:**
- [ ] `announcement_comments` table exists
- [ ] `announcement_comment_likes` table exists
- [ ] Both tables have RLS enabled (green shield icon)

**In Supabase Dashboard → SQL Editor:**
Run this query to test:
```sql
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.table_privileges 
   WHERE grantee = 'authenticated' 
   AND table_name = t.table_name 
   AND privilege_type = 'INSERT') as has_insert
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('announcement_comments', 'announcement_comment_likes');
```

Expected result: Both tables should show `has_insert = 1`

---

## Manual Database Check

If you want to manually verify the setup:

### Check if table exists:
```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'announcement_comments'
);
```
Expected: `true`

### Check table structure:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'announcement_comments'
ORDER BY ordinal_position;
```

Expected columns:
- `id` - uuid
- `announcement_id` - uuid
- `user_id` - uuid
- `content` - text
- `parent_comment_id` - uuid
- `is_approved` - boolean
- `is_flagged` - boolean
- `like_count` - integer
- `created_at` - timestamptz
- `updated_at` - timestamptz

### Check RLS policies:
```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'announcement_comments';
```

Expected policies:
- Users can view all comments (SELECT)
- Users can create comments (INSERT)
- Users can update own comments (UPDATE)
- Users can delete own comments (DELETE)

---

## Files Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `CREATE_SECRETARIAT_ANNOUNCEMENTS_TABLE.sql` | Creates main announcement system | First time setup |
| `SETUP_COMMENTS_COMPLETE.sql` | **Creates/fixes comment system** | **Use this to fix comments!** |
| `ADD_COMMENT_LIKES_TABLE.sql` | Adds like functionality | Already included in SETUP_COMMENTS_COMPLETE.sql |
| `FIX_COMMENT_POSTING.sql` | Fixes permissions only | Use if tables exist but posting fails |

---

## Still Not Working?

### Check App Code
The app should use these field names:

**When inserting comment:**
```typescript
{
  announcement_id: announcementId,
  user_id: user.id,
  content: commentText,  // ← Must be 'content' not 'comment'
}
```

**When selecting comments:**
```typescript
.select('id, user_id, content, created_at, like_count')
```

### Check Authentication
```typescript
const { user } = useAuth();
console.log('User ID:', user?.id); // Should show a UUID
```

If `user?.id` is undefined, the user is not authenticated.

---

## Success Indicators

✅ **Comments are working when:**
1. You can type and send a comment
2. Comment appears immediately in the list
3. No error messages appear
4. Comment count increments
5. You can like/unlike comments
6. You can delete your own comments

---

## Support

If comments still don't work after running `SETUP_COMMENTS_COMPLETE.sql`:

1. Check Supabase logs for errors
2. Check browser console for JavaScript errors
3. Verify user is authenticated (`user?.id` is not null)
4. Ensure `secretariat_announcements` table exists

---

**Last Updated**: December 2024  
**For**: OAA Secretariat Announcements System
