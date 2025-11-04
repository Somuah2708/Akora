# Edit Page Debugging Guide

## 🔍 Troubleshooting Steps

### Step 1: Check Browser Console
After clicking the Edit button, open your browser console (F12) and look for:

```
[My Announcements] Navigating to edit page for: [announcement-id]
[My Announcements] Route: /secretariat/announcements/edit/[announcement-id]
[Edit Page] Loaded with ID: [announcement-id]
[Edit Page] Current user: [user-id]
[Edit Page] Loading announcement: [announcement-id]
[Edit Page] Loaded data: {...}
```

### Step 2: Check for Errors
Look for any red error messages in the console:
- ❌ "Could not find the 'images' column" → Run `ADD_IMAGES_ATTACHMENTS_COLUMNS.sql`
- ❌ "No matching route" → Verify file structure
- ❌ "Permission denied" → Check if announcement belongs to current user

### Step 3: Verify File Structure
Your folder structure should be:
```
app/
  secretariat/
    announcements/
      edit/
        [id].tsx    ← Edit page file
      create.tsx
      index.tsx
      my-announcements.tsx
      saved.tsx
      [id].tsx
```

### Step 4: Test Direct Navigation
Try navigating directly to the edit page:
1. Copy an announcement ID from the URL when viewing an announcement
2. Navigate to: `http://localhost:8081/secretariat/announcements/edit/[paste-id-here]`
3. See if the page loads

### Step 5: Check Authentication
- Make sure you're logged in
- The edit page only shows announcements you created
- If you try to edit someone else's announcement, it will show an error

## 🐛 Common Issues

### Issue: Page is blank
**Cause:** Missing database columns
**Fix:** Run `ADD_IMAGES_ATTACHMENTS_COLUMNS.sql` in Supabase

### Issue: "Not found" error
**Cause:** Trying to edit someone else's announcement
**Fix:** Only edit announcements you created

### Issue: Console shows "undefined" for data
**Cause:** Database query failed
**Fix:** Check Supabase RLS policies and permissions

### Issue: Page loads but form is empty
**Cause:** Data loading failed
**Fix:** Check console logs for the error

## ✅ Expected Behavior

1. **Click Edit button** on My Announcements page
2. **See loading spinner** briefly
3. **Form appears** with all fields pre-filled:
   - Title
   - Summary
   - Content
   - Category
   - Priority
   - Target Audience
   - Author Name
   - Author Title
   - Author Email
   - Images (if any)
   - Attachments (if any)
4. **Make changes** to any field
5. **Click "Update Announcement"**
6. **See success message**: "✓ Announcement updated successfully!"
7. **Redirected** to My Announcements page
8. **Changes are visible** in the announcement

## 🔧 Quick Fixes

### Fix 1: Clear Metro Cache
```bash
# Stop the server
# Then run:
npx expo start -c
```

### Fix 2: Restart Dev Server
```bash
# Press Ctrl+C to stop
# Then:
npm start
```

### Fix 3: Check Route Registration
The file `app/secretariat/announcements/edit/[id].tsx` should automatically register the route `/secretariat/announcements/edit/[id]`

## 📝 What Console Logs Tell You

| Log Message | Meaning |
|-------------|---------|
| `[Edit Page] Loaded with ID:` | Page component mounted ✅ |
| `[Edit Page] Loading announcement:` | Starting to fetch data ✅ |
| `[Edit Page] Loaded data: {...}` | Data fetched successfully ✅ |
| `[Edit Page] Error: null` | No errors, all good ✅ |
| `[Edit Page] Error: {...}` | Problem fetching data ❌ |

## 🎯 Next Steps

1. **Click Edit button** on an announcement
2. **Open browser console** (F12)
3. **Look for the console logs** listed above
4. **Share any error messages** you see
5. **Check if the page loads** but is blank
6. **Verify the URL** in the browser address bar

The console logs will tell us exactly what's happening!
