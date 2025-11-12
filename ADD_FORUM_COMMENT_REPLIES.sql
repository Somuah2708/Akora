-- Adds threaded reply support to forum_comments with parent_comment_id
-- Idempotent and safe to run multiple times

-- 1) Add parent_comment_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'forum_comments' AND column_name = 'parent_comment_id'
  ) THEN
    ALTER TABLE public.forum_comments ADD COLUMN parent_comment_id uuid;
  END IF;
END$$;

-- 2) Add FK constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public' 
      AND tc.table_name = 'forum_comments'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'parent_comment_id'
  ) THEN
    ALTER TABLE public.forum_comments
      ADD CONSTRAINT forum_comments_parent_fk
      FOREIGN KEY (parent_comment_id) REFERENCES public.forum_comments(id) ON DELETE CASCADE;
  END IF;
END$$;

-- 3) Add index for faster lookup
CREATE INDEX IF NOT EXISTS idx_forum_comments_parent_id ON public.forum_comments(parent_comment_id);
