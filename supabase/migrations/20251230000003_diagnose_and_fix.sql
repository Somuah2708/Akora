-- Comprehensive diagnostic and fix for group_messages table

-- First, let's see if the table exists at all
DO $$
DECLARE
  table_exists boolean;
  col_count integer;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'group_messages'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE NOTICE 'Table group_messages does not exist - creating it now';
    
    -- Create the table from scratch
    CREATE TABLE public.group_messages (
      id uuid primary key default uuid_generate_v4(),
      group_id uuid not null references public.groups(id) on delete cascade,
      sender_id uuid not null references public.profiles(id) on delete set null,
      content text,
      media_url text,
      message_type text not null default 'text',
      created_at timestamptz not null default now(),
      read_by uuid[] not null default '{}'::uuid[]
    );
    
    RAISE NOTICE 'Table group_messages created successfully';
  ELSE
    RAISE NOTICE 'Table group_messages exists - checking columns';
    
    -- Count existing columns
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'group_messages';
    
    RAISE NOTICE 'Table has % columns', col_count;
    
    -- Add missing columns
    ALTER TABLE public.group_messages 
      ADD COLUMN IF NOT EXISTS content text,
      ADD COLUMN IF NOT EXISTS media_url text,
      ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
      ADD COLUMN IF NOT EXISTS read_by uuid[] NOT NULL DEFAULT '{}'::uuid[];
    
    RAISE NOTICE 'Columns verified/added';
  END IF;

  -- Enable RLS
  ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
  
  -- Create index
  CREATE INDEX IF NOT EXISTS idx_group_messages_group_time 
    ON public.group_messages(group_id, created_at desc);
  
  RAISE NOTICE 'RLS enabled and indexes created';
END $$;

-- Now force a complete schema cache reload by modifying the table
DO $$
BEGIN
  -- Drop and recreate comment to force cache refresh
  COMMENT ON TABLE public.group_messages IS NULL;
  COMMENT ON TABLE public.group_messages IS 'Group chat messages - schema cache refreshed';
  
  -- Also add comments to each column to force cache refresh
  COMMENT ON COLUMN public.group_messages.content IS 'Message text content';
  COMMENT ON COLUMN public.group_messages.media_url IS 'URL to media attachment';
  COMMENT ON COLUMN public.group_messages.message_type IS 'Type of message: text, image, video, audio';
  COMMENT ON COLUMN public.group_messages.read_by IS 'Array of user IDs who have read this message';
END $$;

-- Verify the columns exist
DO $$
DECLARE
  col_names text;
BEGIN
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
  INTO col_names
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'group_messages';
  
  RAISE NOTICE 'group_messages columns: %', col_names;
END $$;
