-- Drop the old message column and ensure content column is correct

DO $$
BEGIN
  -- Drop the old 'message' column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'group_messages' 
    AND column_name = 'message'
  ) THEN
    ALTER TABLE public.group_messages DROP COLUMN message;
    RAISE NOTICE 'Dropped old message column';
  END IF;

  -- Ensure content column exists and is nullable
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'group_messages' 
    AND column_name = 'content'
  ) THEN
    ALTER TABLE public.group_messages ADD COLUMN content text;
    RAISE NOTICE 'Added content column';
  ELSE
    -- Make sure content column is nullable (not required for media-only messages)
    ALTER TABLE public.group_messages ALTER COLUMN content DROP NOT NULL;
    RAISE NOTICE 'Made content column nullable';
  END IF;
END $$;

-- Force schema cache refresh
COMMENT ON COLUMN public.group_messages.content IS 'Message text content (nullable for media-only messages)';
