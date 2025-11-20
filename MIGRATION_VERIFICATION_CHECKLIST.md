# Education Tables Migration - Verification Checklist

## ✅ Code Review (Completed)

All application code has been verified to use the correct tables:

### 1. Education Listing Screen (`app/education/index.tsx`) ✓
- **Scholarships**: Uses `.from('scholarships')` table
- **Universities**: Uses `.from('universities')` table  
- **Events**: Uses `.from('events')` table
- **Mentors**: Uses `.from('alumni_mentors')` table (already existed)
- All other items (Study Resources, Courses, Study Groups): Still use `products_services` (correct)

### 2. Education Detail Screen (`app/education/detail/[id].tsx`) ✓
- Checks `scholarships` table first
- Then checks `universities` table
- Then checks `events` table
- Falls back to `products_services` for marketplace items
- **Status**: Perfect waterfall logic

### 3. Admin Screens ✓
- `admin-education-scholarships.tsx`: Uses `.from('scholarships')` - 8 queries verified
- `admin-education-universities.tsx`: Uses `.from('universities')` - 4 queries verified
- Both correctly configured

### 4. Marketplace Screens ✓
- `app/services/index.tsx`: Uses `.from('products_services')` 
- `app/services/[id].tsx`: Uses `.from('products_services')`
- `app/services/category/[categoryName].tsx`: Uses `.from('products_services')`
- **Status**: Marketplace unaffected by migration

---

## 🔍 Database Verification Steps

### Step 1: Confirm Migration Executed Successfully

**Action**: Run the updated `MIGRATE_EDUCATION_TABLES.sql` in Supabase SQL Editor

**Expected Result**: Script completes without errors

**Status**: ⏳ PENDING - Please run the script and report any errors

---

### Step 2: Verify Data Migration

**Action**: Run this query in Supabase SQL Editor (STEP 5 from migration script):

```sql
SELECT 
  'Scholarships' as table_name, 
  COUNT(*) as record_count 
FROM public.scholarships
UNION ALL
SELECT 
  'Universities' as table_name, 
  COUNT(*) as record_count 
FROM public.universities
UNION ALL
SELECT 
  'Events' as table_name, 
  COUNT(*) as record_count 
FROM public.events
UNION ALL
SELECT 
  'products_services (remaining)' as table_name, 
  COUNT(*) as record_count 
FROM public.products_services;
```

**Expected Results**:
- Scholarships: [number] records (should match old products_services count for Scholarships)
- Universities: [number] records (should match old products_services count for Universities)
- Events: [number] records (should match old products_services count for Events)
- products_services: [reduced number] (only marketplace items: Services, Products, Study Resources, Courses, Study Groups)

**Status**: ⏳ PENDING - Please run query and share results

---

### Step 3: Verify Table Structures

**Action**: Check that all required columns exist:

```sql
-- Check scholarships table columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'scholarships' 
ORDER BY ordinal_position;

-- Check universities table columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'universities' 
ORDER BY ordinal_position;

-- Check events table columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;
```

**Expected**: All columns from migration script should be present

**Status**: ⏳ PENDING

---

### Step 4: Verify RLS Policies

**Action**: Check policies were created:

```sql
-- Check scholarships policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'scholarships';

-- Check universities policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'universities';

-- Check events policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'events';
```

**Expected Policies for Each Table**:
1. "Anyone can view approved [items]"
2. "Users can create [items]"
3. "Users can update their own [items]"
4. "Users can delete their own [items]"
5. "Admins can manage all [items]"

**Status**: ⏳ PENDING

---

## 📱 Application Testing Steps

### Test 1: Education Listing Page

**Actions**:
1. Open the app and navigate to Education tab
2. Check "Universities" tab shows university cards
3. Check "Scholarships" tab shows scholarship cards
4. Check "Mentors" tab shows alumni mentors
5. Verify images display correctly
6. Verify all data fields show properly (title, description, location, etc.)

**Expected**: All education items display correctly from new tables

**Status**: ⏳ PENDING

---

### Test 2: Education Detail Pages

**Actions**:
1. Click on a scholarship → Should open detail page with scholarship info
2. Click on a university → Should open detail page with university info
3. Click on an event → Should open detail page with event info
4. Verify all fields display correctly
5. Test external links work (website URLs, application URLs)

**Expected**: Detail pages load correct data from new tables

**Status**: ⏳ PENDING

---

### Test 3: Admin Scholarship Management

**Actions** (as admin user):
1. Navigate to admin panel → Education → Scholarships
2. Verify existing scholarships display
3. Create a new scholarship
4. Edit an existing scholarship
5. Delete a test scholarship
6. Approve/reject a scholarship

**Expected**: All CRUD operations work on `scholarships` table

**Status**: ⏳ PENDING

---

### Test 4: Admin University Management

**Actions** (as admin user):
1. Navigate to admin panel → Education → Universities
2. Verify existing universities display
3. Create a new university
4. Edit an existing university
5. Delete a test university

**Expected**: All CRUD operations work on `universities` table

**Status**: ⏳ PENDING

---

### Test 5: Marketplace Functionality

**Actions**:
1. Navigate to Services/Marketplace section
2. Verify products and services still display
3. Check Study Resources category works
4. Check Courses category works
5. Verify marketplace items can be created/edited

**Expected**: Marketplace completely unaffected, still uses `products_services`

**Status**: ⏳ PENDING

---

### Test 6: User Permissions (RLS)

**Actions** (as regular user):
1. Create a scholarship (should succeed)
2. Try to edit someone else's scholarship (should fail)
3. Try to delete someone else's scholarship (should fail)
4. View approved scholarships (should succeed)
5. Try to view unapproved scholarships (should only see your own)

**Expected**: RLS policies correctly enforce user permissions

**Status**: ⏳ PENDING

---

### Test 7: Search and Filtering

**Actions**:
1. Search for scholarships by keyword
2. Filter universities by location
3. Search for mentors by expertise
4. Verify search works across all education tabs

**Expected**: Search/filter functionality works with new tables

**Status**: ⏳ PENDING

---

### Test 8: Bookmarks/Favorites

**Actions**:
1. Bookmark a scholarship
2. Bookmark a university  
3. Navigate to bookmarks/favorites section
4. Verify bookmarked items display
5. Remove bookmark

**Expected**: Bookmark functionality works with new table IDs

**Status**: ⏳ PENDING

---

## 🔧 Troubleshooting Guide

### If Migration Fails

**Common Issues**:

1. **CHECK constraint violation on event_type**
   - Migration now drops constraint temporarily
   - Updates invalid values to 'workshop'
   - If still fails, valid values might be different

2. **Column already exists errors**
   - Migration uses `IF NOT EXISTS` checks
   - Should be safe to re-run

3. **Data duplication**
   - Migration uses `ON CONFLICT (id) DO NOTHING`
   - Safe to re-run without creating duplicates

### If Screens Don't Load Data

1. **Check RLS policies**: Ensure `is_approved = true` for viewing
2. **Check user authentication**: Must be logged in
3. **Check console logs**: Look for Supabase query errors
4. **Verify table names**: Must match exactly (scholarships, universities, events)

### If Marketplace Broken

- Marketplace should be completely unaffected
- Still uses `products_services` table
- Only education categories (Scholarships, Universities, Events) were migrated

---

## ✅ Final Verification

Once all steps above are completed:

- [ ] Migration script executed successfully
- [ ] All data migrated correctly (verify counts)
- [ ] All table structures correct
- [ ] All RLS policies in place
- [ ] Education listing works
- [ ] Education details work
- [ ] Admin scholarship management works
- [ ] Admin university management works
- [ ] Marketplace unaffected
- [ ] User permissions enforced
- [ ] Search/filter works
- [ ] Bookmarks work

**Migration Status**: ⏳ IN PROGRESS

---

## 📋 Next Steps After Verification

1. **Backup Confirmation**: Ensure you have a database backup before cleanup
2. **Monitor Production**: Watch for any errors in logs for 24-48 hours
3. **Optional Cleanup**: After confirming everything works for a few days, run STEP 6 cleanup to remove migrated records from `products_services`

```sql
-- ONLY RUN AFTER THOROUGH VERIFICATION (STEP 6 from migration)
DELETE FROM public.products_services WHERE category_name = 'Scholarships';
DELETE FROM public.products_services WHERE category_name = 'Universities';
DELETE FROM public.products_services WHERE category_name IN ('Events', 'Educational Events');
```

---

## 📞 Support

If you encounter any issues:
1. Check the error message carefully
2. Review this checklist for common issues
3. Check Supabase logs for detailed error info
4. Verify the migration script completed all steps
