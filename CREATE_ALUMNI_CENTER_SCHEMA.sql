-- =============================================================================
-- ALUMNI CENTER DATABASE SCHEMA
-- =============================================================================

-- ============================================================================
-- TABLE: alumni_profiles
-- Description: Stores alumni information and profiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.alumni_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    graduation_year INTEGER NOT NULL,
    department VARCHAR(100),
    program VARCHAR(150),
    job_title VARCHAR(100),
    company VARCHAR(150),
    industry VARCHAR(100),
    location VARCHAR(100),
    city VARCHAR(100),
    country VARCHAR(100),
    bio TEXT,
    profile_picture_url VARCHAR(255),
    linkedin_url VARCHAR(255),
    twitter_url VARCHAR(255),
    website_url VARCHAR(255),
    is_public BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    skills JSONB DEFAULT '[]'::jsonb,
    achievements JSONB DEFAULT '[]'::jsonb,
    interests JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: alumni_events
-- Description: Stores alumni events (reunions, seminars, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.alumni_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES auth.users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) DEFAULT 'general',
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    location VARCHAR(200),
    venue VARCHAR(200),
    is_virtual BOOLEAN DEFAULT false,
    meeting_link VARCHAR(255),
    capacity INTEGER,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    is_published BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    banner_image_url VARCHAR(255),
    registration_fee DECIMAL(10, 2) DEFAULT 0,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: alumni_event_registrations
-- Description: Tracks event registrations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.alumni_event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.alumni_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    alumni_id UUID REFERENCES public.alumni_profiles(id),
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'registered',
    payment_status VARCHAR(20) DEFAULT 'pending',
    attended BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
);

-- ============================================================================
-- TABLE: alumni_news
-- Description: News and updates about alumni achievements
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.alumni_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES auth.users(id),
    title VARCHAR(200) NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    author_name VARCHAR(100),
    featured_image_url VARCHAR(255),
    is_published BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    publish_date TIMESTAMP WITH TIME ZONE,
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: alumni_connections
-- Description: Connections between alumni members
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.alumni_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES public.alumni_profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.alumni_profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(requester_id, receiver_id)
);

-- ============================================================================
-- TABLE: alumni_messages
-- Description: Direct messages between alumni
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.alumni_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.alumni_profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.alumni_profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: alumni_notifications
-- Description: Notifications for alumni users
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.alumni_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) DEFAULT 'general',
    reference_id UUID,
    reference_type VARCHAR(50),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_alumni_profiles_user_id ON public.alumni_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_alumni_profiles_email ON public.alumni_profiles(email);
CREATE INDEX IF NOT EXISTS idx_alumni_profiles_graduation_year ON public.alumni_profiles(graduation_year);
CREATE INDEX IF NOT EXISTS idx_alumni_profiles_department ON public.alumni_profiles(department);
CREATE INDEX IF NOT EXISTS idx_alumni_profiles_is_public ON public.alumni_profiles(is_public);

CREATE INDEX IF NOT EXISTS idx_alumni_events_event_date ON public.alumni_events(event_date);
CREATE INDEX IF NOT EXISTS idx_alumni_events_is_published ON public.alumni_events(is_published);
CREATE INDEX IF NOT EXISTS idx_alumni_events_created_by ON public.alumni_events(created_by);

CREATE INDEX IF NOT EXISTS idx_alumni_event_registrations_event_id ON public.alumni_event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_alumni_event_registrations_user_id ON public.alumni_event_registrations(user_id);

CREATE INDEX IF NOT EXISTS idx_alumni_news_is_published ON public.alumni_news(is_published);
CREATE INDEX IF NOT EXISTS idx_alumni_news_publish_date ON public.alumni_news(publish_date);
CREATE INDEX IF NOT EXISTS idx_alumni_news_category ON public.alumni_news(category);

CREATE INDEX IF NOT EXISTS idx_alumni_connections_requester_id ON public.alumni_connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_alumni_connections_receiver_id ON public.alumni_connections(receiver_id);
CREATE INDEX IF NOT EXISTS idx_alumni_connections_status ON public.alumni_connections(status);

CREATE INDEX IF NOT EXISTS idx_alumni_messages_sender_id ON public.alumni_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_alumni_messages_receiver_id ON public.alumni_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_alumni_messages_is_read ON public.alumni_messages(is_read);

CREATE INDEX IF NOT EXISTS idx_alumni_notifications_user_id ON public.alumni_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_alumni_notifications_is_read ON public.alumni_notifications(is_read);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.alumni_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_notifications ENABLE ROW LEVEL SECURITY;

-- Alumni Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.alumni_profiles FOR SELECT
    USING (is_public = true);

CREATE POLICY "Users can insert their own profile"
    ON public.alumni_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON public.alumni_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
    ON public.alumni_profiles FOR DELETE
    USING (auth.uid() = user_id);

-- Alumni Events Policies
CREATE POLICY "Published events are viewable by everyone"
    ON public.alumni_events FOR SELECT
    USING (is_published = true OR auth.uid() = created_by);

CREATE POLICY "Authenticated users can create events"
    ON public.alumni_events FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Event creators can update their events"
    ON public.alumni_events FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Event creators can delete their events"
    ON public.alumni_events FOR DELETE
    USING (auth.uid() = created_by);

-- Event Registrations Policies
CREATE POLICY "Users can view their own registrations"
    ON public.alumni_event_registrations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can register for events"
    ON public.alumni_event_registrations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registrations"
    ON public.alumni_event_registrations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own registrations"
    ON public.alumni_event_registrations FOR DELETE
    USING (auth.uid() = user_id);

-- Alumni News Policies
CREATE POLICY "Published news is viewable by everyone"
    ON public.alumni_news FOR SELECT
    USING (is_published = true OR auth.uid() = created_by);

CREATE POLICY "Authenticated users can create news"
    ON public.alumni_news FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "News creators can update their news"
    ON public.alumni_news FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "News creators can delete their news"
    ON public.alumni_news FOR DELETE
    USING (auth.uid() = created_by);

-- Alumni Connections Policies
CREATE POLICY "Users can view their connections"
    ON public.alumni_connections FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.alumni_profiles WHERE id = requester_id
        ) OR 
        auth.uid() IN (
            SELECT user_id FROM public.alumni_profiles WHERE id = receiver_id
        )
    );

CREATE POLICY "Users can create connection requests"
    ON public.alumni_connections FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.alumni_profiles WHERE id = requester_id
        )
    );

CREATE POLICY "Users can update their connections"
    ON public.alumni_connections FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.alumni_profiles WHERE id = receiver_id
        )
    );

CREATE POLICY "Users can delete their connections"
    ON public.alumni_connections FOR DELETE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.alumni_profiles WHERE id = requester_id
        ) OR 
        auth.uid() IN (
            SELECT user_id FROM public.alumni_profiles WHERE id = receiver_id
        )
    );

-- Alumni Messages Policies
CREATE POLICY "Users can view their messages"
    ON public.alumni_messages FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.alumni_profiles WHERE id = sender_id
        ) OR 
        auth.uid() IN (
            SELECT user_id FROM public.alumni_profiles WHERE id = receiver_id
        )
    );

CREATE POLICY "Users can send messages"
    ON public.alumni_messages FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.alumni_profiles WHERE id = sender_id
        )
    );

-- Alumni Notifications Policies
CREATE POLICY "Users can view their own notifications"
    ON public.alumni_notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
    ON public.alumni_notifications FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
    ON public.alumni_notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
    ON public.alumni_notifications FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_alumni_profiles_updated_at
    BEFORE UPDATE ON public.alumni_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alumni_events_updated_at
    BEFORE UPDATE ON public.alumni_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alumni_news_updated_at
    BEFORE UPDATE ON public.alumni_news
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alumni_connections_updated_at
    BEFORE UPDATE ON public.alumni_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA (Optional - Remove in production)
-- ============================================================================

-- Insert sample alumni profiles
INSERT INTO public.alumni_profiles (full_name, email, graduation_year, department, program, job_title, company, location, bio, is_public)
VALUES 
    ('Dr. Kwame Mensah', 'kwame.mensah@example.com', 2010, 'Computer Science', 'B.Sc. Computer Science', 'CEO', 'Tech Innovations Ltd', 'Accra, Ghana', 'Passionate about technology and innovation', true),
    ('Ama Asante', 'ama.asante@example.com', 2012, 'Architecture', 'B.Arch.', 'Senior Architect', 'Design Studios Inc', 'London, UK', 'Creating sustainable architectural solutions', true),
    ('Kofi Boateng', 'kofi.boateng@example.com', 2015, 'Medicine', 'M.D.', 'Medical Director', 'Toronto General Hospital', 'Toronto, Canada', 'Committed to improving healthcare', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'ALUMNI CENTER SCHEMA CREATED SUCCESSFULLY';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  ✓ alumni_profiles';
    RAISE NOTICE '  ✓ alumni_events';
    RAISE NOTICE '  ✓ alumni_event_registrations';
    RAISE NOTICE '  ✓ alumni_news';
    RAISE NOTICE '  ✓ alumni_connections';
    RAISE NOTICE '  ✓ alumni_messages';
    RAISE NOTICE '  ✓ alumni_notifications';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Indexes and RLS policies applied';
    RAISE NOTICE '=================================================';
END $$;
