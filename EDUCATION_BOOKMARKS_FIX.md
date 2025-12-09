# Education Bookmarks Fix - Summary

## Problem
The `education_bookmarks` table had an incorrect foreign key constraint pointing to the `products_services` table, but universities and scholarships are stored in separate tables (`universities` and `scholarships`). This caused a foreign key violation error when trying to bookmark items.

## Solution
Removed the invalid foreign key constraint and added an `opportunity_type` column to track whether a bookmark is for a university, scholarship, or mentor.

---

## Changes Made

### 1. Database Schema Update (SQL Required)
**File:** `FIX_EDUCATION_BOOKMARKS_FK.sql`

The table structure has been changed from:
```sql
-- OLD (incorrect)
opportunity_id UUID REFERENCES products_services(id)
```

To:
```sql
-- NEW (correct)
opportunity_id UUID NOT NULL,
opportunity_type TEXT NOT NULL CHECK (opportunity_type IN ('university', 'scholarship', 'mentor'))
```

**🚨 ACTION REQUIRED:** You need to run the SQL migration in your Supabase dashboard:
1. Go to: https://supabase.com/dashboard/project/eclpduejlabiazblkvgh/sql
2. Copy and paste the SQL from `FIX_EDUCATION_BOOKMARKS_FK.sql`
3. Click "Run" to execute

Or run: `node scripts/fix-education-bookmarks.js` to see the SQL to copy.

---

### 2. Code Updates
**File:** `app/education/index.tsx`

#### a) Updated `toggleBookmark` function (line ~522)
- Added `opportunityType` parameter: `'university' | 'scholarship'`
- Now inserts/deletes with `opportunity_type` field:
```typescript
const toggleBookmark = async (opportunityId: string, opportunityType: 'university' | 'scholarship', event: any) => {
  // ... 
  await supabase.from('education_bookmarks').insert({ 
    user_id: user.id, 
    opportunity_id: opportunityId,
    opportunity_type: opportunityType  // ← NEW
  });
}
```

#### b) Updated `toggleFavoriteMentor` function (line ~458)
- Changed from using `mentor_id` column to `opportunity_id` with type `'mentor'`
- Matches the unified bookmark structure:
```typescript
await supabase.from('education_bookmarks').insert({ 
  user_id: user.id, 
  opportunity_id: mentorId,
  opportunity_type: 'mentor'  // ← NEW
});
```

#### c) Updated `fetchBookmarks` function (line ~238)
- Filters by opportunity types:
```typescript
.in('opportunity_type', ['university', 'scholarship'])
```

#### d) Updated `fetchFavoriteMentors` function (line ~252)
- Uses `opportunity_id` instead of `mentor_id`
- Filters by type:
```typescript
.select('opportunity_id')
.eq('opportunity_type', 'mentor')
```

#### e) Updated bookmark button calls (lines ~740, ~918)
- University bookmark: `toggleBookmark(university.id, 'university', e)`
- Scholarship bookmark: `toggleBookmark(scholarship.id, 'scholarship', e)`

---

## Testing After SQL Migration

Once you run the SQL migration:

1. **Test University Bookmarks:**
   - Click the star icon on a university card
   - Should save without errors
   - Star should turn gold (#ffc857)

2. **Test Scholarship Bookmarks:**
   - Click the star icon on a scholarship card
   - Should save without errors
   - Star should turn gold (#ffc857)

3. **Test Mentor Favorites:**
   - Click the star icon on a mentor card
   - Should save without errors
   - Star should turn gold (#ffc857)

4. **Test Persistence:**
   - Close and reopen the app
   - Bookmarked items should still show gold stars

---

## Files Modified
1. ✅ `app/education/index.tsx` - Updated bookmark functions and calls
2. ✅ `FIX_EDUCATION_BOOKMARKS_FK.sql` - Database migration script
3. ✅ `scripts/fix-education-bookmarks.js` - Helper script to display SQL

---

## Next Steps
1. ⚠️ **Run the SQL migration** in Supabase dashboard
2. Test bookmarking functionality
3. Verify stars turn gold when clicked
4. Verify bookmarks persist after app reload
