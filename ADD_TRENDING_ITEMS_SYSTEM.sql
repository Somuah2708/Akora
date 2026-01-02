-- =============================================
-- TRENDING ITEMS SYSTEM
-- =============================================
-- Unified trending system that can feature content from
-- multiple app sections: Jobs, Events, Education, Donations,
-- Forum, Circles, News, Notices, Shop, Live
-- Supports both admin-curated and auto-trending items

-- =============================================
-- 1. CREATE TRENDING_ITEMS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS trending_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Item type and reference
    item_type TEXT NOT NULL CHECK (item_type IN (
        'job',
        'event', 
        'education',
        'donation',
        'forum',
        'circle',
        'circle_post',
        'news',
        'notice',
        'shop',
        'live',
        'custom'
    )),
    item_id UUID, -- Reference to the actual item (NULL for custom items)
    
    -- Display information (can override or supplement item data)
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    image_url TEXT,
    
    -- Trending source
    source_type TEXT NOT NULL DEFAULT 'curated' CHECK (source_type IN ('curated', 'auto')),
    -- 'curated' = admin manually added
    -- 'auto' = system selected based on metrics
    
    -- For auto-trending: the metric that made it trend
    trending_metric TEXT, -- e.g., 'most_saved', 'most_applied', 'most_comments', 'most_registrations'
    trending_score INTEGER DEFAULT 0, -- Numeric score for ranking auto items
    
    -- Scheduling & visibility
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- Higher = shown first (for curated items)
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ, -- NULL = no end date
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. CREATE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_trending_items_active 
    ON trending_items(is_active);

CREATE INDEX IF NOT EXISTS idx_trending_items_priority 
    ON trending_items(priority DESC);

CREATE INDEX IF NOT EXISTS idx_trending_items_dates 
    ON trending_items(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_trending_items_type 
    ON trending_items(item_type);

CREATE INDEX IF NOT EXISTS idx_trending_items_source 
    ON trending_items(source_type);

CREATE INDEX IF NOT EXISTS idx_trending_items_item_ref 
    ON trending_items(item_type, item_id);

-- =============================================
-- 3. ENABLE RLS
-- =============================================

ALTER TABLE trending_items ENABLE ROW LEVEL SECURITY;

-- Everyone can view active trending items within valid date range
DROP POLICY IF EXISTS "Anyone can view active trending items" ON trending_items;
CREATE POLICY "Anyone can view active trending items"
    ON trending_items FOR SELECT
    USING (
        is_active = true 
        AND start_date <= NOW() 
        AND (end_date IS NULL OR end_date > NOW())
    );

-- Admins can view all trending items (including inactive)
DROP POLICY IF EXISTS "Admins can view all trending items" ON trending_items;
CREATE POLICY "Admins can view all trending items"
    ON trending_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.is_admin = true OR profiles.role = 'admin')
        )
    );

-- Only admins can insert trending items
DROP POLICY IF EXISTS "Admins can insert trending items" ON trending_items;
CREATE POLICY "Admins can insert trending items"
    ON trending_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.is_admin = true OR profiles.role = 'admin')
        )
    );

-- Only admins can update trending items
DROP POLICY IF EXISTS "Admins can update trending items" ON trending_items;
CREATE POLICY "Admins can update trending items"
    ON trending_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.is_admin = true OR profiles.role = 'admin')
        )
    );

-- Only admins can delete trending items
DROP POLICY IF EXISTS "Admins can delete trending items" ON trending_items;
CREATE POLICY "Admins can delete trending items"
    ON trending_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.is_admin = true OR profiles.role = 'admin')
        )
    );

-- =============================================
-- 4. UPDATED_AT TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION update_trending_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trending_items_updated_at ON trending_items;
CREATE TRIGGER trending_items_updated_at
    BEFORE UPDATE ON trending_items
    FOR EACH ROW
    EXECUTE FUNCTION update_trending_items_updated_at();

-- =============================================
-- 5. HELPER FUNCTION: Get Active Trending Items
-- =============================================

CREATE OR REPLACE FUNCTION get_active_trending_items(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    item_type TEXT,
    item_id UUID,
    title TEXT,
    subtitle TEXT,
    description TEXT,
    image_url TEXT,
    source_type TEXT,
    trending_metric TEXT,
    priority INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.item_type,
        t.item_id,
        t.title,
        t.subtitle,
        t.description,
        t.image_url,
        t.source_type,
        t.trending_metric,
        t.priority,
        t.created_at
    FROM trending_items t
    WHERE t.is_active = true
        AND t.start_date <= NOW()
        AND (t.end_date IS NULL OR t.end_date > NOW())
    ORDER BY 
        -- Curated items with higher priority come first
        CASE WHEN t.source_type = 'curated' THEN t.priority ELSE -1 END DESC,
        -- Then by trending score for auto items
        t.trending_score DESC,
        -- Finally by creation date
        t.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_active_trending_items TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_trending_items TO anon;

-- =============================================
-- 6. SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Trending items system created successfully!';
    RAISE NOTICE '   - Table: trending_items';
    RAISE NOTICE '   - RLS policies enabled';
    RAISE NOTICE '   - Function: get_active_trending_items()';
    RAISE NOTICE '';
    RAISE NOTICE 'Supported item types:';
    RAISE NOTICE '   - job, event, education, donation';
    RAISE NOTICE '   - forum, circle, circle_post, news';
    RAISE NOTICE '   - notice, shop, live, custom';
END $$;
