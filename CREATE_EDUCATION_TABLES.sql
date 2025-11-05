-- =====================================================
-- EDUCATION SYSTEM DATABASE TABLES
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Educational Opportunities Table (extended from products_services)
-- This table will store scholarships, universities, grants, etc.
-- Note: We're using the existing products_services table, but adding education-specific fields

ALTER TABLE products_services 
ADD COLUMN IF NOT EXISTS deadline_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS application_url TEXT,
ADD COLUMN IF NOT EXISTS eligibility_criteria TEXT,
ADD COLUMN IF NOT EXISTS required_documents TEXT[],
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS funding_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS duration_months INTEGER,
ADD COLUMN IF NOT EXISTS location TEXT;

-- 2. Applications Table
CREATE TABLE IF NOT EXISTS scholarship_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  opportunity_id UUID REFERENCES products_services(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'waitlisted')) DEFAULT 'draft',
  application_data JSONB, -- Stores form responses
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  documents_uploaded TEXT[], -- URLs to uploaded documents
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, opportunity_id)
);

-- 3. Bookmarks/Saved Opportunities Table
CREATE TABLE IF NOT EXISTS education_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  opportunity_id UUID REFERENCES products_services(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, opportunity_id)
);

-- 4. Deadline Notifications Table
CREATE TABLE IF NOT EXISTS education_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES products_services(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('deadline_reminder', 'application_update', 'new_opportunity', 'status_change')) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Alumni Lecturers & Mentors Table
CREATE TABLE IF NOT EXISTS alumni_mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  title TEXT, -- e.g., "Professor", "Dr.", "Lecturer"
  field_of_expertise TEXT NOT NULL,
  university TEXT,
  years_of_experience INTEGER,
  bio TEXT,
  avatar_url TEXT,
  linkedin_url TEXT,
  available_for_mentorship BOOLEAN DEFAULT TRUE,
  topics TEXT[], -- Areas they can teach/mentor
  contact_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Mentorship Sessions Table
CREATE TABLE IF NOT EXISTS mentorship_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID REFERENCES alumni_mentors(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  meeting_url TEXT,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON scholarship_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_opportunity_id ON scholarship_applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON scholarship_applications(status);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON education_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_opportunity_id ON education_bookmarks(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON education_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON education_notifications(read);
CREATE INDEX IF NOT EXISTS idx_alumni_available ON alumni_mentors(available_for_mentorship);
CREATE INDEX IF NOT EXISTS idx_sessions_mentor ON mentorship_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_student ON mentorship_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_products_deadline ON products_services(deadline_date);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE scholarship_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumni_mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_sessions ENABLE ROW LEVEL SECURITY;

-- Applications Policies
CREATE POLICY "Users can view their own applications"
  ON scholarship_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own applications"
  ON scholarship_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications"
  ON scholarship_applications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own applications"
  ON scholarship_applications FOR DELETE
  USING (auth.uid() = user_id);

-- Bookmarks Policies
CREATE POLICY "Users can view their own bookmarks"
  ON education_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
  ON education_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON education_bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Notifications Policies
CREATE POLICY "Users can view their own notifications"
  ON education_notifications FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "System can create notifications"
  ON education_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON education_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Alumni Mentors Policies
CREATE POLICY "Anyone can view available mentors"
  ON alumni_mentors FOR SELECT
  USING (available_for_mentorship = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their mentor profile"
  ON alumni_mentors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their mentor profile"
  ON alumni_mentors FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their mentor profile"
  ON alumni_mentors FOR DELETE
  USING (auth.uid() = user_id);

-- Mentorship Sessions Policies
CREATE POLICY "Mentors can view their sessions"
  ON mentorship_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM alumni_mentors 
    WHERE id = mentorship_sessions.mentor_id 
    AND user_id = auth.uid()
  ) OR student_id = auth.uid());

CREATE POLICY "Students can create session requests"
  ON mentorship_sessions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Participants can update sessions"
  ON mentorship_sessions FOR UPDATE
  USING (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM alumni_mentors 
    WHERE id = mentorship_sessions.mentor_id 
    AND user_id = auth.uid()
  ));

-- =====================================================
-- TRIGGERS FOR AUTOMATIC NOTIFICATIONS
-- =====================================================

-- Function to create deadline reminders
CREATE OR REPLACE FUNCTION create_deadline_reminder()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification 1 week before deadline
  IF NEW.deadline_date IS NOT NULL AND NEW.deadline_date > NOW() THEN
    INSERT INTO education_notifications (
      opportunity_id,
      type,
      title,
      message,
      created_at
    ) VALUES (
      NEW.id,
      'deadline_reminder',
      'Upcoming Deadline: ' || NEW.title,
      'The deadline for ' || NEW.title || ' is approaching on ' || TO_CHAR(NEW.deadline_date, 'Mon DD, YYYY'),
      NEW.deadline_date - INTERVAL '7 days'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deadline_reminder_trigger
  AFTER INSERT OR UPDATE OF deadline_date ON products_services
  FOR EACH ROW
  EXECUTE FUNCTION create_deadline_reminder();

-- Function to notify application status changes
CREATE OR REPLACE FUNCTION notify_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('accepted', 'rejected', 'waitlisted', 'under_review') THEN
    INSERT INTO education_notifications (
      user_id,
      opportunity_id,
      type,
      title,
      message
    ) VALUES (
      NEW.user_id,
      NEW.opportunity_id,
      'status_change',
      'Application Status Update',
      'Your application status has been updated to: ' || UPPER(REPLACE(NEW.status, '_', ' '))
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER application_status_change_trigger
  AFTER UPDATE OF status ON scholarship_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_application_status_change();

-- =====================================================
-- SAMPLE DATA (Optional - Remove in production)
-- =====================================================

-- You can add sample alumni mentors for testing
-- INSERT INTO alumni_mentors (user_id, full_name, title, field_of_expertise, university, bio, topics, available_for_mentorship)
-- VALUES 
--   (auth.uid(), 'Dr. Jane Smith', 'Professor', 'Computer Science', 'Stanford University', 
--    'Expert in AI and Machine Learning with 15 years of experience.', 
--    ARRAY['AI', 'Machine Learning', 'Data Science'], true);

COMMENT ON TABLE scholarship_applications IS 'Stores student applications to educational opportunities';
COMMENT ON TABLE education_bookmarks IS 'Stores user bookmarks/saved opportunities';
COMMENT ON TABLE education_notifications IS 'Notifications for deadlines and application updates';
COMMENT ON TABLE alumni_mentors IS 'Alumni who offer mentorship and lectures';
COMMENT ON TABLE mentorship_sessions IS 'Scheduled mentorship sessions between students and alumni';
