-- CREATE SAVED ANNOUNCEMENTS TABLE
-- This allows users to save/bookmark announcements for later viewing

-- ============================================================================
-- STEP 1: Create saved_announcements table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.saved_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES public.secretariat_announcements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one save per user per announcement
  UNIQUE(user_id, announcement_id)
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_saved_announcements_user_id 
ON public.saved_announcements(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_announcements_announcement_id 
ON public.saved_announcements(announcement_id);

CREATE INDEX IF NOT EXISTS idx_saved_announcements_created_at 
ON public.saved_announcements(created_at DESC);

-- ============================================================================
-- STEP 3: Enable Row Level Security
-- ============================================================================

ALTER TABLE public.saved_announcements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own saved announcements" ON public.saved_announcements;
DROP POLICY IF EXISTS "Users can save announcements" ON public.saved_announcements;
DROP POLICY IF EXISTS "Users can unsave their own saved announcements" ON public.saved_announcements;

-- Create policies
CREATE POLICY "Users can view their own saved announcements"
ON public.saved_announcements
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can save announcements"
ON public.saved_announcements
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave their own saved announcements"
ON public.saved_announcements
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 4: Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, DELETE ON public.saved_announcements TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- STEP 5: Add table comments
-- ============================================================================

COMMENT ON TABLE public.saved_announcements IS 'Stores user-saved announcements for quick access later';
COMMENT ON COLUMN public.saved_announcements.user_id IS 'The user who saved the announcement';
COMMENT ON COLUMN public.saved_announcements.announcement_id IS 'The announcement that was saved';

-- ============================================================================
-- STEP 6: Verification
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'saved_announcements'
  ) THEN
    RAISE NOTICE '';
    RAISE NOTICE '=================================================';
    RAISE NOTICE '✓ SAVED ANNOUNCEMENTS TABLE CREATED!';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Users can now:';
    RAISE NOTICE '  ✓ Save announcements for later';
    RAISE NOTICE '  ✓ View their saved announcements';
    RAISE NOTICE '  ✓ Unsave announcements';
    RAISE NOTICE '=================================================';
  ELSE
    RAISE NOTICE '✗ Table creation failed';
  END IF;
END $$;
