-- Create job applications table
CREATE TABLE IF NOT EXISTS public.job_applications (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Applicant Information
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    
    -- Application Content
    cover_letter TEXT,
    resume_url TEXT, -- URL to uploaded resume
    additional_documents TEXT[], -- Array of document URLs
    
    -- Additional Info
    portfolio_url TEXT,
    linkedin_url TEXT,
    years_of_experience INTEGER,
    expected_salary TEXT,
    availability_date TEXT,
    
    -- Application Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'shortlisted', 'rejected', 'accepted')),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    review_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Prevent duplicate applications
    UNIQUE(job_id, applicant_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_job_applications_job_id ON public.job_applications(job_id);
CREATE INDEX idx_job_applications_applicant_id ON public.job_applications(applicant_id);
CREATE INDEX idx_job_applications_status ON public.job_applications(status);
CREATE INDEX idx_job_applications_created_at ON public.job_applications(created_at DESC);

-- Enable RLS
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Applicants can view their own applications
CREATE POLICY "Users can view their own applications" 
    ON public.job_applications FOR SELECT
    USING (auth.uid() = applicant_id);

-- Applicants can insert their own applications
CREATE POLICY "Users can create applications" 
    ON public.job_applications FOR INSERT
    WITH CHECK (auth.uid() = applicant_id);

-- Applicants can update their own pending applications
CREATE POLICY "Users can update their pending applications" 
    ON public.job_applications FOR UPDATE
    USING (auth.uid() = applicant_id AND status = 'pending');

-- Job posters can view applications for their jobs
CREATE POLICY "Job posters can view applications for their jobs" 
    ON public.job_applications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE jobs.id = job_applications.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

-- Job posters can update application status for their jobs
CREATE POLICY "Job posters can update applications for their jobs" 
    ON public.job_applications FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE jobs.id = job_applications.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_application_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_job_applications_updated_at
    BEFORE UPDATE ON public.job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_job_application_updated_at();

-- Create notifications table for job applications if not exists
CREATE TABLE IF NOT EXISTS public.job_application_notifications (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('new_application', 'status_changed', 'message')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_job_application_notifications_recipient ON public.job_application_notifications(recipient_id, is_read);
CREATE INDEX idx_job_application_notifications_created_at ON public.job_application_notifications(created_at DESC);

ALTER TABLE public.job_application_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" 
    ON public.job_application_notifications FOR SELECT
    USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update their own notifications" 
    ON public.job_application_notifications FOR UPDATE
    USING (auth.uid() = recipient_id);
