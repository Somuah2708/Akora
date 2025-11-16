-- ====================================================================================
-- WEEK 3: BUSINESS FEATURES (GROWTH-READY)
-- Payment verification, package expiry, search, analytics, calendar export
-- ====================================================================================

-- 1. Add package expiry tracking to akora_events
ALTER TABLE public.akora_events
  ADD COLUMN IF NOT EXISTS package_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create indexes for search performance
CREATE INDEX IF NOT EXISTS idx_akora_events_category ON public.akora_events(category);
CREATE INDEX IF NOT EXISTS idx_akora_events_tags ON public.akora_events USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_akora_events_start_time_search ON public.akora_events(start_time);
CREATE INDEX IF NOT EXISTS idx_akora_events_package_expires ON public.akora_events(package_expires_at) WHERE package_tier != 'free';

-- ====================================================================================
-- 2. Create payment_verifications table for admin workflow
-- ====================================================================================

CREATE TABLE IF NOT EXISTS public.payment_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_tier TEXT NOT NULL CHECK (package_tier IN ('free', 'bronze', 'silver', 'gold', 'premium')),
  payment_proof_url TEXT,
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'GHS',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payment verifications
CREATE INDEX IF NOT EXISTS idx_payment_verifications_user ON public.payment_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_verifications_status ON public.payment_verifications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_verifications_verified_by ON public.payment_verifications(verified_by);

-- RLS Policies for payment_verifications
ALTER TABLE public.payment_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_select_own ON public.payment_verifications;
DROP POLICY IF EXISTS payment_insert_own ON public.payment_verifications;
DROP POLICY IF EXISTS payment_update_admin ON public.payment_verifications;

-- Users can view their own payment verifications
CREATE POLICY payment_select_own ON public.payment_verifications
FOR SELECT USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
));

-- Users can submit payment verifications
CREATE POLICY payment_insert_own ON public.payment_verifications
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Only admins can update payment verifications
CREATE POLICY payment_update_admin ON public.payment_verifications
FOR UPDATE USING (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
));

-- ====================================================================================
-- 3. Create package_history table to track tier changes
-- ====================================================================================

CREATE TABLE IF NOT EXISTS public.package_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_tier TEXT,
  new_tier TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('payment', 'expiry', 'admin', 'initial')),
  payment_verification_id UUID REFERENCES public.payment_verifications(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for package history
CREATE INDEX IF NOT EXISTS idx_package_history_user ON public.package_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_package_history_expires ON public.package_history(expires_at) WHERE expires_at IS NOT NULL;

-- RLS for package_history
ALTER TABLE public.package_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS history_select_own ON public.package_history;

-- Users can view their own package history, admins see all
CREATE POLICY history_select_own ON public.package_history
FOR SELECT USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
));

-- ====================================================================================
-- 4. Create event_categories lookup table
-- ====================================================================================

CREATE TABLE IF NOT EXISTS public.event_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for categories (public read)
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categories_select_all ON public.event_categories;

CREATE POLICY categories_select_all ON public.event_categories
FOR SELECT USING (is_active = true OR EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
));

-- Insert default categories
INSERT INTO public.event_categories (name, description, icon, sort_order) VALUES
  ('Conference', 'Professional conferences and summits', '🎤', 1),
  ('Workshop', 'Hands-on learning and training', '🛠️', 2),
  ('Networking', 'Professional networking events', '🤝', 3),
  ('Social', 'Social gatherings and parties', '🎉', 4),
  ('Sports', 'Sports and fitness activities', '⚽', 5),
  ('Arts & Culture', 'Arts, music, and cultural events', '🎨', 6),
  ('Education', 'Educational seminars and lectures', '📚', 7),
  ('Charity', 'Fundraising and charity events', '❤️', 8),
  ('Business', 'Business meetings and trade shows', '💼', 9),
  ('Other', 'Miscellaneous events', '📌', 10)
ON CONFLICT (name) DO NOTHING;

-- ====================================================================================
-- 5. Function to update package tier and track history
-- ====================================================================================

CREATE OR REPLACE FUNCTION public.update_user_package_tier(
  p_user_id UUID,
  p_new_tier TEXT,
  p_reason TEXT,
  p_payment_verification_id UUID DEFAULT NULL,
  p_changed_by UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_old_tier TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get current tier
  SELECT package_tier INTO v_old_tier
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Calculate expiry date (30 days for premium tiers)
  IF p_new_tier IN ('bronze', 'silver', 'gold', 'premium') THEN
    v_expires_at := NOW() + INTERVAL '30 days';
  ELSE
    v_expires_at := NULL;
  END IF;
  
  -- Update user's package tier
  UPDATE public.profiles
  SET 
    package_tier = p_new_tier,
    package_expires_at = v_expires_at,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Record in package history
  INSERT INTO public.package_history (
    user_id,
    old_tier,
    new_tier,
    reason,
    payment_verification_id,
    expires_at,
    changed_by
  ) VALUES (
    p_user_id,
    v_old_tier,
    p_new_tier,
    p_reason,
    p_payment_verification_id,
    v_expires_at,
    COALESCE(p_changed_by, auth.uid())
  );
  
  -- Send notification to user
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    notification_type,
    title,
    content
  ) VALUES (
    p_user_id,
    p_changed_by,
    'package_updated',
    '📦 Package Updated',
    'Your package has been updated to ' || UPPER(p_new_tier) || 
    CASE 
      WHEN v_expires_at IS NOT NULL THEN '. Valid until ' || TO_CHAR(v_expires_at, 'DD Mon YYYY') || '.'
      ELSE '.'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_user_package_tier(UUID, TEXT, TEXT, UUID, UUID) TO authenticated;

-- ====================================================================================
-- 6. Function to check and expire packages (run daily via cron)
-- ====================================================================================

CREATE OR REPLACE FUNCTION public.expire_packages()
RETURNS TABLE(expired_user_id UUID, old_tier TEXT) AS $$
BEGIN
  RETURN QUERY
  WITH expired_users AS (
    UPDATE public.profiles
    SET 
      package_tier = 'free',
      package_expires_at = NULL,
      updated_at = NOW()
    WHERE 
      package_expires_at IS NOT NULL 
      AND package_expires_at < NOW()
      AND package_tier != 'free'
    RETURNING id, package_tier AS old_package_tier
  )
  INSERT INTO public.package_history (
    user_id,
    old_tier,
    new_tier,
    reason,
    expires_at
  )
  SELECT 
    id,
    old_package_tier,
    'free',
    'expiry',
    NULL
  FROM expired_users
  RETURNING user_id, old_tier;
  
  -- Send notifications to expired users
  INSERT INTO public.notifications (
    recipient_id,
    notification_type,
    title,
    content
  )
  SELECT 
    user_id,
    'package_expired',
    '⏰ Package Expired',
    'Your ' || UPPER(old_tier) || ' package has expired. Upgrade to continue enjoying premium features!'
  FROM expired_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role for cron jobs
GRANT EXECUTE ON FUNCTION public.expire_packages() TO authenticated;

-- ====================================================================================
-- 7. Function to approve payment verification
-- ====================================================================================

CREATE OR REPLACE FUNCTION public.approve_payment_verification(
  p_verification_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_package_tier TEXT;
BEGIN
  -- Get verification details
  SELECT user_id, package_tier INTO v_user_id, v_package_tier
  FROM public.payment_verifications
  WHERE id = p_verification_id;
  
  -- Update verification status
  UPDATE public.payment_verifications
  SET 
    status = 'approved',
    verified_by = auth.uid(),
    verified_at = NOW(),
    admin_notes = p_admin_notes,
    updated_at = NOW()
  WHERE id = p_verification_id;
  
  -- Update user's package tier
  PERFORM public.update_user_package_tier(
    v_user_id,
    v_package_tier,
    'payment',
    p_verification_id,
    auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.approve_payment_verification(UUID, TEXT) TO authenticated;

-- ====================================================================================
-- 8. Function to reject payment verification
-- ====================================================================================

CREATE OR REPLACE FUNCTION public.reject_payment_verification(
  p_verification_id UUID,
  p_admin_notes TEXT
)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user_id
  SELECT user_id INTO v_user_id
  FROM public.payment_verifications
  WHERE id = p_verification_id;
  
  -- Update verification status
  UPDATE public.payment_verifications
  SET 
    status = 'rejected',
    verified_by = auth.uid(),
    verified_at = NOW(),
    admin_notes = p_admin_notes,
    updated_at = NOW()
  WHERE id = p_verification_id;
  
  -- Send notification to user
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    notification_type,
    title,
    content
  ) VALUES (
    v_user_id,
    auth.uid(),
    'payment_rejected',
    '❌ Payment Rejected',
    'Your payment verification was rejected. Reason: ' || p_admin_notes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reject_payment_verification(UUID, TEXT) TO authenticated;

-- ====================================================================================
-- 9. Function to search events with filters
-- ====================================================================================

CREATE OR REPLACE FUNCTION public.search_events(
  p_query TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_start_time TIMESTAMPTZ DEFAULT NULL,
  p_end_time TIMESTAMPTZ DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  tags TEXT[],
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  location TEXT,
  capacity INTEGER,
  package_tier TEXT,
  view_count INTEGER,
  rsvp_count INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.description,
    e.category,
    e.tags,
    e.start_time,
    e.end_time,
    e.location,
    e.capacity,
    e.package_tier,
    e.view_count,
    e.rsvp_count,
    e.created_at
  FROM public.akora_events e
  WHERE 
    e.status = 'published'
    AND (p_query IS NULL OR 
         e.title ILIKE '%' || p_query || '%' OR 
         e.description ILIKE '%' || p_query || '%')
    AND (p_category IS NULL OR e.category = p_category)
    AND (p_start_time IS NULL OR e.start_time >= p_start_time)
    AND (p_end_time IS NULL OR e.start_time <= p_end_time)
    AND (p_tags IS NULL OR e.tags && p_tags)
  ORDER BY e.start_time ASC, e.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.search_events(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT[], INTEGER, INTEGER) TO authenticated;

-- ====================================================================================
-- 10. Function to get organizer analytics
-- ====================================================================================

CREATE OR REPLACE FUNCTION public.get_organizer_analytics(p_user_id UUID)
RETURNS TABLE(
  total_events INTEGER,
  total_views INTEGER,
  total_rsvps INTEGER,
  avg_views_per_event NUMERIC,
  avg_rsvps_per_event NUMERIC,
  top_event_title TEXT,
  top_event_views INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH user_events AS (
    SELECT 
      COUNT(*)::INTEGER AS event_count,
      SUM(view_count)::INTEGER AS total_view_count,
      SUM(rsvp_count)::INTEGER AS total_rsvp_count,
      AVG(view_count) AS avg_view,
      AVG(rsvp_count) AS avg_rsvp
    FROM public.akora_events
    WHERE created_by = p_user_id AND status = 'published'
  ),
  top_event AS (
    SELECT title, view_count
    FROM public.akora_events
    WHERE created_by = p_user_id AND status = 'published'
    ORDER BY view_count DESC
    LIMIT 1
  )
  SELECT 
    COALESCE(ue.event_count, 0),
    COALESCE(ue.total_view_count, 0),
    COALESCE(ue.total_rsvp_count, 0),
    COALESCE(ROUND(ue.avg_view, 2), 0),
    COALESCE(ROUND(ue.avg_rsvp, 2), 0),
    te.title,
    te.view_count
  FROM user_events ue
  LEFT JOIN top_event te ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_organizer_analytics(UUID) TO authenticated;

-- ====================================================================================
-- SETUP COMPLETE! ✅
-- ====================================================================================

DO $$ 
BEGIN 
  RAISE NOTICE 'Week 3 setup completed successfully!';
  RAISE NOTICE 'Tables created: payment_verifications, package_history, event_categories';
  RAISE NOTICE 'Functions created: update_user_package_tier, expire_packages, approve/reject_payment';
  RAISE NOTICE 'Functions created: search_events, get_organizer_analytics';
  RAISE NOTICE 'Added columns: package_expires_at, category, tags to akora_events';
  RAISE NOTICE 'Inserted 10 default event categories';
END $$;
