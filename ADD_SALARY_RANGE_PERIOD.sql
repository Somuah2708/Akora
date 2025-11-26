-- Add salary range and period columns to jobs table
-- This migration enhances the salary field to support:
-- 1. Salary ranges (min-max)
-- 2. Payment periods (monthly, yearly, hourly, etc.)

-- Add minimum salary column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'salary_min'
    ) THEN
        ALTER TABLE public.jobs ADD COLUMN salary_min DECIMAL(10, 2);
        COMMENT ON COLUMN public.jobs.salary_min IS 'Minimum salary amount (numeric value only)';
    END IF;
END $$;

-- Add maximum salary column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'salary_max'
    ) THEN
        ALTER TABLE public.jobs ADD COLUMN salary_max DECIMAL(10, 2);
        COMMENT ON COLUMN public.jobs.salary_max IS 'Maximum salary amount (numeric value only)';
    END IF;
END $$;

-- Add salary currency column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'salary_currency'
    ) THEN
        ALTER TABLE public.jobs ADD COLUMN salary_currency TEXT DEFAULT 'USD';
        COMMENT ON COLUMN public.jobs.salary_currency IS 'Currency for salary (USD, GHS, EUR, etc.)';
    END IF;
END $$;

-- Add salary period column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'salary_period'
    ) THEN
        ALTER TABLE public.jobs ADD COLUMN salary_period TEXT DEFAULT 'monthly';
        COMMENT ON COLUMN public.jobs.salary_period IS 'Payment period: hourly, daily, weekly, monthly, yearly';
    END IF;
END $$;

-- Create index for salary range queries
CREATE INDEX IF NOT EXISTS idx_jobs_salary_range ON public.jobs(salary_min, salary_max);

-- Note: The existing 'salary' TEXT column is kept for backward compatibility
-- and can be used as a formatted display string like "USD 3,000 - 5,000/month"

COMMENT ON TABLE public.jobs IS 'Job listings table with enhanced salary range and period support';
