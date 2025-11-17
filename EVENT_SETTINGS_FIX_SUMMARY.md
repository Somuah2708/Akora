# Event Settings Not Persisting - Fix Applied

## 🐛 Problem
Settings saved successfully but didn't show up when reopening admin-settings screen.

## 🔍 Root Causes Found

1. **Loading Issue**: Used `.single()` which fails if no row exists
2. **Navigation Issue**: Navigated away immediately after save, no reload
3. **No Logging**: Couldn't see what was actually saved/loaded
4. **Possible RLS Issue**: INSERT policy might be missing

## ✅ Fixes Applied

### 1. Fixed loadSettings() Function
**Before:**
```typescript
const { data, error } = await supabase
  .from('event_settings')
  .select('*')
  .single();  // ❌ Fails if no data
```

**After:**
```typescript
const { data, error } = await supabase
  .from('event_settings')
  .select('*')
  .limit(1)
  .maybeSingle();  // ✅ Returns null if no data, doesn't fail
```

### 2. Added Comprehensive Logging
- Logs every field being loaded
- Logs save operations
- Logs query results
- Console shows: `[AdminSettings] Loading settings from database...`

### 3. Fixed Save Flow
**Before:**
```typescript
await supabase.from('event_settings').upsert(settings);
Alert.alert('Success', 'Settings saved');
router.back();  // ❌ Leaves immediately
```

**After:**
```typescript
const { data: savedData } = await supabase
  .from('event_settings')
  .upsert(settings)
  .select()  // ✅ Return saved data
  .single();

Alert.alert('Success', 'Settings saved', [{
  text: 'OK',
  onPress: () => loadSettings()  // ✅ Reload to verify
}]);
```

### 4. SQL Scripts Created

#### DIAGNOSE_EVENT_SETTINGS.sql
Run this to check:
- Table exists
- Columns are correct
- RLS policies active
- Current data
- Permissions granted

#### COMPLETE_EVENT_SETTINGS_FIX.sql
Run this to:
- Create table if missing
- Enable RLS
- Create all policies (SELECT, INSERT, UPDATE)
- Grant permissions
- Insert default row
- Verify setup

## 🔧 How to Fix

### Step 1: Run SQL Fix (in Supabase SQL Editor)
```sql
-- Copy and paste COMPLETE_EVENT_SETTINGS_FIX.sql
```

This ensures:
- ✅ Table exists with correct schema
- ✅ RLS enabled with proper policies
- ✅ Default settings row exists
- ✅ Permissions granted

### Step 2: Test in App
1. Open Events Admin Settings
2. Check console for: `[AdminSettings] Loading settings...`
3. Modify some values
4. Click "Save All Settings"
5. Check console for: `[AdminSettings] Settings saved successfully:`
6. Should see all saved values in console
7. Alert appears, click OK
8. Should see: `[AdminSettings] Loading settings...` again
9. Form fields should show your saved values

### Step 3: Verify in Supabase
Run diagnostic:
```sql
SELECT * FROM event_settings;
```

Should see your saved values.

## 🎯 What Changed in Code

### app/events/admin-settings.tsx

1. **loadSettings()**
   - Changed `.single()` to `.limit(1).maybeSingle()`
   - Added logging for every field
   - Handles null values gracefully
   - No error alert if no data (uses defaults)

2. **saveSettings()**
   - Added `.select().single()` to upsert
   - Logs settings before save
   - Logs saved data after save
   - Calls `loadSettings()` after alert
   - Stays on screen to verify save

## 📊 Expected Console Output

### On Load:
```
[AdminSettings] MOUNTED
[AdminSettings] Loading settings from database...
[AdminSettings] Settings query result: { data: {...}, error: null }
[AdminSettings] Found settings, loading values...
[AdminSettings] Loaded basic_price: 0
[AdminSettings] Loaded standard_price: 50
...
[AdminSettings] ✅ Settings loaded successfully
```

### On Save:
```
[AdminSettings] Saving settings: { id: '...', basic_price: 100, ... }
[AdminSettings] ✅ Settings saved successfully: { id: '...', ... }
[AdminSettings] Loading settings from database...
[AdminSettings] Loaded basic_price: 100
...
```

## 🚨 If Still Not Working

1. **Check RLS policies** in Supabase dashboard
2. **Check your admin status**: Run in SQL editor
   ```sql
   SELECT id, email, is_admin, role 
   FROM profiles 
   WHERE id = auth.uid();
   ```
3. **Check table data**:
   ```sql
   SELECT * FROM event_settings;
   ```
4. **Check console logs** for error messages
5. **Run DIAGNOSE_EVENT_SETTINGS.sql** for full diagnostic

## ✅ Expected Behavior Now

1. Open admin-settings → Loads saved values (or defaults)
2. Change values → Click save → Shows success alert
3. Click OK on alert → Reloads settings
4. Values should persist and show up immediately
5. Close screen and reopen → Values still there
6. Check other screens → Should use saved values

The settings will now properly persist to the database and reload correctly!
