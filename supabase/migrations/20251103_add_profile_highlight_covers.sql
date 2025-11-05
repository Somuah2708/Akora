-- Create a simple table to store custom cover thumbnails per (user_id, title)
create table if not exists public.profile_highlight_covers (
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  cover_url text,
  updated_at timestamptz not null default now(),
  primary key (user_id, title)
);

alter table public.profile_highlight_covers enable row level security;

-- Allow anyone to read covers (covers are used to render public highlight containers)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profile_highlight_covers' AND policyname='Anyone can view covers'
  ) THEN
    CREATE POLICY "Anyone can view covers" ON public.profile_highlight_covers
      FOR SELECT USING (true);
  END IF;
END $$;

-- Only owners can insert/update/delete their covers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profile_highlight_covers' AND policyname='Owners can insert covers'
  ) THEN
    CREATE POLICY "Owners can insert covers" ON public.profile_highlight_covers
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profile_highlight_covers' AND policyname='Owners can update covers'
  ) THEN
    CREATE POLICY "Owners can update covers" ON public.profile_highlight_covers
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profile_highlight_covers' AND policyname='Owners can delete covers'
  ) THEN
    CREATE POLICY "Owners can delete covers" ON public.profile_highlight_covers
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
