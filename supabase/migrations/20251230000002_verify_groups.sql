-- Verify and fix group_messages table structure

-- Check if table exists and has correct columns
DO $$
BEGIN
  -- Ensure all required columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'group_messages' 
    AND column_name = 'content'
  ) THEN
    ALTER TABLE public.group_messages ADD COLUMN content text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'group_messages' 
    AND column_name = 'media_url'
  ) THEN
    ALTER TABLE public.group_messages ADD COLUMN media_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'group_messages' 
    AND column_name = 'message_type'
  ) THEN
    ALTER TABLE public.group_messages ADD COLUMN message_type text NOT NULL DEFAULT 'text';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'group_messages' 
    AND column_name = 'read_by'
  ) THEN
    ALTER TABLE public.group_messages ADD COLUMN read_by uuid[] NOT NULL DEFAULT '{}'::uuid[];
  END IF;
END $$;

-- Reload schema cache by touching the table
COMMENT ON TABLE public.group_messages IS 'Group chat messages with realtime support - updated';
