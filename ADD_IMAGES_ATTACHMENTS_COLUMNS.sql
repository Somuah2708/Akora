-- ADD IMAGES AND ATTACHMENTS COLUMNS TO SECRETARIAT_ANNOUNCEMENTS
-- This adds support for multiple images and file attachments

-- ============================================================================
-- STEP 1: Add images column (JSONB array)
-- ============================================================================

-- Check if images column exists, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'secretariat_announcements' 
    AND column_name = 'images'
  ) THEN
    ALTER TABLE public.secretariat_announcements 
    ADD COLUMN images JSONB DEFAULT NULL;
    
    RAISE NOTICE '✓ Added images column';
  ELSE
    RAISE NOTICE 'ℹ images column already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add attachments column (JSONB array)
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'secretariat_announcements' 
    AND column_name = 'attachments'
  ) THEN
    ALTER TABLE public.secretariat_announcements 
    ADD COLUMN attachments JSONB DEFAULT NULL;
    
    RAISE NOTICE '✓ Added attachments column';
  ELSE
    RAISE NOTICE 'ℹ attachments column already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.secretariat_announcements.images IS 
  'Array of image objects with url and optional caption: [{"url": "...", "caption": "..."}]';

COMMENT ON COLUMN public.secretariat_announcements.attachments IS 
  'Array of attachment objects: [{"name": "...", "url": "...", "size": "...", "type": "..."}]';

-- ============================================================================
-- STEP 4: Migrate existing image_url to images array (if needed)
-- ============================================================================

-- For announcements that have image_url but no images array, convert to array format
UPDATE public.secretariat_announcements
SET images = jsonb_build_array(
  jsonb_build_object('url', image_url)
)
WHERE image_url IS NOT NULL 
  AND image_url != '' 
  AND (images IS NULL OR images = 'null'::jsonb);

-- ============================================================================
-- STEP 5: Create indexes for JSONB columns (optional, for performance)
-- ============================================================================

-- Index for querying images
CREATE INDEX IF NOT EXISTS idx_secretariat_announcements_images 
ON public.secretariat_announcements USING GIN (images);

-- Index for querying attachments
CREATE INDEX IF NOT EXISTS idx_secretariat_announcements_attachments 
ON public.secretariat_announcements USING GIN (attachments);

-- ============================================================================
-- STEP 6: Verification
-- ============================================================================

DO $$
DECLARE
  has_images BOOLEAN;
  has_attachments BOOLEAN;
BEGIN
  -- Check if columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'secretariat_announcements' 
    AND column_name = 'images'
  ) INTO has_images;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'secretariat_announcements' 
    AND column_name = 'attachments'
  ) INTO has_attachments;
  
  -- Display results
  RAISE NOTICE '';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'COLUMN VERIFICATION';
  RAISE NOTICE '=================================================';
  
  IF has_images THEN
    RAISE NOTICE '✓ images column exists';
  ELSE
    RAISE NOTICE '✗ images column missing';
  END IF;
  
  IF has_attachments THEN
    RAISE NOTICE '✓ attachments column exists';
  ELSE
    RAISE NOTICE '✗ attachments column missing';
  END IF;
  
  RAISE NOTICE '=================================================';
  RAISE NOTICE '';
  
  -- Show sample data structure
  RAISE NOTICE 'Expected data structure:';
  RAISE NOTICE 'images: [{"url": "https://...", "caption": "Optional caption"}]';
  RAISE NOTICE 'attachments: [{"name": "file.pdf", "url": "...", "size": "1.5 MB", "type": "application/pdf"}]';
  RAISE NOTICE '=================================================';
END $$;

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================

/*

TO RUN THIS MIGRATION:

1. Go to your Supabase Dashboard
2. Navigate to: SQL Editor
3. Copy and paste this entire file
4. Click "Run" or press Ctrl+Enter

WHAT THIS DOES:
- Adds 'images' column (JSONB) to store multiple images with captions
- Adds 'attachments' column (JSONB) to store file attachments
- Migrates existing image_url data to new images array format
- Creates GIN indexes for better JSONB query performance
- Adds documentation comments

AFTER RUNNING:
- Your app will be able to store multiple images per announcement
- Users can add file attachments to announcements
- All existing announcements with image_url will have that converted to images array

*/
