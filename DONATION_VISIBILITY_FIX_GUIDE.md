# Donation Visibility Fix - Implementation Guide

## Problem
Donations made by admin account were not visible to other users, and campaign progress bars were not updating correctly.

## Root Cause
The `donations` table had overly restrictive Row Level Security (RLS) policies that prevented users from seeing donations made by others.

## Solution Implemented

### 1. SQL Changes (FIX_DONATION_VISIBILITY.sql)

#### Updated RLS Policies:
- ✅ **Allow all authenticated users to view APPROVED donations** - For transparency
- ✅ **Users can always see their own donations** - Regardless of status (pending/rejected)
- ✅ **Admins can view ALL donations** - Including pending and rejected for management
- ✅ **Users can create their own donations**
- ✅ **Admins can update any donation** - For approval/rejection

#### Fixed Trigger Function:
- ✅ Added `SECURITY DEFINER` to `update_campaign_amount()` function
- ✅ This allows the trigger to bypass RLS when updating campaign amounts
- ✅ Added logging to track amount updates
- ✅ Protected against negative values with `GREATEST()`

#### Recalculation Query:
- ✅ SQL query to recalculate all campaign amounts based on approved donations
- ✅ Fixes any existing discrepancies

### 2. App Code Changes

#### app/donation/campaign/[id].tsx:
- ✅ Added `useFocusEffect` to refresh campaign data when screen comes into focus
- ✅ Ensures latest donation amounts and donor counts are displayed
- ✅ Already correctly filters for approved donations in `fetchDonors()`

#### app/donation/index.tsx:
- ✅ Added `useFocusEffect` to refresh all data when returning to donations screen
- ✅ Already correctly queries approved donations for stats
- ✅ Already correctly aggregates total amounts from approved donations

## Steps to Apply Fix

### Step 1: Run the SQL File
```sql
-- In Supabase SQL Editor, run:
FIX_DONATION_VISIBILITY.sql
```

This will:
1. Update all RLS policies on the donations table
2. Fix the trigger function with SECURITY DEFINER
3. Recalculate all campaign amounts to fix any discrepancies
4. Show verification queries to confirm the changes

### Step 2: Test the Changes

#### Test as Admin:
1. Log in as admin
2. Go to a campaign
3. Make a donation
4. Approve the donation in admin panel
5. ✅ Verify campaign progress bar updates immediately
6. ✅ Verify donation count increases

#### Test as Regular User:
1. Log in as regular user
2. Go to the same campaign
3. ✅ Verify you can see the admin's approved donation
4. ✅ Verify the donor shows in the donors list (unless anonymous)
5. ✅ Verify campaign progress bar reflects the donation
6. ✅ Verify total raised amount includes the donation

#### Test Donations Screen:
1. Return to main donations screen
2. ✅ Verify "Total Raised" stat includes all approved donations
3. ✅ Verify "Hall of Fame" shows top donors across all users
4. ✅ Verify campaign cards show correct progress

### Step 3: Verify Real-time Updates

1. Have admin and user accounts open simultaneously
2. Admin approves a donation
3. User refreshes or navigates back to donations screen
4. ✅ User should immediately see updated amounts

## What This Fixes

### Before:
❌ Users could only see their own donations
❌ Campaign progress didn't update for other users
❌ Donor counts were incorrect
❌ Total raised amounts were inconsistent
❌ Top donors list only showed current user's donations

### After:
✅ All users can see approved donations (transparency)
✅ Campaign progress updates correctly for everyone
✅ Donor counts are accurate and real-time
✅ Total raised reflects all approved donations
✅ Top donors shows actual top donors across all users
✅ Progress bars move when donations are approved
✅ Stats are consistent across all accounts

## Technical Details

### RLS Policy Structure:
```
donations table policies:
├── SELECT: authenticated → approved donations (everyone can see)
├── SELECT: authenticated → own donations (all statuses)
├── SELECT: authenticated + admin → all donations (admin only)
├── INSERT: authenticated → own donations
└── UPDATE: authenticated + admin → all donations (admin only)
```

### Trigger Flow:
```
Donation approved
    ↓
Trigger: update_campaign_amount_trigger
    ↓
Function: update_campaign_amount() [SECURITY DEFINER]
    ↓
Updates: donation_campaigns.current_amount
         donation_campaigns.donors_count
    ↓
Bypasses RLS restrictions
    ↓
All users see updated amounts
```

## Files Modified

1. **FIX_DONATION_VISIBILITY.sql** (NEW)
   - RLS policy updates
   - Trigger function fix
   - Recalculation queries

2. **app/donation/campaign/[id].tsx**
   - Added useFocusEffect for auto-refresh

3. **app/donation/index.tsx**
   - Added useFocusEffect for auto-refresh

## Notes

- The `SECURITY DEFINER` on the trigger function is crucial - without it, the trigger would also be restricted by RLS
- Approved donations are now public (transparent) - this is intentional for fundraising transparency
- Users still maintain privacy for pending/rejected donations
- Anonymous donations remain anonymous across all accounts
- Progress bars will now accurately reflect campaign progress in real-time

## Troubleshooting

If donations still don't show:

1. **Verify RLS policies were created:**
   ```sql
   SELECT policyname, cmd FROM pg_policies 
   WHERE tablename = 'donations' 
   ORDER BY policyname;
   ```

2. **Check trigger exists:**
   ```sql
   SELECT tgname FROM pg_trigger 
   WHERE tgrelid = 'donations'::regclass;
   ```

3. **Verify campaign amounts:**
   ```sql
   SELECT id, title, current_amount, donors_count,
          (SELECT COUNT(*) FROM donations 
           WHERE campaign_id = donation_campaigns.id 
           AND status = 'approved') as actual_donors
   FROM donation_campaigns;
   ```

4. **Check donation status:**
   ```sql
   SELECT id, campaign_id, amount, status, user_id 
   FROM donations 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

## Success Criteria

✅ Admin donation shows in user account
✅ Progress bar updates when viewing campaign
✅ Donor count increases correctly
✅ Total raised reflects all donations
✅ Top donors list shows all users' donations
✅ Campaign amounts are consistent across accounts
✅ Anonymous donations remain anonymous
✅ Users can't see pending donations from others
