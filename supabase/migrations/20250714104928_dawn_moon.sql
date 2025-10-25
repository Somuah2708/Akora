/*
  # Reset Kwesi Somuah's registration status

  1. Changes
    - Sets is_registered to false for Kwesi Somuah's alumni record
    - Ensures the record exists by inserting it if not present
*/

-- First, check if the record exists and update it if it does
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM alumni_records 
    WHERE first_name = 'Kwesi' 
    AND surname = 'Somuah' 
    AND class = 'Science 5' 
    AND year_group = '2017' 
    AND house = 'Kwapong House'
  ) THEN
    -- Update the existing record to ensure is_registered is false
    UPDATE alumni_records
    SET is_registered = false
    WHERE first_name = 'Kwesi' 
    AND surname = 'Somuah' 
    AND class = 'Science 5' 
    AND year_group = '2017' 
    AND house = 'Kwapong House';
  ELSE
    -- Insert a new record if it doesn't exist
    INSERT INTO alumni_records (first_name, surname, class, year_group, house, is_registered)
    VALUES ('Kwesi', 'Somuah', 'Science 5', '2017', 'Kwapong House', false);
  END IF;
END $$;