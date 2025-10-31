-- ================================================
-- IMPORTANT: Run this SQL in your Supabase Dashboard
-- ================================================
-- This migration adds support for multiple images per post
-- Adds image_urls column (array) to store up to 20 images
-- ================================================

-- Step 1: Add image_urls column (JSON array of strings)
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- Step 2: Add comment for documentation
COMMENT ON COLUMN posts.image_urls IS 'Array of image URLs (up to 20 images per post)';

-- Step 3: Add check constraint to limit array size (max 20 images)
ALTER TABLE posts 
ADD CONSTRAINT posts_image_urls_max_length 
CHECK (array_length(image_urls, 1) IS NULL OR array_length(image_urls, 1) <= 20);

-- Step 4: Verify the column was created
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'posts' 
AND column_name = 'image_urls';

-- ================================================
-- After running this, you should see output like:
-- column_name  | data_type      | is_nullable
-- image_urls   | ARRAY          | YES
-- ================================================
-- 
-- USAGE:
-- - Single image posts: image_url field still works (backward compatible)
-- - Multiple images: Use image_urls array with up to 20 URLs
-- - Both fields can coexist for backward compatibility
-- ================================================
