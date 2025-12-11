# Donation Tables Migration Summary

## Issue Fixed
The "See All" campaigns button was showing data from the OLD `campaigns` table instead of the NEW `donation_campaigns` table.

## Files Updated

### 1. `/app/donation/all-campaigns/index.tsx`
- Changed from `campaigns` table to `donation_campaigns`
- Updated column names:
  - `target_amount` → `goal_amount`
  - `raised_amount` → `current_amount`
  - `end_date` → `deadline`
  - `image_urls[0]` → `campaign_image`

### 2. `/app/donation/category/[category]/index.tsx`
- Changed from `campaigns` table to `donation_campaigns`
- Updated column names (same as above)
- Removed `.toLowerCase()` from category comparison (categories now use proper case)

### 3. `/app/global-search/index.tsx`
- Changed from `campaigns` table to `donation_campaigns`
- Updated column names in search results
- Fixed progress calculation to use `current_amount` and `goal_amount`

## Table Migration

### OLD Tables (TO BE DELETED):
1. **`campaigns`** - Old donation campaigns table
   - Had columns: `target_amount`, `raised_amount`, `end_date`, `image_urls[]`
   
2. **`donors`** - Old standalone donors table
   - No longer needed; donor info now tracked in `donations` table

### NEW Tables (ACTIVE):
1. **`donation_campaigns`** - Current campaigns table
   - Columns: `goal_amount`, `current_amount`, `deadline`, `campaign_image`
   - Categories: 'Infrastructure', 'Scholarship', 'Equipment', 'Emergency', 'Sports', 'Technology', 'Library', 'Other'

2. **`donations`** - Individual donation records
   - Tracks all donations with user info, amounts, status
   
3. **`donor_tiers`** - Recognition tiers for donors

## Cleanup SQL Files Created

### 1. `CLEANUP_OLD_DONATION_TABLES.sql`
**Use this to remove old donation tables safely**
```sql
-- Drops: campaigns, donors tables and their dependencies
-- Keeps: donation_campaigns, donations, donor_tiers
```

### 2. `IDENTIFY_UNUSED_TABLES.sql`
**Use this to analyze your database for other unused tables**
- Lists all tables with sizes
- Identifies tables with zero rows
- Shows table activity statistics
- Helps identify other potentially unused tables

## How to Clean Up Your Database

### Step 1: Verify Migration
```bash
# In Supabase SQL Editor, run:
psql> SELECT COUNT(*) FROM campaigns;  -- Check old table
psql> SELECT COUNT(*) FROM donation_campaigns;  -- Check new table
```

### Step 2: Backup First!
```bash
# Always backup before dropping tables
psql> pg_dump your_database > backup_before_cleanup.sql
```

### Step 3: Run Cleanup
```bash
# In Supabase SQL Editor, run:
psql> \i CLEANUP_OLD_DONATION_TABLES.sql
```

### Step 4: Identify Other Unused Tables
```bash
# Run analysis:
psql> \i IDENTIFY_UNUSED_TABLES.sql
# Review output for any other tables to clean up
```

## Testing Checklist
- [x] All campaigns screen loads correctly
- [x] Category filter shows campaigns
- [x] Global search finds campaigns
- [ ] Test making a donation
- [ ] Test viewing campaign details
- [ ] Verify admin dashboard works

## Notes
- All app code now uses `donation_campaigns` table
- Old `campaigns` table is safe to delete after verification
- Categories use proper case (e.g., 'Infrastructure', not 'infrastructure')
- Make sure to backup before running cleanup scripts
