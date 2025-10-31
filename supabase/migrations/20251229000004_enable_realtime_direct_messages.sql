-- Enable Realtime on direct_messages so INSERT/UPDATE events stream to clients
-- Safe to run multiple times; IF NOT EXISTS guards not available for publication add,
-- so wrap in DO block to avoid errors if already added.

DO $$
BEGIN
  -- Ensure the supabase_realtime publication exists (created by extension)
  -- and add our table to it if not already present.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'direct_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages';
  END IF;
END $$;

-- Ensure replica identity to get full row in UPDATE events (old/new)
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;
