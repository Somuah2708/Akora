# Scholarship Fields Diagnostic Guide

## Issue Report
**Problem**: Categories (scholarship_types, eligibility_levels, fields_of_study) and contact_email fields are not showing up after being saved.

## Code Analysis Results ✅

After reviewing your code, I found that:

### ✅ Database Schema is CORRECT
The migration script (`MIGRATE_EDUCATION_TABLES.sql` lines 42-44, 47) includes:
```sql
scholarship_types text[],
eligibility_levels text[],
fields_of_study text[],
contact_email text,
```

### ✅ Admin UI Saving is CORRECT
File: `app/admin-education-scholarships.tsx` lines 366-370
```typescript
scholarship_types: selectedScholarshipTypes.length > 0 ? selectedScholarshipTypes : null,
eligibility_levels: selectedEligibilityLevels.length > 0 ? selectedEligibilityLevels : null,
fields_of_study: selectedFieldsOfStudy.length > 0 ? selectedFieldsOfStudy : null,
contact_email: contactEmail.trim() || null,
```

### ✅ Admin UI Loading is CORRECT
File: `app/admin-education-scholarships.tsx` lines 298-300
```typescript
setSelectedScholarshipTypes(scholarship.scholarship_types || []);
setSelectedEligibilityLevels(scholarship.eligibility_levels || []);
setSelectedFieldsOfStudy(scholarship.fields_of_study || []);
```

### ✅ Detail Screen Display is CORRECT
File: `app/education/detail/[id].tsx` lines 398-443
- Shows scholarship_types as tags
- Shows eligibility_levels as tags  
- Shows fields_of_study as tags
- Shows contact_email in contact section

---

## Diagnostic Steps

### Step 1: Verify Database Columns Exist

Run `VERIFY_SCHOLARSHIP_FIELDS.sql` in Supabase SQL Editor.

**Query 1**: Check if columns exist
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'scholarships'
  AND column_name IN ('scholarship_types', 'eligibility_levels', 'fields_of_study', 'contact_email');
```

**Expected**: 4 rows showing these columns

**If columns are missing**: The migration didn't run properly. Re-run `MIGRATE_EDUCATION_TABLES.sql`

---

### Step 2: Check Existing Data

**Query 2**: Look at recent scholarships
```sql
SELECT 
  id,
  title,
  scholarship_types,
  eligibility_levels,
  fields_of_study,
  contact_email
FROM public.scholarships
ORDER BY created_at DESC
LIMIT 10;
```

**Check**:
- Are the array fields showing as `{value1,value2}` format?
- Or are they showing as `NULL`?

**If all NULL**: Data hasn't been saved yet (columns exist but empty)

---

### Step 3: Test the Save Function

1. **Open Admin Panel** → Education → Scholarships
2. **Click Edit** on any scholarship
3. **Select Categories**:
   - Pick 2-3 Scholarship Types (e.g., "Merit-based", "STEM")
   - Pick 2 Eligibility Levels (e.g., "Undergraduate", "Graduate")
   - Pick 2 Fields of Study (e.g., "Engineering", "Computer Science & IT")
4. **Add Contact Email**: test@example.com
5. **Click "Update Scholarship"**
6. **Check the response**: Does it say "Success"?

---

### Step 4: Verify Data Saved

Run this query (replace with your scholarship ID):
```sql
SELECT 
  title,
  scholarship_types,
  eligibility_levels,
  fields_of_study,
  contact_email
FROM public.scholarships
WHERE id = 'YOUR_SCHOLARSHIP_ID_HERE';
```

**Expected Result**:
```
title: "Example Scholarship"
scholarship_types: {Merit-based,STEM}
eligibility_levels: {Undergraduate,Graduate}
fields_of_study: {Engineering,"Computer Science & IT"}
contact_email: "test@example.com"
```

---

### Step 5: Check Detail Screen Display

1. **Navigate to Education tab** in app
2. **Click on the scholarship** you just edited
3. **Scroll down** - you should see sections for:
   - "Scholarship Type" with blue tags
   - "Eligibility Level" with blue tags
   - "Fields of Study" with blue tags
   - "Contact Information" with email

**If you DON'T see these sections**: The data didn't save properly

---

## Possible Issues & Solutions

### Issue A: Columns Don't Exist
**Symptom**: Query 1 returns 0 rows

**Solution**: Run the migration script again
```bash
# In Supabase SQL Editor, run:
MIGRATE_EDUCATION_TABLES.sql
```

---

### Issue B: Data Not Saving
**Symptom**: Fields show as NULL after saving

**Check**:
1. Are you seeing "Success" message when saving?
2. Check browser console for errors (F12)
3. Check Supabase logs for errors

**Possible causes**:
- RLS policies blocking update (admin policy should allow)
- Array fields not in correct format
- Database trigger rejecting data

**Debug**: Add console.log in admin-education-scholarships.tsx line 365:
```typescript
console.log('Saving scholarship with data:', {
  scholarship_types: selectedScholarshipTypes,
  eligibility_levels: selectedEligibilityLevels,
  fields_of_study: selectedFieldsOfStudy,
  contact_email: contactEmail
});
```

---

### Issue C: Data Saved But Not Displayed
**Symptom**: Database shows data, but detail screen is blank

**Possible causes**:
1. **Array parsing issue**: React Native might not be parsing PostgreSQL arrays correctly
2. **Conditional rendering**: Fields might be hidden if arrays are empty

**Solution**: Check the detail screen code (lines 398-443) and ensure:
```typescript
{opportunity.scholarship_types && opportunity.scholarship_types.length > 0 && (
  // Display logic
)}
```

Add debug console.log in detail screen:
```typescript
console.log('Opportunity data:', {
  scholarship_types: opportunity.scholarship_types,
  eligibility_levels: opportunity.eligibility_levels,
  fields_of_study: opportunity.fields_of_study,
  contact_email: opportunity.contact_email
});
```

---

### Issue D: Edit Form Not Loading Saved Data
**Symptom**: When you click Edit, the chips are not pre-selected

**Check**: Line 298-300 in admin-education-scholarships.tsx should be loading the data

**Debug**: Add console.log in openEditModal:
```typescript
console.log('Loading scholarship for edit:', {
  scholarship_types: scholarship.scholarship_types,
  eligibility_levels: scholarship.eligibility_levels,
  fields_of_study: scholarship.fields_of_study
});
```

---

## Quick Fix Test

If you want to manually test if everything works, run this in Supabase:

```sql
-- Get a scholarship ID
SELECT id, title FROM public.scholarships LIMIT 1;

-- Manually update it (use the ID from above)
UPDATE public.scholarships
SET 
  scholarship_types = ARRAY['Merit-based', 'STEM'],
  eligibility_levels = ARRAY['Undergraduate', 'Graduate'],
  fields_of_study = ARRAY['Engineering', 'Computer Science & IT'],
  contact_email = 'test@example.com'
WHERE id = 'PASTE_ID_HERE';

-- Verify it saved
SELECT 
  title,
  scholarship_types,
  eligibility_levels,
  fields_of_study,
  contact_email
FROM public.scholarships
WHERE id = 'PASTE_ID_HERE';
```

Then check if this scholarship shows the fields in the detail screen.

**If YES**: The database is fine, issue is with UI saving
**If NO**: Issue is with UI display/fetching

---

## Next Steps

1. ✅ Run `VERIFY_SCHOLARSHIP_FIELDS.sql` (Step 1 & 2)
2. ✅ Share the results with me
3. ✅ Try editing a scholarship (Step 3)
4. ✅ Check if data saves (Step 4)
5. ✅ Check if it displays (Step 5)

Then I can pinpoint exactly where the issue is!

---

## Expected Behavior

After everything works:

### Admin Edit Screen:
- Shows chip selection for all three categories
- Pre-selects saved values when editing
- Shows contact email in text field

### Detail Screen:
- Shows blue tag badges for scholarship types
- Shows blue tag badges for eligibility levels
- Shows blue tag badges for fields of study
- Shows contact email as clickable link

### Admin List Screen:
- (Currently) Doesn't show these fields
- (Optional enhancement) Could add badges/icons

