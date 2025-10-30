-- Step 1: Create the jobs table
CREATE TABLE public.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    title text NOT NULL,
    company text NOT NULL,
    location text NOT NULL,
    job_type text NOT NULL,
    salary text,
    description text NOT NULL,
    requirements text,
    application_link text NOT NULL,
    image_url text,
    is_featured boolean DEFAULT false NOT NULL,
    is_approved boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Step 2: Create indexes
CREATE INDEX idx_jobs_user_id ON public.jobs USING btree (user_id);
CREATE INDEX idx_jobs_job_type ON public.jobs USING btree (job_type);
CREATE INDEX idx_jobs_created_at ON public.jobs USING btree (created_at DESC);

-- Step 3: Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
CREATE POLICY "Enable read access for all users" ON public.jobs
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id" ON public.jobs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id" ON public.jobs
    FOR DELETE USING (auth.uid() = user_id);
