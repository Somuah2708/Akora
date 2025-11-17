# 🔍 DEBUGGING EVENT SETTINGS - Step by Step

## The Problem
You're seeing old prices/payment details even though you think you saved new ones.

## Root Causes (Most Likely)

### 1. Database Table Doesn't Exist ⚠️
**Check:** Run `CHECK_EVENT_SETTINGS_DATA.sql` in Supabase SQL Editor
- If it returns no rows or errors → Run `COMPLETE_EVENT_SETTINGS_FIX.sql` first

### 2. React Native Not Refreshing 🔄
**Check:** Look at your app console/terminal for these logs:
```
[AkoraEvents] Loading package pricing and payment details from database...
[AkoraEvents] Loaded settings: { ... }
[AkoraEvents] ✅ Package pricing and payment details updated
```

**If you DON'T see these logs:**
- The useEffect didn't run
- Try: **Shake device → Reload** OR **Press 'r' in terminal**

**If logs show old values:**
- Database has old data
- Check step 3 below

### 3. Settings Not Actually Saved 💾
**Check:** In Admin Settings screen, look for:
```
[AdminSettings] Saving settings: { premium_price: 320, ... }
[AdminSettings] ✅ Settings saved successfully: { ... }
```

**If you DON'T see "Settings saved successfully":**
- Save failed silently
- Check for RLS policy errors
- Run `COMPLETE_EVENT_SETTINGS_FIX.sql`

---

## Step-by-Step Diagnosis

### Step 1: Check Database Setup
```sql
-- Run in Supabase SQL Editor
-- From: CHECK_EVENT_SETTINGS_DATA.sql

SELECT * FROM public.event_settings;
```

**Expected Result:**
- 1 row with your data
- If 0 rows → Database not set up
- If error → Table doesn't exist

**Fix:** Run `COMPLETE_EVENT_SETTINGS_FIX.sql` in Supabase

---

### Step 2: Verify Save Process

1. Open **Events Admin Settings**
2. Open console/terminal
3. Change Premium price to **999** (easy to spot)
4. Click **Save All Settings**
5. **Look for these logs:**

```
[AdminSettings] Saving settings: {
  premium_price: 999,
  bank_name: "...",
  ...
}
[AdminSettings] ✅ Settings saved successfully: { ... }
```

**If you see RLS error:**
```
new row violates row-level security policy
```
→ Run `COMPLETE_EVENT_SETTINGS_FIX.sql` to fix permissions

**If you see nothing:**
→ Check if you're actually an admin (is_admin = true)

---

### Step 3: Verify Load Process

1. **Close the Events screen completely** (go back to home)
2. Open console/terminal
3. Navigate to **Events screen**
4. **Look for these logs:**

```
[AkoraEvents] Current packagePricing state: { basic: 0, standard: 50, priority: 150, premium: 999 }
[AkoraEvents] Current paymentDetails state: { bankName: "...", ... }
[AkoraEvents] Loading package pricing and payment details from database...
[AkoraEvents] Loaded settings: {
  premium_price: 999,
  bank_name: "...",
  ...
}
[AkoraEvents] ✅ Package pricing and payment details updated
[AkoraEvents] PACKAGES recalculating with pricing: { basic: 0, standard: 50, priority: 150, premium: 999 }
```

**If you see the logs but UI still shows old values:**
→ You need to **hard reload** the app:
- iOS Simulator: Cmd+R
- Android Emulator: Press R R (twice)
- Physical device: Shake device → Reload
- Terminal: Press 'r'

**If you see "No settings data found":**
→ Database is empty, run `COMPLETE_EVENT_SETTINGS_FIX.sql`

---

### Step 4: Force Refresh React Native

Sometimes React Native caches aggressively. Try:

```bash
# In your terminal where Expo is running
# Press 'r' to reload
r

# OR restart with cache clear
npx expo start -c
```

Then:
1. Wait for app to fully reload
2. Navigate to Events screen
3. Check console for load logs
4. Click "Submit Event"
5. See if Premium shows GHS 999

---

### Step 5: Verify in Supabase Directly

Go to Supabase Dashboard → Table Editor → event_settings

**Check:**
- Is there 1 row with ID `00000000-0000-0000-0000-000000000001`?
- Does `premium_price` show 999 (or your test value)?
- Does `bank_name` show your updated value?

**If values are wrong in database:**
→ Save process didn't work
→ Check Step 2 again

**If values are correct in database but wrong in app:**
→ Load process didn't work or app didn't refresh
→ Check Step 3 and Step 4

---

## Quick Test Flow

### Test 1: Pricing Update
1. Admin: Change premium to **777**
2. Admin: Save → See "✅ Settings saved"
3. Supabase: Check table → See `premium_price: 777`
4. App: Close Events screen
5. App: Reopen Events screen → See logs loading 777
6. App: Click Submit Event
7. App: See "Premium - GHS 777" ✅

### Test 2: Bank Details Update
1. Admin: Change bank name to **"TEST BANK"**
2. Admin: Change account to **"999999"**
3. Admin: Save → See "✅ Settings saved"
4. App: Close Events screen
5. App: Reopen Events screen
6. App: Click Submit Event → Scroll to payment
7. App: See "Bank Name: TEST BANK" and "Account Number: 999999" ✅

### Test 3: MoMo Details Update
1. Admin: Change network to **"Vodafone"**
2. Admin: Change number to **"0200 000 000"**
3. Admin: Save → See "✅ Settings saved"
4. App: Close Events screen  
5. App: Reopen Events screen
6. App: Click Submit Event → Scroll to payment
7. App: See "Network: Vodafone" and "Number: 0200 000 000" ✅

---

## Common Mistakes

### ❌ Not Closing the Screen
React components cache. You MUST navigate away and come back.

### ❌ Not Hard Reloading
Sometimes you need to shake device → Reload, not just go back.

### ❌ Database Not Set Up
If table doesn't exist, nothing will work. Run the SQL script first.

### ❌ Not Checking Console
Console logs tell you EXACTLY what's happening. Check them!

### ❌ RLS Policies Missing
Even if table exists, without proper permissions, saves will fail silently.

---

## Success Indicators

### ✅ You'll Know It Works When:

1. **Console shows:**
```
[AdminSettings] ✅ Settings saved successfully
[AkoraEvents] ✅ Package pricing and payment details updated
[AkoraEvents] PACKAGES recalculating with pricing: { premium: 999 }
```

2. **Admin settings screen:**
- Shows your saved values when you reopen it

3. **Events submission form:**
- Premium package shows "GHS 999" (your test value)
- Payment section shows "TEST BANK" (your test value)
- MoMo section shows "Vodafone" (your test value)

4. **Supabase table:**
- Has 1 row with all your values

---

## Still Not Working?

### Last Resort Checklist:

1. ✅ Run `COMPLETE_EVENT_SETTINGS_FIX.sql` in Supabase
2. ✅ Check Supabase table has 1 row with correct data
3. ✅ Restart Expo with `npx expo start -c`
4. ✅ Hard reload app (shake → reload OR Cmd+R)
5. ✅ Navigate to Events screen fresh
6. ✅ Check console for all expected logs
7. ✅ Look at actual rendered values in UI

If ALL of these pass and you still see old values:
→ Share your console logs (all of them)
→ Share screenshot of Supabase table
→ Share screenshot of app UI

---

## Console Commands for Quick Check

### In Expo Terminal:
```
r          # Reload app
c          # Clear cache and reload
```

### Expected Console Output:
```
[AkoraEvents] Current packagePricing state: { basic: 0, standard: 50, priority: 150, premium: 999 }
[AkoraEvents] Current paymentDetails state: { bankName: "TEST BANK", ... }
[AkoraEvents] Loading package pricing and payment details from database...
[AkoraEvents] Loaded settings: { premium_price: 999, bank_name: "TEST BANK", ... }
[AkoraEvents] ✅ Package pricing and payment details updated
[AkoraEvents] PACKAGES recalculating with pricing: { premium: 999 }
```

If you see this → **It's working!** Just need to see it in UI.
If you don't see this → **Problem in database or loading.**
