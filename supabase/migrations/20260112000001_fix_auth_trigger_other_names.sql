-- Fix auth trigger to include ALL fields (required + optional)

-- Drop and recreate the trigger function with full field support
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Required fields
  v_username text;
  v_full_name text;
  v_first_name text;
  v_surname text;
  v_other_names text;
  v_class text;
  v_year_group text;
  v_house text;
  -- Optional fields
  v_occupation_status text;
  v_job_title text;
  v_company_name text;
  v_institution_name text;
  v_program_of_study text;
  v_graduation_year integer;
  v_current_study_year integer;
  v_location text;
  v_phone text;
  v_bio text;
BEGIN
  -- Extract REQUIRED metadata from raw_user_meta_data with defaults
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_surname := COALESCE(NEW.raw_user_meta_data->>'surname', '');
  v_other_names := COALESCE(NEW.raw_user_meta_data->>'other_names', '');
  v_class := COALESCE(NEW.raw_user_meta_data->>'class', '');
  v_year_group := COALESCE(NEW.raw_user_meta_data->>'year_group', '');
  v_house := COALESCE(NEW.raw_user_meta_data->>'house', '');
  
  -- Extract OPTIONAL metadata from raw_user_meta_data
  v_occupation_status := NEW.raw_user_meta_data->>'occupation_status';
  v_job_title := NEW.raw_user_meta_data->>'job_title';
  v_company_name := NEW.raw_user_meta_data->>'company_name';
  v_institution_name := NEW.raw_user_meta_data->>'institution_name';
  v_program_of_study := NEW.raw_user_meta_data->>'program_of_study';
  v_graduation_year := (NEW.raw_user_meta_data->>'graduation_year')::integer;
  v_current_study_year := (NEW.raw_user_meta_data->>'current_study_year')::integer;
  v_location := NEW.raw_user_meta_data->>'location';
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_bio := NEW.raw_user_meta_data->>'bio';

  -- Create profile with ALL fields (use INSERT with ON CONFLICT to handle duplicates)
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    first_name,
    surname,
    other_names,
    class,
    year_group,
    house,
    email,
    -- Optional fields
    occupation_status,
    job_title,
    company_name,
    institution_name,
    program_of_study,
    graduation_year,
    current_study_year,
    location,
    phone,
    bio,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    v_username,
    v_full_name,
    v_first_name,
    v_surname,
    NULLIF(v_other_names, ''),
    v_class,
    v_year_group,
    v_house,
    NEW.email,
    -- Optional fields
    v_occupation_status,
    v_job_title,
    v_company_name,
    v_institution_name,
    v_program_of_study,
    v_graduation_year,
    v_current_study_year,
    v_location,
    v_phone,
    v_bio,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(NULLIF(EXCLUDED.username, ''), profiles.username),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), profiles.first_name),
    surname = COALESCE(NULLIF(EXCLUDED.surname, ''), profiles.surname),
    other_names = COALESCE(EXCLUDED.other_names, profiles.other_names),
    class = COALESCE(NULLIF(EXCLUDED.class, ''), profiles.class),
    year_group = COALESCE(NULLIF(EXCLUDED.year_group, ''), profiles.year_group),
    house = COALESCE(NULLIF(EXCLUDED.house, ''), profiles.house),
    -- Optional fields (only update if new value is provided)
    occupation_status = COALESCE(EXCLUDED.occupation_status, profiles.occupation_status),
    job_title = COALESCE(EXCLUDED.job_title, profiles.job_title),
    company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
    institution_name = COALESCE(EXCLUDED.institution_name, profiles.institution_name),
    program_of_study = COALESCE(EXCLUDED.program_of_study, profiles.program_of_study),
    graduation_year = COALESCE(EXCLUDED.graduation_year, profiles.graduation_year),
    current_study_year = COALESCE(EXCLUDED.current_study_year, profiles.current_study_year),
    location = COALESCE(EXCLUDED.location, profiles.location),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    bio = COALESCE(EXCLUDED.bio, profiles.bio),
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
