# Cannot See Posted Comments - Troubleshooting Guide

## Problem
Comments are posted successfully but don't appear in the OAA Secretariat announcements.

## Root Cause
The issue is likely caused by **Row Level Security (RLS) policies** that restrict viewing comments to only those with `is_approved = true`, but the old policy name was "Users can view approved comments" which filters out comments.

## Step-by-Step Fix

### 🔴 **CRITICAL: Run this SQL in Supabase**

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy the entire contents of `FIX_COMMENT_POSTING.sql`**
3. **Paste and Run**

This will:
- ✅ Drop the old restrictive RLS policy
- ✅ Create a new policy that shows ALL comments
- ✅ Grant proper SELECT permissions
- ✅ Ensure `is_approved` defaults to `true`

### Expected SQL Changes:

```sql
-- OLD POLICY (RESTRICTIVE - CAUSED THE ISSUE):
CREATE POLICY "Users can view approved comments"
  ON public.announcement_comments
  FOR SELECT
  USING (is_approved = true OR auth.uid() = user_id);
  -- ^ This only shows approved comments

-- NEW POLICY (FIXED):
CREATE POLICY "Users can view all comments"
  ON public.announcement_comments
  FOR SELECT
  USING (true);  -- Shows ALL comments
```

---

## Testing After SQL Fix

### Test 1: Post a New Comment
1. Open any announcement in OAA Secretariat
2. Scroll to bottom
3. Type: "Test comment after fix"
4. Tap Send
5. **Expected**: Comment appears immediately at top of list

### Test 2: Check Console Logs
Open your development console and look for:
```
Posting comment: { announcement_id: ..., user_id: ..., content: ... }
Comment posted successfully: [...]
Loaded comments: X comments
Comments with user data: X
```

### Test 3: Verify in Supabase
1. Go to Supabase → Table Editor
2. Open `announcement_comments` table
3. Check if your comment exists with `is_approved = true`

---

## Common Issues & Solutions

### Issue 1: "Comments still not showing"
**Cause**: RLS policy not updated  
**Solution**: 
1. Go to Supabase → Authentication → Policies
2. Find `announcement_comments` table
3. Delete policy "Users can view approved comments"
4. Manually create policy:
   - Name: `Users can view all comments`
   - SELECT operation
   - Policy: `true`
   - Target: `authenticated`

### Issue 2: "Error: permission denied"
**Cause**: Missing GRANT permissions  
**Solution**: Run this SQL:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_comments TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

### Issue 3: "Comment posted but count doesn't update"
**Cause**: Trigger not working  
**Solution**: Check if trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_announcement_comment_count';
```

If missing, re-run `CREATE_SECRETARIAT_ANNOUNCEMENTS_TABLE.sql`

### Issue 4: "Comments appear then disappear"
**Cause**: RLS policy still filtering by `is_approved`  
**Solution**: 
1. Check current policy:
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'announcement_comments' 
AND policyname LIKE '%view%';
```
2. Ensure it says `USING (true)` not `USING (is_approved = true ...)`

---

## Verification Queries

### Check RLS Policies
```sql
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'announcement_comments';
```

**Expected output**:
- `Users can view all comments` - SELECT - `true` - NULL
- `Users can create comments` - INSERT - NULL - `(auth.uid() = user_id)`
- `Users can update own comments` - UPDATE - `(auth.uid() = user_id)` - `(auth.uid() = user_id)`
- `Users can delete their own comments` - DELETE - `(auth.uid() = user_id)` - NULL

### Check Permissions
```sql
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'announcement_comments'
AND grantee = 'authenticated';
```

**Expected output**:
- SELECT
- INSERT
- UPDATE
- DELETE

### Check Comments in Database
```sql
SELECT 
  id,
  user_id,
  content,
  is_approved,
  created_at
FROM announcement_comments
ORDER BY created_at DESC
LIMIT 10;
```

All comments should have `is_approved = true`

---

## Code Changes Made

### 1. Added Console Logging
**File**: `app/secretariat/announcements/[id].tsx`

**Purpose**: Help debug where the issue occurs

**Logs**:
- `Posting comment:` - Before insert
- `Comment posted successfully:` - After insert
- `Loaded comments: X comments` - After SELECT
- `Comments with user data: X` - After processing

### 2. Added Success Alert
**Purpose**: Confirm comment was posted

**Change**:
```typescript
Alert.alert('Success', 'Comment posted successfully!');
```

### 3. Improved Error Messages
**Purpose**: Show exact error details

**Change**:
```typescript
Alert.alert('Error', `Failed to add comment: ${error.message || 'Unknown error'}`);
```

---

## Database Schema Verification

### Correct Structure
```sql
CREATE TABLE announcement_comments (
  id UUID PRIMARY KEY,
  announcement_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,              -- ✅ Field name
  parent_comment_id UUID,
  is_approved BOOLEAN DEFAULT true,   -- ✅ Must default to true
  is_flagged BOOLEAN DEFAULT false,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Required Indexes
```sql
CREATE INDEX idx_announcement_comments_announcement_id ON announcement_comments(announcement_id);
CREATE INDEX idx_announcement_comments_user_id ON announcement_comments(user_id);
CREATE INDEX idx_announcement_comments_created_at ON announcement_comments(created_at DESC);
```

---

## Immediate Action Required

### ⚠️ STEP 1: Run SQL Fix
**File**: `FIX_COMMENT_POSTING.sql`  
**Action**: Copy → Supabase SQL Editor → Run

### ✅ STEP 2: Test Posting
1. Clear app cache/restart app
2. Post a test comment
3. Check console for logs
4. Verify comment appears

### 🔍 STEP 3: Debug if Still Not Working
1. Check console logs for errors
2. Verify RLS policies in Supabase
3. Check comment exists in database table
4. Verify user is authenticated

---

## Quick Diagnosis

### Comments Post But Don't Show
- **Likely Cause**: RLS policy filtering by `is_approved`
- **Fix**: Run `FIX_COMMENT_POSTING.sql`

### Comments Don't Post At All
- **Likely Cause**: Missing INSERT permission or wrong field name
- **Fix**: Check error message in console, verify field is `content` not `comment`

### Comments Show Briefly Then Disappear
- **Likely Cause**: RLS policy changes after initial load
- **Fix**: Ensure policy uses `USING (true)` for SELECT

### Comment Count Doesn't Update
- **Likely Cause**: Trigger not firing
- **Fix**: Re-run trigger creation from `CREATE_SECRETARIAT_ANNOUNCEMENTS_TABLE.sql`

---

## Files Involved

1. ✅ `FIX_COMMENT_POSTING.sql` - **RUN THIS FIRST**
2. ✅ `app/secretariat/announcements/[id].tsx` - Updated with logging
3. ✅ `CREATE_SECRETARIAT_ANNOUNCEMENTS_TABLE.sql` - Original schema
4. ✅ `ADD_COMMENT_LIKES_TABLE.sql` - Comment likes feature

---

## Expected Behavior After Fix

1. ✅ User posts comment
2. ✅ Console shows: "Posting comment..."
3. ✅ Console shows: "Comment posted successfully"
4. ✅ Alert shows: "Success: Comment posted successfully!"
5. ✅ Console shows: "Loaded comments: X comments"
6. ✅ Comment appears at top of list immediately
7. ✅ Comment count increments
8. ✅ User can like the comment
9. ✅ User can delete their own comment

---

## Support Checklist

Before asking for help, verify:
- [ ] Ran `FIX_COMMENT_POSTING.sql` in Supabase
- [ ] Checked console logs for errors
- [ ] Verified comment exists in `announcement_comments` table
- [ ] Confirmed `is_approved = true` for the comment
- [ ] Checked RLS policies show "Users can view all comments"
- [ ] Verified GRANT permissions include SELECT
- [ ] User is authenticated (check `auth.uid()` exists)
- [ ] App cache cleared and restarted

---

**Last Updated**: December 2024  
**Status**: Fix Available - Run `FIX_COMMENT_POSTING.sql`
