-- Fix auth trigger - add email column and fix trigger function

-- Add email column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- Drop and recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
  v_full_name text;
  v_first_name text;
  v_surname text;
  v_class text;
  v_year_group text;
  v_house text;
BEGIN
  -- Extract metadata from raw_user_meta_data with defaults
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_surname := COALESCE(NEW.raw_user_meta_data->>'surname', '');
  v_class := COALESCE(NEW.raw_user_meta_data->>'class', '');
  v_year_group := COALESCE(NEW.raw_user_meta_data->>'year_group', '');
  v_house := COALESCE(NEW.raw_user_meta_data->>'house', '');

  -- Create profile (use INSERT with ON CONFLICT to handle duplicates)
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    first_name,
    surname,
    class,
    year_group,
    house,
    email,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    v_username,
    v_full_name,
    v_first_name,
    v_surname,
    v_class,
    v_year_group,
    v_house,
    NEW.email,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();

  -- Mark alumni record as registered if exists (ignore errors)
  BEGIN
    UPDATE alumni_records
    SET is_registered = true
    WHERE email = NEW.email AND is_registered = false;
  EXCEPTION WHEN OTHERS THEN
    -- Silently ignore alumni_records errors
    NULL;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth signup
  RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
