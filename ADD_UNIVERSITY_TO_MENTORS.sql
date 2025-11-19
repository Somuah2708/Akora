-- Add university field to alumni_mentors table
-- This allows mentors to be associated with the university where they currently work as staff/faculty

DO $$
BEGIN
  -- Add university column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='alumni_mentors' AND column_name='university'
  ) THEN
    ALTER TABLE public.alumni_mentors 
    ADD COLUMN university text;
    
    COMMENT ON COLUMN public.alumni_mentors.university IS 'Name of the university where the mentor currently works as staff/faculty';
  END IF;

  -- Add university_id column for foreign key reference (optional, for data integrity)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='alumni_mentors' AND column_name='university_id'
  ) THEN
    ALTER TABLE public.alumni_mentors 
    ADD COLUMN university_id uuid REFERENCES public.products_services(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN public.alumni_mentors.university_id IS 'Foreign key reference to products_services table for universities where mentor works';
    
    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_alumni_mentors_university_id 
    ON public.alumni_mentors(university_id);
  END IF;
END $$;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'alumni_mentors'
AND column_name IN ('university', 'university_id')
ORDER BY column_name;
