/*
  # Add Kwesi Somuah's alumni record

  1. New Records
    - Adding Kwesi Somuah's record to the alumni_records table with:
      - First name: Kwesi
      - Surname: Somuah
      - Class: Science 5
      - Year group: 2017
      - House: Kwapong House
      - Not registered yet (is_registered = false)
*/

INSERT INTO alumni_records (
  first_name,
  surname,
  class,
  year_group,
  house,
  is_registered,
  created_at
)
VALUES (
  'Kwesi',
  'Somuah',
  'Science 5',
  '2017',
  'Kwapong House',
  false,
  now()
);