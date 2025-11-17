# Admin Access Debug Guide - Step by Step

## Problem
Cannot access admin settings page even when logged in with admin account.

## Root Cause Analysis

The issue could be one of several problems:
1. **Database issue**: Profile doesn't have `is_admin = true` or `role = 'admin'`
2. **Auth issue**: User data not loading properly in the app
3. **Timing issue**: Admin check happens before user data loads
4. **RLS policy issue**: Row Level Security blocking the profile query

## Step-by-Step Debugging Process

### STEP 1: Verify Database Admin Status

Run this in Supabase SQL Editor:

```sql
-- Check ALL users and their admin status
SELECT 
    p.id,
    au.email,
    p.username,
    p.full_name,
    p.is_admin,
    p.role,
    CASE 
        WHEN p.is_admin = true THEN '✅ ADMIN (is_admin)'
        WHEN p.role IN ('admin', 'staff') THEN '✅ ADMIN (role)'
        ELSE '❌ NOT ADMIN'
    END as status
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC;
```

**Expected Result**: You should see your account with `is_admin = true` or `role = 'admin'`

**If NOT admin**: Run this to fix it (replace with your email):
```sql
UPDATE profiles 
SET is_admin = true, role = 'admin', updated_at = now()
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- Verify it worked:
SELECT p.*, au.email 
FROM profiles p 
JOIN auth.users au ON p.id = au.id 
WHERE au.email = 'your-email@example.com';
```

### STEP 2: Check Console Logs

Look at your Metro/terminal console when you try to access admin settings. You should see:

```
[useAuth] Initial session check: Session found for your-email@example.com
[useAuth] Fetching profile for user: <uuid>
[useAuth] Profile fetched successfully
[useAuth] Profile data: { id: <uuid>, username: '...', is_admin: true, role: 'admin' }

[AdminSettings] MOUNTED
[AdminSettings] user exists: true
[AdminSettings] user.id: <uuid>
[AdminSettings] Checking admin access for user: <uuid>
[AdminSettings] Profile data: { is_admin: true, role: 'admin', ... }
[AdminSettings] Admin check result: true
[AdminSettings] ✅ User IS admin - granting access
```

**If you see**:
- `user exists: false` → Auth not working, user not logged in
- `Error fetching profile: PGRST301` → RLS policy blocking read
- `is_admin: false` → Database not set correctly
- `❌ User is NOT admin` → Database check failed

### STEP 3: Check RLS Policies

Run this to see if RLS is blocking profile reads:

```sql
-- Check existing policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'profiles';

-- If no SELECT policy exists, add one:
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Alternative: Allow everyone to read all profiles (for debugging)
CREATE POLICY "Public profiles readable"
ON profiles FOR SELECT
USING (true);
```

### STEP 4: Test Auth Flow

In the app console, you should see these logs when you sign in:

```
[useAuth] signIn called for: your-email@example.com
[useAuth] Sign in successful, session created
[useAuth] Auth state changed: SIGNED_IN
[useAuth] Fetching profile for user: <uuid>
[useAuth] Profile fetched successfully
```

**If missing**: Sign out completely and sign back in.

### STEP 5: Test Navigation Path

Try accessing admin settings in different ways:

**Method A**: From Events screen (requires admin):
1. Open Akora Events (`/events`)
2. Look for "ADMIN MODE" green text under header
3. Tap Settings gear icon
4. Should open Admin Dashboard
5. Tap "Settings" text button
6. Should open Admin Settings with preview mode

**Method B**: Direct navigation (will fail if not admin):
Navigate directly to `/events/admin-settings`

**Method C**: With preview parameter (should always show UI):
Navigate to `/events/admin-settings?preview=1`

### STEP 6: Verify Profile Table Schema

```sql
-- Check if is_admin and role columns exist
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name IN ('is_admin', 'role');
```

**Expected**:
- `is_admin` | `boolean` | `false` | `YES`
- `role` | `text` | `NULL` | `YES`

**If columns missing**:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT;
```

## Quick Fix Commands

### Fix 1: Set yourself as admin (RECOMMENDED)
```sql
-- Find your email first
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Then set admin
UPDATE profiles 
SET is_admin = true, role = 'admin', updated_at = now()
WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com');
```

### Fix 2: Create profile if missing
```sql
-- Check if profile exists
SELECT p.* 
FROM auth.users au 
LEFT JOIN profiles p ON au.id = p.id 
WHERE au.email = 'YOUR_EMAIL@example.com';

-- If profile is NULL, create it
INSERT INTO profiles (id, username, full_name, is_admin, role)
SELECT 
    au.id,
    split_part(au.email, '@', 1), -- username from email
    split_part(au.email, '@', 1), -- full_name from email
    true, -- is_admin
    'admin' -- role
FROM auth.users au
WHERE au.email = 'YOUR_EMAIL@example.com'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = au.id);
```

### Fix 3: Force bypass with preview mode
If database is correct but app still blocks:
1. Navigate to `/events/admin` dashboard
2. Tap "Settings" button (this adds preview=1 param)
3. You should see the UI even if admin check fails
4. Check console logs to see what the admin check returned

## Common Error Messages

### "Access Denied: You need administrator privileges"
**Cause**: `is_admin = false` AND `role != 'admin'` in database  
**Fix**: Run Fix 1 above

### "Error fetching profile: PGRST301"
**Cause**: No profile exists or RLS blocking  
**Fix**: Run Fix 2 above, then check Step 3

### Console shows "User not loaded yet, waiting..."
**Cause**: useAuth() hook not returning user data  
**Fix**: Check auth session exists, try sign out/in

### "Preview mode: saving disabled"
**Cause**: Preview mode active but not actually admin  
**Fix**: This is expected - it lets you see UI but not save. Run Fix 1 to enable saving.

### Infinite loading spinner
**Cause**: isAdmin stays null, user never loads  
**Fix**: New timeout added (3 seconds) should fix this. Check console for errors.

## Testing Checklist

After making changes, verify:

- [ ] Console shows `[useAuth] Profile data: { ..., is_admin: true }`
- [ ] Console shows `[AdminSettings] ✅ User IS admin`
- [ ] Events screen shows "ADMIN MODE" green text
- [ ] Settings gear icon visible in Events header
- [ ] Admin Dashboard opens when tapping gear
- [ ] Admin Settings opens when tapping "Settings"
- [ ] No "Access Denied" message (unless testing preview mode)
- [ ] Save button enabled (not grayed out)

## Still Not Working?

If you've tried everything:

1. **Share these console logs**:
   - All `[useAuth]` logs
   - All `[AdminSettings]` logs
   - Any error messages

2. **Share this SQL output**:
   ```sql
   SELECT p.*, au.email 
   FROM profiles p 
   JOIN auth.users au ON p.id = au.id 
   WHERE au.email = 'YOUR_EMAIL@example.com';
   ```

3. **Try the nuclear option** (testing only):
   ```sql
   -- Make ALL users admin (DANGEROUS - testing only!)
   UPDATE profiles SET is_admin = true, role = 'admin';
   
   -- Then check if admin settings works
   ```

## Success Indicators

You know it's working when:
1. ✅ "ADMIN MODE" appears in Events header
2. ✅ Console shows "✅ User IS admin - granting access"
3. ✅ Admin Settings page loads with forms
4. ✅ Save button is enabled (not grayed)
5. ✅ No yellow "Preview mode" banner (unless using preview param)
