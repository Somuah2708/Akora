# Admin UI Troubleshooting Guide

## Issue
When logging in with an admin account on the Akora Events screen, you see the same UI as regular users instead of admin-specific features.

## Admin Features That Should Be Visible

When logged in as admin, you should see:

1. **"ADMIN MODE" label** in the header (green text under "Akora Events")
2. **Settings gear icon** in the top-right header (blue gear)
3. **"Add OAA Event" button** on the OAA Events tab
4. **"Pending Approvals" section** on the Akora Events tab (if there are pending events)
5. **Approve/Reject buttons** for pending events

## Diagnostic Steps

### Step 1: Check Console Logs

Look at your terminal/console where the app is running. You should see logs like:

```
[AkoraEvents] loadRole called
[AkoraEvents] user exists: true
[AkoraEvents] user.id: <your-user-id>
[AkoraEvents] Fetching profile for user: <your-user-id>
[AkoraEvents] Profile data: { is_admin: true, role: 'admin' }
[AkoraEvents] is_admin: true
[AkoraEvents] role: admin
[AkoraEvents] Computed admin status: true
```

**If you see `is_admin: false` or `role: null`**, your profile needs to be set as admin in the database.

**If you don't see these logs at all**, the `loadRole` function isn't being called - try logging out and back in.

### Step 2: Set Your Profile as Admin

1. Open **Supabase Dashboard** → **SQL Editor**
2. Run the script from `CHECK_AND_SET_ADMIN.sql`:

```sql
-- First, find your email/user
SELECT 
  id,
  email,
  full_name,
  is_admin,
  role
FROM profiles 
ORDER BY created_at DESC
LIMIT 10;

-- Then set yourself as admin (replace with your actual email)
UPDATE profiles 
SET 
  is_admin = true, 
  role = 'admin'
WHERE email = 'your-email@example.com';

-- Verify it worked
SELECT 
  id,
  email,
  is_admin,
  role
FROM profiles 
WHERE email = 'your-email@example.com';
```

### Step 3: Force Refresh the App

After setting admin in the database:

1. **Close the app completely** (force quit on iOS/Android)
2. **Reopen the app**
3. **Log out and log back in** (if necessary)
4. Navigate to Events screen

You should now see:
- "ADMIN MODE" label in green
- Settings gear icon
- Admin buttons and sections

### Step 4: Verify Admin Access Works

Test each admin feature:

1. ✅ Tap the **Settings gear** → should open Admin Dashboard
2. ✅ On **OAA Events tab** → should see "Add OAA Event" button
3. ✅ On **Akora Events tab** → should see "Pending Approvals" section (if any pending events exist)
4. ✅ In **Admin Dashboard** → should see "Settings" button to configure pricing/payments

## Common Issues & Solutions

### Issue: "ADMIN MODE" doesn't appear
**Solution:** 
- Check console logs for `[AkoraEvents] Computed admin status: false`
- Run the SQL script to set `is_admin = true` in Supabase
- Force close and reopen the app

### Issue: Settings gear icon missing
**Solution:**
- Verify `isAdmin` is true in console logs
- Check that `user` exists (logs should show "user exists: true")
- Make sure you're logged in

### Issue: Admin Dashboard shows "Access Denied"
**Solution:**
- The admin dashboard has its own separate check
- Run `CHECK_AND_SET_ADMIN.sql` to ensure both `is_admin = true` AND `role = 'admin'`
- Try using the "Settings" text button instead of the gear

### Issue: Pending events section not showing
**Solution:**
- This only appears on the **Akora Events tab** (not OAA Events)
- Only shows if there are actually pending events
- Check `isAdmin` is true in logs
- Try submitting a test event to create a pending item

## Quick Test

To quickly verify admin status is working:

1. Open Akora Events screen
2. Look for **"ADMIN MODE"** green text under the header title
3. Look for **Settings gear icon** (blue) in top-right
4. Switch to **OAA Events tab** → should see "Add OAA Event" button

If you see all three, your admin access is working correctly!

## Database Schema Verification

Make sure your `profiles` table has these columns:

```sql
-- Check profiles table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';
```

Required columns:
- `is_admin` (boolean)
- `role` (text or varchar)

If missing, add them:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT;
```

## Still Not Working?

If admin features still don't appear after following all steps:

1. Share the console logs (especially the `[AkoraEvents]` lines)
2. Share the output of this query:
   ```sql
   SELECT id, email, is_admin, role FROM profiles WHERE email = 'your-email@example.com';
   ```
3. Verify you're testing on the **Akora Events screen** (`/events/index.tsx`) not the Admin Dashboard (`/events/admin.tsx`)
