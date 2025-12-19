# Jobs Table Migration Summary

This document outlines the SQL migrations needed to complete the migration from `products_services` table to a dedicated `jobs` table for the Jobs & Internships feature.

## Migration Order

Run these SQL files in the following order in your Supabase SQL Editor:

### 1. UPDATE_JOBS_TABLE_SCHEMA.sql
Adds missing columns to the jobs table:
- `salary_min`, `salary_max`, `salary_currency`, `salary_period`
- `contact_email`, `application_deadline`
- `rejection_reason`, `admin_reviewed_at`, `admin_reviewed_by`
- Updates RLS policies to allow users to see their own pending/rejected jobs

### 2. UPDATE_JOB_APPLICATIONS_REFERENCES.sql
Updates the `job_applications` table:
- Drops foreign key constraint referencing `products_services`
- Adds new foreign key constraint referencing `jobs` table
- Note: May need to clean up orphaned applications if any exist

### 3. MIGRATE_JOB_APPROVAL_TO_JOBS_TABLE.sql
Updates all job approval functions:
- `get_pending_jobs()` - Now queries `jobs` table
- `approve_job()` - Now updates `jobs` table
- `decline_job()` - Now updates `jobs` table
- Updates triggers for new job notifications
- Updates `get_admin_notification_count()`

## Files Updated in the App

The following files were updated to use the `jobs` table:

### Already Using `jobs` Table (no changes needed):
- `app/create-job-listing/index.tsx`
- `app/job-detail/[id].tsx`
- `app/job-application/[id].tsx`
- `app/job-applications-review/[id].tsx`
- `app/workplace/index.tsx`
- `app/my-applications/index.tsx`

### Updated to Use `jobs` Table:
- `app/edit-job-listing/[id].tsx` - Fetch, update, delete operations
- `app/workplace/[id].tsx` - Job details page
- `app/workplace/recent-opportunities/index.tsx` - Recent jobs list
- `app/workplace/category/[categoryName].tsx` - Category filtering
- `app/admin/job-approvals.tsx` - Admin approval UI

## Jobs Table Schema

The `jobs` table has the following structure:

```sql
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    job_type TEXT NOT NULL,  -- Full Time Jobs, Internships, National Service, etc.
    salary TEXT,              -- Formatted string (e.g., "GHS 2000 - 3000/month")
    salary_min NUMERIC,       -- Minimum salary amount
    salary_max NUMERIC,       -- Maximum salary amount
    salary_currency TEXT DEFAULT 'GHS',
    salary_period TEXT DEFAULT 'monthly',
    description TEXT NOT NULL,
    requirements TEXT,
    contact_email TEXT,
    application_deadline TIMESTAMPTZ,
    application_link TEXT,
    image_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    rejection_reason TEXT,
    admin_reviewed_at TIMESTAMPTZ,
    admin_reviewed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Important Notes

1. **Data Migration**: If you have existing job listings in `products_services`, you'll need to manually migrate them to the `jobs` table before running the foreign key updates.

2. **job_applications Table**: After running the migrations, the `job_applications.job_id` will reference `jobs(id)` instead of `products_services(id)`.

3. **Backup**: Always backup your database before running these migrations.

4. **Testing**: Test in a development environment first before applying to production.
