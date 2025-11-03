-- Ensure no server-side 12-visible limit is enforced for profile_highlights
-- Safe to run multiple times

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trg_enforce_max_visible_highlights ON public.profile_highlights;

-- Drop function if it exists
DROP FUNCTION IF EXISTS public.enforce_max_visible_highlights();

-- Additionally, drop any other non-internal triggers on profile_highlights (defensive)
DO $$
DECLARE r record;
BEGIN
	FOR r IN
		SELECT tgname
		FROM pg_trigger
		WHERE tgrelid = 'public.profile_highlights'::regclass
			AND NOT tgisinternal
	LOOP
		EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.profile_highlights', r.tgname);
	END LOOP;
END $$;
