-- =====================================================
-- ADD JOB LISTING ENHANCEMENTS
-- Add fields for better job posting functionality
-- =====================================================

-- Add job-specific columns to products_services table
DO $$ BEGIN
    -- Requirements (JSON array of strings)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products_services' AND column_name = 'requirements'
    ) THEN
        ALTER TABLE products_services ADD COLUMN requirements JSONB;
        COMMENT ON COLUMN products_services.requirements IS 'Array of job requirements/qualifications';
    END IF;

    -- Responsibilities (JSON array of strings)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products_services' AND column_name = 'responsibilities'
    ) THEN
        ALTER TABLE products_services ADD COLUMN responsibilities JSONB;
        COMMENT ON COLUMN products_services.responsibilities IS 'Array of job responsibilities/duties';
    END IF;

    -- Benefits (JSON array of strings)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products_services' AND column_name = 'benefits'
    ) THEN
        ALTER TABLE products_services ADD COLUMN benefits JSONB;
        COMMENT ON COLUMN products_services.benefits IS 'Array of job benefits/perks';
    END IF;

    -- Application deadline
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products_services' AND column_name = 'application_deadline'
    ) THEN
        ALTER TABLE products_services ADD COLUMN application_deadline DATE;
        COMMENT ON COLUMN products_services.application_deadline IS 'Last date to apply for the job';
    END IF;

    -- Salary range minimum
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products_services' AND column_name = 'salary_min'
    ) THEN
        ALTER TABLE products_services ADD COLUMN salary_min DECIMAL(10, 2);
        COMMENT ON COLUMN products_services.salary_min IS 'Minimum salary offered';
    END IF;

    -- Salary range maximum
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products_services' AND column_name = 'salary_max'
    ) THEN
        ALTER TABLE products_services ADD COLUMN salary_max DECIMAL(10, 2);
        COMMENT ON COLUMN products_services.salary_max IS 'Maximum salary offered';
    END IF;

    -- Company logo URL
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products_services' AND column_name = 'company_logo'
    ) THEN
        ALTER TABLE products_services ADD COLUMN company_logo TEXT;
        COMMENT ON COLUMN products_services.company_logo IS 'URL to company logo image';
    END IF;

    -- Company name (separate from description)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products_services' AND column_name = 'company_name'
    ) THEN
        ALTER TABLE products_services ADD COLUMN company_name TEXT;
        COMMENT ON COLUMN products_services.company_name IS 'Name of the hiring company/organization';
    END IF;

    -- Location (separate from description)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products_services' AND column_name = 'location'
    ) THEN
        ALTER TABLE products_services ADD COLUMN location TEXT;
        COMMENT ON COLUMN products_services.location IS 'Job location (city, country, or "Remote")';
    END IF;

    -- Employment type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products_services' AND column_name = 'employment_type'
    ) THEN
        ALTER TABLE products_services ADD COLUMN employment_type TEXT 
        CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'internship', 'volunteer', 'national_service'));
        COMMENT ON COLUMN products_services.employment_type IS 'Type of employment arrangement';
    END IF;

    -- Experience level
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products_services' AND column_name = 'experience_level'
    ) THEN
        ALTER TABLE products_services ADD COLUMN experience_level TEXT 
        CHECK (experience_level IN ('entry', 'mid', 'senior', 'executive', 'student'));
        COMMENT ON COLUMN products_services.experience_level IS 'Required experience level';
    END IF;

    -- External application URL
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products_services' AND column_name = 'external_url'
    ) THEN
        ALTER TABLE products_services ADD COLUMN external_url TEXT;
        COMMENT ON COLUMN products_services.external_url IS 'External URL for job application (if not applying through platform)';
    END IF;

    -- Number of openings
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products_services' AND column_name = 'openings_count'
    ) THEN
        ALTER TABLE products_services ADD COLUMN openings_count INTEGER DEFAULT 1;
        COMMENT ON COLUMN products_services.openings_count IS 'Number of positions available';
    END IF;

    -- View count for analytics
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products_services' AND column_name = 'view_count'
    ) THEN
        ALTER TABLE products_services ADD COLUMN view_count INTEGER DEFAULT 0;
        COMMENT ON COLUMN products_services.view_count IS 'Number of times job has been viewed';
    END IF;

    -- Application count
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products_services' AND column_name = 'application_count'
    ) THEN
        ALTER TABLE products_services ADD COLUMN application_count INTEGER DEFAULT 0;
        COMMENT ON COLUMN products_services.application_count IS 'Number of applications received';
    END IF;

END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_services_company_name ON products_services(company_name);
CREATE INDEX IF NOT EXISTS idx_products_services_location ON products_services(location);
CREATE INDEX IF NOT EXISTS idx_products_services_employment_type ON products_services(employment_type);
CREATE INDEX IF NOT EXISTS idx_products_services_experience_level ON products_services(experience_level);
CREATE INDEX IF NOT EXISTS idx_products_services_application_deadline ON products_services(application_deadline);
CREATE INDEX IF NOT EXISTS idx_products_services_salary_range ON products_services(salary_min, salary_max);

-- =====================================================
-- FUNCTION TO INCREMENT VIEW COUNT
-- =====================================================
CREATE OR REPLACE FUNCTION increment_job_view_count(job_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE products_services
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION TO INCREMENT APPLICATION COUNT
-- =====================================================
CREATE OR REPLACE FUNCTION increment_job_application_count(job_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE products_services
    SET application_count = COALESCE(application_count, 0) + 1
    WHERE id = job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION increment_job_view_count TO authenticated;
GRANT EXECUTE ON FUNCTION increment_job_application_count TO authenticated;
