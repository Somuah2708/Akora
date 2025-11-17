# Testing the Attending Count Feature

## What Was Fixed

### 1. **Real-time RSVP Count Updates**
- The attending count now updates immediately when users RSVP
- Count is fetched directly from `event_rsvps` table (100% accurate)
- Double refresh: immediate + 500ms delay to catch any database triggers

### 2. **Enhanced Visual Display**
- **Green badge** with Users icon shows attending count
- More prominent styling with better colors
- Shows "1 person attending" or "X people attending"
- Located right below the event location

### 3. **Better Logging**
- Console logs show when RSVP is updated
- Console logs show the loaded count
- Easier to debug any issues

## How to Test

### Step 1: Run SQL Setup
First, ensure the database is set up correctly:

```sql
-- Run this in Supabase SQL Editor
-- File: FIX_RSVP_COUNT_COLUMN.sql
ALTER TABLE akora_events ADD COLUMN IF NOT EXISTS rsvp_count INTEGER DEFAULT 0;
```

Or run the full setup:
```sql
-- File: CREATE_EVENT_RSVPS_TABLE.sql
-- This creates everything needed
```

### Step 2: Verify Database
Run the diagnostic script to check everything is working:
```sql
-- File: DIAGNOSE_RSVP_SYSTEM.sql
-- This will show you table structure, RSVPs, etc.
```

### Step 3: Test in App

#### Test 1: Basic RSVP
1. Open any event
2. Look for "Will you be attending this event?" section
3. Click "Yes, I'm Going"
4. Watch the green badge above update: "1 person attending"

#### Test 2: Multiple Users
1. Sign out and sign in with a different account
2. Go to the same event
3. Click "Yes, I'm Going"
4. Count should now show "2 people attending"

#### Test 3: Changing RSVP
1. Click "Maybe" instead
2. Count should decrease by 1
3. Click "Yes, I'm Going" again
4. Count should increase by 1

#### Test 4: Real-time Update
1. Have the event open on two devices/accounts
2. RSVP on one device
3. Pull to refresh or navigate away and back on the other device
4. Count should match on both

## What You Should See

### Before RSVP:
```
┌─────────────────────────────────┐
│ Event Title                      │
│ 📅 December 20, 2025, 6:00 PM   │
│ 📍 Main Campus Auditorium        │
│                                   │
│ ┌─────────────────────┐          │
│ │ 👥 0 people attending│          │ ← Starts at 0
│ └─────────────────────┘          │
└─────────────────────────────────┘
```

### After 1 RSVP:
```
┌─────────────────────────────────┐
│ Event Title                      │
│ 📅 December 20, 2025, 6:00 PM   │
│ 📍 Main Campus Auditorium        │
│                                   │
│ ┌─────────────────────┐          │
│ │ 👥 1 person attending│          │ ← Updates immediately!
│ └─────────────────────┘          │
└─────────────────────────────────┘
```

### After 5 RSVPs:
```
┌─────────────────────────────────┐
│ Event Title                      │
│ 📅 December 20, 2025, 6:00 PM   │
│ 📍 Main Campus Auditorium        │
│                                   │
│ ┌──────────────────────┐         │
│ │ 👥 5 people attending│         │ ← Green badge, very visible
│ └──────────────────────┘         │
└─────────────────────────────────┘
```

## Console Logs to Watch For

When you RSVP, you should see:
```
Updating RSVP for event abc123 to status: attending
RSVP created successfully: {id: "xyz", ...}
Loaded RSVP count for event abc123: 1 attending
```

## Troubleshooting

### Count shows 0 but people have RSVP'd
**Solution**: 
1. Check if `event_rsvps` table exists
2. Run `DIAGNOSE_RSVP_SYSTEM.sql` to see actual data
3. Verify event_id matches between tables

### Count doesn't update after RSVP
**Solution**:
1. Check console logs for errors
2. Verify the RSVP was saved: 
   ```sql
   SELECT * FROM event_rsvps WHERE user_id = 'your-user-id';
   ```
3. Try pulling down to refresh the event page

### Error: "table event_rsvps does not exist"
**Solution**:
Run `CREATE_EVENT_RSVPS_TABLE.sql` in Supabase

### Count is wrong
**Solution**:
Manually sync the counts:
```sql
UPDATE akora_events
SET rsvp_count = (
  SELECT COUNT(*)
  FROM event_rsvps
  WHERE event_rsvps.event_id = akora_events.id
  AND event_rsvps.status = 'attending'
);
```

## Code Changes Made

### 1. `loadRsvpCount()` function
- Now always queries `event_rsvps` table directly
- Shows 0 if table doesn't exist
- Logs the count for debugging

### 2. `handleRsvp()` function  
- Calls `loadRsvpCount()` immediately after RSVP
- Calls again after 500ms delay (catches trigger updates)
- Better console logging

### 3. Visual Design
- Green badge with border for "attending" count
- Larger icon (16px instead of 14px)
- Better color contrast (#10B981 green)
- Shows singular/plural text correctly

## Expected Behavior

✅ Count updates immediately when you RSVP
✅ Count shows correct number of attending users
✅ Only counts "attending" status (not "maybe" or "can't attend")
✅ Works across multiple users/devices
✅ Visual feedback is clear and professional
✅ No delays or lag in updating

## Success Criteria

- [ ] Event page loads and shows "0 people attending" initially
- [ ] After clicking "Yes, I'm Going", count updates to "1 person attending"
- [ ] With another user, count increases to "2 people attending"
- [ ] Changing to "Maybe" decreases count back down
- [ ] Console shows successful RSVP and count loading logs
- [ ] Badge is green and clearly visible below location
- [ ] No errors in console or app

## Support

If the count still doesn't update:
1. Check Supabase logs for errors
2. Verify RLS policies allow reading from event_rsvps
3. Check that your user is authenticated
4. Run the diagnostic SQL script for detailed info
