-- =====================================================
-- DYNAMIC LOCATIONS SYSTEM FOR MARKETPLACE
-- Tonaton/Jiji-Style Location Management
-- =====================================================

-- 1. Create regions table
CREATE TABLE IF NOT EXISTS regions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create cities table (linked to regions)
CREATE TABLE IF NOT EXISTS cities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(region_id, name)
);

-- 3. Add location fields to products_services table
ALTER TABLE products_services 
ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id),
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id),
ADD COLUMN IF NOT EXISTS location_details TEXT;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_regions_slug ON regions(slug);
CREATE INDEX IF NOT EXISTS idx_regions_active ON regions(is_active);
CREATE INDEX IF NOT EXISTS idx_cities_region ON cities(region_id);
CREATE INDEX IF NOT EXISTS idx_cities_slug ON cities(region_id, slug);
CREATE INDEX IF NOT EXISTS idx_cities_active ON cities(is_active);
CREATE INDEX IF NOT EXISTS idx_products_region ON products_services(region_id);
CREATE INDEX IF NOT EXISTS idx_products_city ON products_services(city_id);

-- 5. Create view for location counts
CREATE OR REPLACE VIEW location_item_counts AS
SELECT 
  r.id as region_id,
  r.name as region_name,
  c.id as city_id,
  c.name as city_name,
  COUNT(ps.id) as item_count
FROM regions r
LEFT JOIN cities c ON c.region_id = r.id
LEFT JOIN products_services ps ON ps.region_id = r.id AND (ps.city_id = c.id OR ps.city_id IS NULL)
WHERE r.is_active = true AND (c.is_active = true OR c.is_active IS NULL)
GROUP BY r.id, r.name, c.id, c.name;

-- 6. Insert default Ghana regions
INSERT INTO regions (name, slug) VALUES
  ('All Ghana', 'all-ghana'),
  ('Greater Accra', 'greater-accra'),
  ('Ashanti', 'ashanti'),
  ('Western', 'western'),
  ('Central', 'central'),
  ('Eastern', 'eastern'),
  ('Northern', 'northern'),
  ('Volta', 'volta'),
  ('Upper East', 'upper-east'),
  ('Upper West', 'upper-west'),
  ('Bono', 'bono'),
  ('Bono East', 'bono-east'),
  ('Ahafo', 'ahafo'),
  ('Savannah', 'savannah'),
  ('North East', 'north-east'),
  ('Oti', 'oti'),
  ('Western North', 'western-north')
ON CONFLICT (name) DO NOTHING;

-- 7. Insert default cities for Greater Accra
INSERT INTO cities (region_id, name, slug) 
SELECT r.id, city_name, slug_name
FROM regions r,
(VALUES
  ('Accra Metropolitan', 'accra-metropolitan'),
  ('Tema', 'tema'),
  ('Madina', 'madina'),
  ('Adenta', 'adenta'),
  ('Spintex', 'spintex'),
  ('Dome', 'dome'),
  ('Kasoa', 'kasoa'),
  ('Teshie', 'teshie'),
  ('La', 'la'),
  ('Osu', 'osu'),
  ('East Legon', 'east-legon'),
  ('North Legon', 'north-legon'),
  ('Lapaz', 'lapaz'),
  ('Abossey Okai', 'abossey-okai'),
  ('Dansoman', 'dansoman'),
  ('Kaneshie', 'kaneshie'),
  ('Achimota', 'achimota'),
  ('Haatso', 'haatso'),
  ('Weija', 'weija'),
  ('Gbawe', 'gbawe')
) AS cities(city_name, slug_name)
WHERE r.slug = 'greater-accra'
ON CONFLICT (region_id, name) DO NOTHING;

-- 8. Insert default cities for Ashanti
INSERT INTO cities (region_id, name, slug)
SELECT r.id, city_name, slug_name
FROM regions r,
(VALUES
  ('Kumasi Metropolitan', 'kumasi-metropolitan'),
  ('Obuasi', 'obuasi'),
  ('Ejisu', 'ejisu'),
  ('Konongo', 'konongo'),
  ('Mampong', 'mampong'),
  ('Bekwai', 'bekwai')
) AS cities(city_name, slug_name)
WHERE r.slug = 'ashanti'
ON CONFLICT (region_id, name) DO NOTHING;

-- 9. Insert default cities for Western
INSERT INTO cities (region_id, name, slug)
SELECT r.id, city_name, slug_name
FROM regions r,
(VALUES
  ('Takoradi', 'takoradi'),
  ('Sekondi', 'sekondi'),
  ('Tarkwa', 'tarkwa'),
  ('Axim', 'axim')
) AS cities(city_name, slug_name)
WHERE r.slug = 'western'
ON CONFLICT (region_id, name) DO NOTHING;

-- 10. Insert default cities for Central
INSERT INTO cities (region_id, name, slug)
SELECT r.id, city_name, slug_name
FROM regions r,
(VALUES
  ('Cape Coast', 'cape-coast'),
  ('Winneba', 'winneba'),
  ('Kasoa', 'kasoa-central'),
  ('Swedru', 'swedru')
) AS cities(city_name, slug_name)
WHERE r.slug = 'central'
ON CONFLICT (region_id, name) DO NOTHING;

-- 11. Insert default cities for Eastern
INSERT INTO cities (region_id, name, slug)
SELECT r.id, city_name, slug_name
FROM regions r,
(VALUES
  ('Koforidua', 'koforidua'),
  ('Akropong', 'akropong'),
  ('Nsawam', 'nsawam')
) AS cities(city_name, slug_name)
WHERE r.slug = 'eastern'
ON CONFLICT (region_id, name) DO NOTHING;

-- 12. Insert default cities for Northern
INSERT INTO cities (region_id, name, slug)
SELECT r.id, city_name, slug_name
FROM regions r,
(VALUES
  ('Tamale', 'tamale'),
  ('Yendi', 'yendi')
) AS cities(city_name, slug_name)
WHERE r.slug = 'northern'
ON CONFLICT (region_id, name) DO NOTHING;

-- 13. Insert default cities for Volta
INSERT INTO cities (region_id, name, slug)
SELECT r.id, city_name, slug_name
FROM regions r,
(VALUES
  ('Ho', 'ho'),
  ('Hohoe', 'hohoe')
) AS cities(city_name, slug_name)
WHERE r.slug = 'volta'
ON CONFLICT (region_id, name) DO NOTHING;

-- 14. Enable Row Level Security (RLS)
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- 15. RLS Policies - Everyone can read active locations
CREATE POLICY "Public can view active regions"
  ON regions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public can view active cities"
  ON cities FOR SELECT
  USING (is_active = true);

-- 16. RLS Policies - Authenticated users can suggest new locations
CREATE POLICY "Authenticated users can insert regions"
  ON regions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert cities"
  ON cities FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 17. Function to add new location (region + city)
CREATE OR REPLACE FUNCTION add_new_location(
  p_region_name TEXT,
  p_city_name TEXT,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_region_id UUID;
  v_city_id UUID;
  v_region_slug TEXT;
  v_city_slug TEXT;
BEGIN
  -- Generate slugs
  v_region_slug := lower(regexp_replace(p_region_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_city_slug := lower(regexp_replace(p_city_name, '[^a-zA-Z0-9]+', '-', 'g'));
  
  -- Check if region exists
  SELECT id INTO v_region_id FROM regions WHERE LOWER(name) = LOWER(p_region_name);
  
  -- If region doesn't exist, create it
  IF v_region_id IS NULL THEN
    INSERT INTO regions (name, slug, is_active)
    VALUES (p_region_name, v_region_slug, true)
    RETURNING id INTO v_region_id;
  END IF;
  
  -- Check if city exists in this region
  SELECT id INTO v_city_id FROM cities 
  WHERE region_id = v_region_id AND LOWER(name) = LOWER(p_city_name);
  
  -- If city doesn't exist, create it
  IF v_city_id IS NULL THEN
    INSERT INTO cities (region_id, name, slug, is_active)
    VALUES (v_region_id, p_city_name, v_city_slug, true)
    RETURNING id INTO v_city_id;
  END IF;
  
  -- Return the IDs
  RETURN json_build_object(
    'region_id', v_region_id,
    'city_id', v_city_id,
    'region_name', p_region_name,
    'city_name', p_city_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. Grant execute permission on function
GRANT EXECUTE ON FUNCTION add_new_location(TEXT, TEXT, UUID) TO authenticated;

-- 19. Create function to get location statistics
CREATE OR REPLACE FUNCTION get_location_stats()
RETURNS TABLE (
  region_id UUID,
  region_name TEXT,
  city_id UUID,
  city_name TEXT,
  item_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    c.id,
    c.name,
    COUNT(ps.id)
  FROM regions r
  LEFT JOIN cities c ON c.region_id = r.id AND c.is_active = true
  LEFT JOIN products_services ps ON ps.region_id = r.id AND (ps.city_id = c.id OR c.id IS NULL)
  WHERE r.is_active = true
  GROUP BY r.id, r.name, c.id, c.name
  ORDER BY r.name, c.name;
END;
$$ LANGUAGE plpgsql;

-- 20. Grant permissions
GRANT EXECUTE ON FUNCTION get_location_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_location_stats() TO anon;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check regions
-- SELECT * FROM regions ORDER BY name;

-- Check cities
-- SELECT r.name as region, c.name as city 
-- FROM cities c 
-- JOIN regions r ON r.id = c.region_id 
-- ORDER BY r.name, c.name;

-- Check location counts
-- SELECT * FROM location_item_counts ORDER BY region_name, city_name;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
