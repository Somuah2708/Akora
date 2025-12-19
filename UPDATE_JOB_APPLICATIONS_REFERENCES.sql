-- =============================================
-- UPDATE JOB APPLICATIONS TABLE REFERENCES
-- =============================================
-- Updates job_applications table to reference the jobs table
-- instead of products_services table

-- Step 1: Drop the existing foreign key constraint on job_id
-- Note: The constraint name may vary, so we need to find it dynamically
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'job_applications' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.column_name = 'job_id';
    
    -- Drop the constraint if it exists
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE job_applications DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped foreign key constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No foreign key constraint found on job_id column';
    END IF;
END $$;

-- Step 2: Add new foreign key constraint referencing jobs table
-- Only if the jobs table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'jobs'
    ) THEN
        -- Check if there's already a FK to jobs table
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'job_applications' 
                AND tc.constraint_type = 'FOREIGN KEY'
                AND ccu.table_name = 'jobs'
                AND ccu.column_name = 'id'
        ) THEN
            -- Add new FK constraint
            ALTER TABLE job_applications 
                ADD CONSTRAINT job_applications_job_id_fkey 
                FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key constraint referencing jobs table';
        ELSE
            RAISE NOTICE 'Foreign key to jobs table already exists';
        END IF;
    ELSE
        RAISE NOTICE 'jobs table does not exist - please create it first';
    END IF;
END $$;

-- Step 3: Clean up any orphaned applications that reference non-existent jobs
-- This will delete applications that don't have a corresponding job in the jobs table
-- Be careful with this in production!
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Count applications that would be deleted
    SELECT COUNT(*) INTO deleted_count
    FROM job_applications ja
    WHERE NOT EXISTS (
        SELECT 1 FROM jobs j WHERE j.id = ja.job_id
    );
    
    IF deleted_count > 0 THEN
        RAISE NOTICE 'Found % orphaned applications that reference non-existent jobs', deleted_count;
        -- Uncomment the following to actually delete orphaned records:
        -- DELETE FROM job_applications ja
        -- WHERE NOT EXISTS (
        --     SELECT 1 FROM jobs j WHERE j.id = ja.job_id
        -- );
        -- RAISE NOTICE 'Deleted % orphaned applications', deleted_count;
    ELSE
        RAISE NOTICE 'No orphaned applications found';
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Job applications table updated to reference jobs table!';
    RAISE NOTICE 'Note: You may need to migrate existing application data if jobs were stored in products_services';
END $$;
