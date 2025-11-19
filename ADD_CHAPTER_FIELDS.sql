-- Add additional fields to circles table for chapter management
-- These fields allow comprehensive chapter information editing

-- Add location field for chapter address
ALTER TABLE circles ADD COLUMN IF NOT EXISTS location TEXT;

-- Add address field for office location
ALTER TABLE circles ADD COLUMN IF NOT EXISTS address TEXT;

-- Add leadership field as JSONB to store leadership team information
-- Structure: { president: string, vicePresident: string, secretary: string, treasurer: string, customLeaders: [{ role: string, name: string, icon: string }] }
ALTER TABLE circles ADD COLUMN IF NOT EXISTS leadership JSONB DEFAULT '{}'::jsonb;

-- Add contact field as JSONB to store contact information
-- Structure: { email: string, phone: string }
ALTER TABLE circles ADD COLUMN IF NOT EXISTS contact JSONB DEFAULT '{}'::jsonb;

-- Add gallery field as JSONB array to store photo URLs
ALTER TABLE circles ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]'::jsonb;

-- Add events field as JSONB array to store upcoming events
-- Structure: [{ title: string, date: string, time: string, attendees: number }]
ALTER TABLE circles ADD COLUMN IF NOT EXISTS events JSONB DEFAULT '[]'::jsonb;

-- Add projects field as JSONB array to store active projects
-- Structure: [{ name: string, description: string, progress: number }]
ALTER TABLE circles ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]'::jsonb;

-- Add achievements field as JSONB array to store achievements
-- Structure: [{ title: string, icon: string, date: string }]
ALTER TABLE circles ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]'::jsonb;

-- Add stats field as JSONB to store chapter statistics
-- Structure: { members: number, events_count: number, projects_count: number }
ALTER TABLE circles ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{}'::jsonb;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_circles_location ON circles(location);
CREATE INDEX IF NOT EXISTS idx_circles_leadership ON circles USING gin(leadership);
CREATE INDEX IF NOT EXISTS idx_circles_contact ON circles USING gin(contact);
CREATE INDEX IF NOT EXISTS idx_circles_gallery ON circles USING gin(gallery);
CREATE INDEX IF NOT EXISTS idx_circles_events ON circles USING gin(events);
CREATE INDEX IF NOT EXISTS idx_circles_projects ON circles USING gin(projects);
CREATE INDEX IF NOT EXISTS idx_circles_achievements ON circles USING gin(achievements);
CREATE INDEX IF NOT EXISTS idx_circles_stats ON circles USING gin(stats);

-- Update RLS policies to allow updates by circle admins/creators
CREATE POLICY IF NOT EXISTS "Circle creators can update their circles" 
  ON circles FOR UPDATE 
  TO authenticated 
  USING (created_by = auth.uid());

-- Comment for documentation
COMMENT ON COLUMN circles.leadership IS 'JSONB field storing leadership team: president, vicePresident, secretary, treasurer, customLeaders (array of {role, name, icon})';
COMMENT ON COLUMN circles.contact IS 'JSONB field storing contact info: email, phone, website, address';
COMMENT ON COLUMN circles.gallery IS 'JSONB array storing photo URLs';
COMMENT ON COLUMN circles.events IS 'JSONB array storing upcoming events with title, date, time, attendees';
COMMENT ON COLUMN circles.projects IS 'JSONB array storing active projects with name, description, progress';
COMMENT ON COLUMN circles.achievements IS 'JSONB array storing achievements with title, icon, date';
COMMENT ON COLUMN circles.stats IS 'JSONB field storing chapter stats: members, events_count, projects_count';
