-- Create public storage bucket for chat media (images, videos, voice notes)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'chat-media'
  ) THEN
    -- Try newer signature: (id text, public boolean)
    BEGIN
      PERFORM storage.create_bucket('chat-media', true);
    EXCEPTION WHEN undefined_function THEN
      -- Try older signature: (id text)
      BEGIN
        PERFORM storage.create_bucket('chat-media');
      EXCEPTION WHEN others THEN
        -- Fallback: direct insert into storage.buckets with name (covers NOT NULL on name)
        BEGIN
          INSERT INTO storage.buckets (id, name, public)
          VALUES ('chat-media', 'chat-media', true)
          ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, name = EXCLUDED.name;
        EXCEPTION WHEN others THEN
          -- Last resort ensure row exists and is public
          UPDATE storage.buckets SET public = true, name = COALESCE(name, 'chat-media')
          WHERE id = 'chat-media';
        END;
      END;
    END;
  END IF;
  -- Ensure bucket is public
  UPDATE storage.buckets SET public = true WHERE id = 'chat-media';
END $$;

-- Ensure RLS is enabled on storage.objects (required for policies)
DO $$
BEGIN
  BEGIN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege THEN
    -- Not enough privileges to alter table; skip. RLS is usually enabled by default in Supabase.
    NULL;
  END;
END $$;

-- Public read access for chat-media bucket (needed for getPublicUrl)
DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "chat-media public read" ON storage.objects;
    CREATE POLICY "chat-media public read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'chat-media');
  EXCEPTION WHEN insufficient_privilege THEN
    -- Not owner; please add this policy via Storage UI if needed.
    NULL;
  END;
END $$;

-- Authenticated users can upload to chat-media; owner is set to auth.uid() automatically
DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "chat-media insert by owner" ON storage.objects;
    CREATE POLICY "chat-media insert by owner"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'chat-media' AND owner = auth.uid());
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;

-- Allow owners to delete their own media if needed
DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "chat-media delete by owner" ON storage.objects;
    CREATE POLICY "chat-media delete by owner"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'chat-media' AND owner = auth.uid());
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;
