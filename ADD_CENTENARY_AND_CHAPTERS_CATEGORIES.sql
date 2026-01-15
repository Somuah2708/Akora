-- ============================================================
-- ADD CENTENARY AND CHAPTERS CATEGORIES TO CIRCLES
-- ============================================================
-- This migration adds 'Centenary' and 'Chapters' as new circle categories
-- and pre-populates them with official circles
-- ============================================================

-- ============================================================
-- PART 1: UPDATE CATEGORY CHECK CONSTRAINT
-- ============================================================

-- Drop the existing check constraint
ALTER TABLE circles DROP CONSTRAINT IF EXISTS circles_category_check;

-- Add new check constraint with Centenary and Chapters
ALTER TABLE circles ADD CONSTRAINT circles_category_check 
  CHECK (category IN ('Fun Clubs', 'Year Groups', 'Class Pages', 'House Groups', 'Study Groups', 'Sports', 'Arts', 'Centenary', 'Chapters'));

-- ============================================================
-- PART 2: INSERT CENTENARY COMMITTEE CIRCLES
-- ============================================================

-- Get the first admin user to use as creator (fallback to first user if no admin)
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Try to get an admin user first
  SELECT id INTO admin_user_id FROM profiles WHERE is_admin = true LIMIT 1;
  
  -- If no admin found, get the first user
  IF admin_user_id IS NULL THEN
    SELECT id INTO admin_user_id FROM profiles LIMIT 1;
  END IF;
  
  -- Only proceed if we have a user
  IF admin_user_id IS NOT NULL THEN
    
    -- Insert Centenary Committees (only if they don't already exist)
    INSERT INTO circles (name, description, category, is_private, is_official, is_featured, created_by)
    SELECT * FROM (VALUES
      ('Memorabilia Committee', 'Dedicated to preserving and celebrating Achimota''s rich history and heritage. We digitize historical archives, create centenary exhibitions, and produce commemorative items that honor 100 years of excellence.', 'Centenary', false, true, true, admin_user_id),
      ('Publicity Committee', 'Responsible for spreading the word about Achimota''s centenary celebration globally. We manage media coverage, social media campaigns, press releases, and ensure worldwide recognition of this milestone.', 'Centenary', false, true, false, admin_user_id),
      ('Health Walks Committee', 'Promoting wellness and community bonding through organized health walks, campus heritage tours, and fitness challenges. Join us for weekly wellness activities leading up to the centenary.', 'Centenary', false, true, false, admin_user_id),
      ('Historical Documentation Committee', 'Preserving memories for future generations through meticulous archive preservation, video documentation, and historical record keeping of all centenary events and Achimota''s legacy.', 'Centenary', false, true, false, admin_user_id),
      ('Achimota Subjugates Committee', 'Celebrating Achimota''s sporting excellence through organized tournaments, friendly competitions, and showcasing the athletic talent that has defined our institution for a century.', 'Centenary', false, true, false, admin_user_id),
      ('Sports Committee', 'Organizing inter-school competitions, sports galas, and athlete recognition events. We honor the athletic traditions that have been part of Achimota''s identity for 100 years.', 'Centenary', false, true, false, admin_user_id),
      ('Homecoming Committee', 'Strengthening alumni bonds and celebrating unity through reunion events, networking sessions, and mentorship programs that bring generations of Achimotan together.', 'Centenary', false, true, false, admin_user_id),
      ('Finance Committee', 'Ensuring sustainable funding for all centenary events through strategic fundraising campaigns, budget management, and sponsor relations. We make the celebration possible.', 'Centenary', false, true, false, admin_user_id),
      ('Gambaga to Accra Committee', 'Reconnecting with Achimota''s roots through heritage tours and historical journey documentation. We celebrate the founding story and community engagement that shaped our school.', 'Centenary', false, true, false, admin_user_id),
      ('Achimota Speaks Committee', 'Inspiring through knowledge and discourse by hosting notable speakers, panel discussions, and educational seminars that reflect the intellectual tradition of Achimota.', 'Centenary', false, true, false, admin_user_id),
      ('Year Group Celebrations Committee', 'Honoring each generation''s contribution through year group events, reunion celebrations, and commemorative activities that celebrate every class in Achimota''s history.', 'Centenary', false, true, false, admin_user_id),
      ('Opera and Drama Committee', 'Showcasing artistic talent and creativity through theatrical productions, drama workshops, and cultural performances that celebrate Achimota''s rich arts heritage.', 'Centenary', false, true, false, admin_user_id),
      ('Centenary Planning Committee', 'The central coordination body orchestrating all centenary activities. We manage timelines, coordinate between committees, and ensure quality execution of every event.', 'Centenary', false, true, true, admin_user_id),
      ('Health Walks II Committee', 'Extended wellness initiative supporting additional health walks and fitness programs across different regions and alumni groups for the centenary celebration.', 'Centenary', false, true, false, admin_user_id)
    ) AS v(name, description, category, is_private, is_official, is_featured, created_by)
    WHERE NOT EXISTS (
      SELECT 1 FROM circles WHERE circles.name = v.name AND circles.category = 'Centenary'
    );

    -- ============================================================
    -- PART 3: INSERT CHAPTER CIRCLES
    -- ============================================================
    
    -- Insert Chapter Circles (only if they don't already exist)
    INSERT INTO circles (name, description, category, is_private, is_official, is_featured, created_by)
    SELECT * FROM (VALUES
      -- Ghana Regional Chapters
      ('Greater Accra Chapter', 'The flagship chapter for Achimota alumni in the Greater Accra Region. Connect with fellow Achimotans in Accra for networking events, community service, and social gatherings.', 'Chapters', false, true, true, admin_user_id),
      ('Ashanti Region Chapter', 'Bringing together Achimota alumni in Kumasi and the Ashanti Region. Join us for regional events, mentorship programs, and celebrating our shared heritage in the Garden City.', 'Chapters', false, true, false, admin_user_id),
      ('Northern Ghana Chapter', 'Uniting Achimota alumni across the Northern, North East, Savannah, and Upper regions. We organize community outreach, networking events, and support local educational initiatives.', 'Chapters', false, true, false, admin_user_id),
      ('Western Region Chapter', 'Connecting Achimotans in Takoradi, Sekondi, and the Western Region. Join us for professional networking, social events, and contributing to our local communities.', 'Chapters', false, true, false, admin_user_id),
      
      -- International Chapters
      ('United Kingdom Chapter', 'The official chapter for Achimota alumni in the United Kingdom. From London to Edinburgh, we bring together Achimotans for networking, cultural events, and supporting students abroad.', 'Chapters', false, true, true, admin_user_id),
      ('United States Chapter', 'Connecting Achimota alumni across America. From the East Coast to the West Coast, we organize regional meetups, professional networking, and support the Achimota community stateside.', 'Chapters', false, true, true, admin_user_id),
      ('Canada Chapter', 'The home for Achimota alumni in Canada. From Toronto to Vancouver, we maintain our bonds through social events, professional networking, and supporting incoming Ghanaian students.', 'Chapters', false, true, false, admin_user_id),
      ('Germany Chapter', 'Uniting Achimotans across Germany and Central Europe. We organize gatherings in major cities, support alumni transitions, and celebrate our Ghanaian heritage in Europe.', 'Chapters', false, true, false, admin_user_id)
    ) AS v(name, description, category, is_private, is_official, is_featured, created_by)
    WHERE NOT EXISTS (
      SELECT 1 FROM circles WHERE circles.name = v.name AND circles.category = 'Chapters'
    );

    RAISE NOTICE 'Successfully inserted Centenary and Chapter circles with admin user: %', admin_user_id;
  ELSE
    RAISE NOTICE 'No users found in profiles table. Circles not inserted.';
  END IF;
END $$;

-- ============================================================
-- PART 4: ADD CIRCLE MEMBERS FOR CREATORS
-- ============================================================

-- Add the creator as admin member of each new circle they created
INSERT INTO circle_members (circle_id, user_id, role)
SELECT c.id, c.created_by, 'admin'
FROM circles c
WHERE c.category IN ('Centenary', 'Chapters')
  AND c.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM circle_members cm 
    WHERE cm.circle_id = c.id AND cm.user_id = c.created_by
  );

-- ============================================================
-- VERIFICATION QUERIES (for manual check)
-- ============================================================

-- Check Centenary committees
-- SELECT name, description, is_official, is_featured FROM circles WHERE category = 'Centenary' ORDER BY name;

-- Check Chapters
-- SELECT name, description, is_official, is_featured FROM circles WHERE category = 'Chapters' ORDER BY name;

-- Verify constraint
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'circles_category_check';
