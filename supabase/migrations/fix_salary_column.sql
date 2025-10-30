-- Alter the salary column from numeric to text
ALTER TABLE public.jobs ALTER COLUMN salary TYPE text USING salary::text;
