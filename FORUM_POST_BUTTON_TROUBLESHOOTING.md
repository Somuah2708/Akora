# Forum Post Button Troubleshooting Guide

## Issue: Post Button Not Working

### Common Causes & Solutions

#### 1. Database Tables Not Created ⚠️
**Symptom**: Error message "relation does not exist" or similar
**Solution**: Run the SQL migration to create tables

```sql
-- Run this in Supabase SQL Editor
-- File: CREATE_FORUM_TABLES.sql
```

#### 2. Storage Bucket Not Created ⚠️
**Symptom**: Error "Bucket not found" when uploading attachments
**Solution**: Run the storage setup script

```sql
-- Run this in Supabase SQL Editor
-- File: CREATE_FORUM_STORAGE.sql
```

#### 3. User Not Authenticated ⚠️
**Symptom**: Alert "You must be logged in to post"
**Solution**: Ensure user is logged in before accessing forum

#### 4. Empty Title or Content ⚠️
**Symptom**: Post button is grayed out/disabled
**Solution**: Fill in both title and content fields

---

## Debugging Steps

### Step 1: Check Console Logs
The post button now logs detailed information:
1. Open your app
2. Open React Native debugger or Metro logs
3. Try to post a discussion
4. Look for console logs:
   - "Creating discussion..." - Shows what data is being sent
   - "Discussion created:" - Success message with data
   - "Discussion error:" - Shows database errors
   - "Uploading X attachments..." - File upload status
   - Error messages for troubleshooting

### Step 2: Test Without Attachments
1. Fill in title
2. Select category
3. Add content
4. **Don't add any images or documents**
5. Try posting
6. This isolates whether the issue is with database or storage

### Step 3: Verify Database Tables

Run this in Supabase SQL Editor:
```sql
-- Check if forum_discussions table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'forum_discussions'
);

-- If it returns 'true', check the structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'forum_discussions';
```

### Step 4: Verify User Authentication

Add this temporarily in the component:
```typescript
useEffect(() => {
  console.log('Current user:', user);
  console.log('User ID:', user?.id);
}, [user]);
```

### Step 5: Check RLS Policies

The user must have INSERT permission on `forum_discussions`:
```sql
-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'forum_discussions';

-- Ensure there's an INSERT policy for authenticated users
```

---

## Enhanced Error Messages

The post button now provides specific error messages:

### "Database Setup Required"
- **Meaning**: The `forum_discussions` table doesn't exist
- **Action**: Run `CREATE_FORUM_TABLES.sql` in Supabase
- **Location**: File is in your project root

### "Storage Setup Required"
- **Meaning**: The `forum-attachments` bucket doesn't exist
- **Action**: Run `CREATE_FORUM_STORAGE.sql` in Supabase
- **Location**: File is in your project root

### "You must be logged in to post"
- **Meaning**: User is not authenticated
- **Action**: Log in before trying to post
- **Check**: Verify authentication flow works

### "Please enter a title"
- **Meaning**: Title field is empty
- **Action**: Type a title for your discussion

### "Please enter some content"
- **Meaning**: Content field is empty
- **Action**: Write some content for your discussion

---

## Quick Fix Checklist

Before posting, ensure:
- [ ] Supabase project is set up
- [ ] User is logged in (check auth state)
- [ ] `CREATE_FORUM_TABLES.sql` has been run
- [ ] `CREATE_FORUM_STORAGE.sql` has been run (if using attachments)
- [ ] Title field has text
- [ ] Content field has text
- [ ] Internet connection is active
- [ ] Supabase URL and anon key are correct in environment

---

## Testing the Post Button

### Basic Test (No Attachments)
1. Open Development Forum
2. Tap "+" button
3. Enter title: "Test Discussion"
4. Select category: "General"
5. Enter content: "This is a test post"
6. Tap "Post"
7. Should see "Success" alert
8. Should redirect back to forum
9. New discussion should appear in list

### Advanced Test (With Attachments)
1. Follow steps 1-5 above
2. Tap "Add Image"
3. Select an image
4. Image preview should appear
5. Tap "Post"
6. Should see "Success" alert
7. Discussion should include the image

### Error Test
1. Open Development Forum
2. Tap "+" button
3. Enter title only (no content)
4. Try to tap "Post"
5. Button should be disabled (grayed out)
6. Add content
7. Button should become active (blue)

---

## Manual Database Setup

If SQL files aren't working, you can manually create the table:

```sql
-- Minimal table for testing
CREATE TABLE IF NOT EXISTS forum_discussions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  author_id uuid REFERENCES auth.users(id) NOT NULL,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE forum_discussions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert
CREATE POLICY "Users can create discussions"
  ON forum_discussions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Allow everyone to read
CREATE POLICY "Anyone can view discussions"
  ON forum_discussions
  FOR SELECT
  TO authenticated
  USING (true);
```

---

## Success Indicators

**Post button is working correctly when:**
✅ Button turns from gray to blue when title and content are filled
✅ Tapping "Post" shows loading spinner
✅ Console logs "Creating discussion..."
✅ Console logs "Discussion created:" with data
✅ Alert shows "Success" message
✅ Returns to forum list
✅ New discussion appears in recent discussions

**If any of these fail, check the corresponding section above**

---

## Still Not Working?

1. **Check Metro bundler logs** for JavaScript errors
2. **Check Supabase logs** in dashboard for database errors
3. **Verify environment variables** (SUPABASE_URL, SUPABASE_ANON_KEY)
4. **Test authentication** - Can you perform other Supabase operations?
5. **Clear app cache** and restart Metro bundler
6. **Check network tab** in React Native Debugger for failed requests

---

## Contact Points

If issue persists:
- Check console for specific error messages
- Copy error from console logs
- Verify all SQL scripts have been run
- Check Supabase dashboard for table/bucket existence
