# Instructions to Create Separate Jobs Table

## Step 1: Run the SQL Migration in Supabase

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the entire contents of `supabase/migrations/create_jobs_table.sql`
5. Paste it into the SQL editor
6. Click "Run" to execute the migration

This will:
- Create a new `jobs` table with proper structure
- Migrate existing job listings from `products_services` to `jobs`
- Delete the migrated jobs from `products_services`
- Set up proper Row Level Security policies

## Step 2: Verify the Migration

After running the migration, verify in Supabase:
1. Go to "Table Editor"
2. You should see a new table called `jobs`
3. Check that your existing job listings have been migrated
4. The `products_services` table should no longer have any `listing_type = 'job'` entries

## What This Fixes

✅ Jobs and Products/Services now have separate tables
✅ Jobs will no longer appear in Products & Services section
✅ Better data structure with dedicated fields (company, location, job_type, etc.)
✅ Improved query performance
✅ Proper separation of concerns

## After Migration

The code has already been updated to:
- Create new jobs in the `jobs` table
- Products & Services page only queries `products_services` table
- Everything will work automatically once the migration is complete
