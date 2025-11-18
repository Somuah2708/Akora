-- Migration to fix existing jobs and ensure approval system works

-- Step 1: Add approval_status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products_services' 
        AND column_name = 'approval_status'
    ) THEN
        ALTER TABLE products_services 
        ADD COLUMN approval_status TEXT DEFAULT 'approved' 
        CHECK (approval_status IN ('pending', 'approved', 'declined'));
    END IF;
END $$;

-- Step 2: Update existing jobs to have approval_status based on is_approved
UPDATE products_services 
SET approval_status = CASE 
    WHEN is_approved = true THEN 'approved'
    WHEN is_approved = false THEN 'pending'
    ELSE 'approved'
END
WHERE approval_status IS NULL;

-- Step 3: Auto-approve all existing jobs that don't have approval_status set
UPDATE products_services 
SET 
    approval_status = 'approved',
    is_approved = true,
    approved_at = created_at
WHERE approval_status IS NULL OR approval_status = 'pending';

-- Step 4: Verify the update
SELECT 
    approval_status, 
    COUNT(*) as count 
FROM products_services 
GROUP BY approval_status;
