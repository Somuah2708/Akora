/*
  # Simplified Auth Trigger - Remove Alumni Check
  
  Simplify the auth trigger to just create profiles without checking alumni_records.
  This prevents signup failures if alumni_records doesn't exist.
*/

-- Simplified trigger function without alumni_records dependency
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
  v_full_name text;
BEGIN
  -- Extract metadata from raw_user_meta_data with defaults
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  -- Create profile
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    email,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    v_username,
    v_full_name,
    NEW.email,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the actual error
  RAISE LOG 'Error in handle_new_user trigger for user %: %', NEW.id, SQLERRM;
  -- Re-raise the error so signup fails with proper error message
  RAISE;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
