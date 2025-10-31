-- Disable RLS for service_bookmarks to work with mock auth system
-- This allows testing without proper JWT auth context

ALTER TABLE public.service_bookmarks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products_services DISABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON TABLE public.service_bookmarks IS 'RLS disabled for testing with mock auth system';
COMMENT ON TABLE public.service_reviews IS 'RLS disabled for testing with mock auth system';
COMMENT ON TABLE public.products_services IS 'RLS disabled for testing with mock auth system';
