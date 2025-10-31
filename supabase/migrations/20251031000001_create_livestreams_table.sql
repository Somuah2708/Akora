-- Create livestreams table
CREATE TABLE IF NOT EXISTS public.livestreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  thumbnail_url TEXT,
  stream_url TEXT NOT NULL,
  host_name TEXT,
  host_avatar_url TEXT,
  category TEXT,
  is_live BOOLEAN DEFAULT false,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  viewer_count INTEGER DEFAULT 0,
  replay_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_livestreams_is_live ON public.livestreams(is_live);
CREATE INDEX idx_livestreams_start_time ON public.livestreams(start_time DESC);
CREATE INDEX idx_livestreams_category ON public.livestreams(category);

-- Enable RLS
ALTER TABLE public.livestreams ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view livestreams"
  ON public.livestreams
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create livestreams"
  ON public.livestreams
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update livestreams"
  ON public.livestreams
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_livestreams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_livestreams_updated_at
  BEFORE UPDATE ON public.livestreams
  FOR EACH ROW
  EXECUTE FUNCTION update_livestreams_updated_at();

-- Insert sample livestreams
INSERT INTO public.livestreams (title, description, short_description, thumbnail_url, stream_url, host_name, host_avatar_url, category, is_live, start_time, viewer_count)
VALUES 
  ('Welcome Week 2025 Opening Ceremony', 'Join us for the grand opening of Welcome Week 2025! Meet fellow students, learn about campus resources, and kick off an amazing year together.', 'Grand opening ceremony for new academic year', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800', 'https://meet.google.com/abc-defg-hij', 'Dean Sarah Johnson', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', 'Event', true, NOW() - INTERVAL '30 minutes', 2847),
  
  ('Campus Tour: Facilities & Amenities', 'Explore our state-of-the-art campus facilities including labs, libraries, sports centers, and student lounges. Get insider tips from current students!', 'Virtual tour of campus facilities', 'https://images.unsplash.com/photo-1562774053-701939374585?w=800', 'https://meet.google.com/xyz-abcd-efg', 'Student Guide: Michael Chen', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', 'Tour', true, NOW() - INTERVAL '15 minutes', 1523),
  
  ('Q&A with Student Leaders', 'Meet your student government representatives and ask anything about campus life, student organizations, events, and how to get involved.', 'Interactive session with student representatives', 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800', 'https://meet.google.com/qrs-tuv-wxy', 'Student Council', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', 'Q&A', false, NOW() + INTERVAL '2 hours', 0),
  
  ('Academic Advising Workshop', 'Learn how to plan your course schedule, choose majors and minors, and make the most of your academic journey. Academic advisors will answer your questions.', 'Course planning and academic guidance', 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800', 'https://meet.google.com/lmn-opq-rst', 'Academic Affairs Office', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400', 'Academic', false, NOW() + INTERVAL '4 hours', 0),
  
  ('Student Organizations Fair', 'Discover over 100+ student clubs and organizations! From sports to arts, tech to community service - find your community and make lasting friendships.', 'Explore clubs and student organizations', 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=800', 'https://meet.google.com/uvw-xyz-abc', 'Student Activities', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400', 'Social', false, NOW() + INTERVAL '1 day', 0),
  
  ('Career Services Introduction', 'Get started with career planning! Learn about internship opportunities, resume workshops, career fairs, and alumni networking events.', 'Career planning and opportunities', 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800', 'https://meet.google.com/def-ghi-jkl', 'Career Center', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 'Career', false, NOW() + INTERVAL '2 days', 0),
  
  ('Welcome Week Party - Evening Social', 'End the week with an amazing social event! Music, games, prizes, and a chance to make new friends in a fun, relaxed atmosphere.', 'Evening social event with entertainment', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800', 'https://meet.google.com/mno-pqr-stu', 'Events Committee', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', 'Social', false, NOW() + INTERVAL '3 days', 0);

-- Insert a past stream with replay
INSERT INTO public.livestreams (title, description, short_description, thumbnail_url, stream_url, host_name, host_avatar_url, category, is_live, start_time, end_time, replay_url, viewer_count)
VALUES 
  ('New Student Orientation 2025', 'Complete orientation for new students covering everything you need to know about campus life, academic expectations, and student resources.', 'Comprehensive new student orientation', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', 'https://meet.google.com/past-stream-1', 'Welcome Committee', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', 'Orientation', false, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day 22 hours', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 3241);

