# FINAL DEBUG - WHAT TO CHECK NOW

## What I Just Fixed

### Problem 1: Stack Navigation Not Registered ✅
The `app/events/_layout.tsx` only had `index` registered. Added all screens including `admin` and `admin-settings`.

### Problem 2: Aggressive Router.back() ✅  
The admin dashboard was calling `router.back()` immediately if user wasn't loaded yet (race condition). Removed all `router.back()` calls and `Alert.alert()` from the auth check.

### Problem 3: No Proper Error UI ✅
Changed from `return null` to proper error screens with "Go Back" buttons.

## Test Steps

1. **Restart the app completely** (force quit and reopen - this is critical for Stack changes)

2. **Check console when opening Events screen**:
   ```
   [AkoraEvents] loadRole called
   [AkoraEvents] Computed admin status: true  ← Should be TRUE
   ```

3. **Tap the gear icon**, you should see:
   ```
   [AdminDashboard] COMPONENT RENDERING
   [AdminDashboard] User: true <uuid>
   [AdminDashboard] checkAdminAccess called
   [AdminDashboard] Fetching profile for user: <uuid>
   [AdminDashboard] Profile data: { is_admin: true, role: 'admin' }
   [AdminDashboard] Admin check result: true
   [AdminDashboard] ✅ User IS admin - granting access
   ```

4. **Once dashboard loads, tap "Settings" button**:
   ```
   [AdminDashboard] Settings button tapped
   [AdminDashboard] Navigating to: /events/admin-settings with preview=1
   [AdminSettings] COMPONENT RENDERING - TOP OF FUNCTION
   [AdminSettings] Params received: { preview: '1' }
   ```

## If You Still Get "Access Denied. Please sign in"

This means the useEffect is running BEFORE user is loaded. Check these logs:

```
[AdminDashboard] checkAdminAccess called
[AdminDashboard] user exists: false  ← PROBLEM HERE
[AdminDashboard] ⏳ No user yet - waiting for auth to load
```

If you see `user exists: false`, then the issue is in useAuth hook loading timing. 

**Solution**: The new code now waits gracefully instead of immediately rejecting.

## If Admin Dashboard Never Appears

Check if these logs appear AT ALL:
- `[AdminDashboard] COMPONENT RENDERING` - If missing, navigation is broken
- Check `_layout.tsx` has `<Stack.Screen name="admin" />`

## Expected Flow

1. Events Screen → Gear Icon visible (means `isAdmin = true` in Events)
2. Tap Gear → Navigate to `/events/admin`  
3. Admin Dashboard → Renders, checks admin status
4. Dashboard → Shows "Settings" button in header
5. Tap Settings → Navigate to `/events/admin-settings?preview=1`
6. Admin Settings → Renders with preview mode

## Last Resort SQL Check

If dashboard loads but says "You don't have admin access":

```sql
-- Check your actual admin status
SELECT 
    au.email,
    p.is_admin,
    p.role,
    CASE 
        WHEN p.is_admin = true THEN '✅ ADMIN'
        WHEN p.role IN ('admin', 'staff') THEN '✅ ADMIN (role)'
        ELSE '❌ NOT ADMIN'
    END as status
FROM auth.users au
JOIN profiles p ON au.id = p.id
WHERE au.id = auth.uid();  -- Your current logged-in user

-- If NOT ADMIN, fix it:
UPDATE profiles 
SET is_admin = true, role = 'admin' 
WHERE id = auth.uid();
```

## Key Changes Made

1. **`app/events/_layout.tsx`**: Added all screen registrations
2. **`app/events/admin.tsx`**: 
   - Removed Alert.alert() and router.back() from auth checks
   - Added proper error screens
   - Better logging
3. **`app/events/admin-settings.tsx`**: Already had good logging

## Success Indicators

✅ No more "Access Denied. Please sign in" alerts  
✅ Dashboard shows proper error screen if not admin  
✅ Settings button appears in dashboard header  
✅ Settings screen loads when tapped  
✅ Console shows all `[AdminDashboard]` and `[AdminSettings]` logs  

**RESTART APP NOW AND TRY AGAIN!**
