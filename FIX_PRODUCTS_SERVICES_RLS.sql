-- =============================================
-- FIX PRODUCTS/SERVICES RLS POLICY
-- =============================================
-- Updates the SELECT policy to allow users to view their own listings
-- regardless of approval status (for editing pending/rejected jobs)

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view approved products and services" ON products_services;
DROP POLICY IF EXISTS "Users can view their own or approved products" ON products_services;

-- Create updated policy that allows:
-- 1. All users to view approved products/services
-- 2. Users to view their own products/services (regardless of approval status)
-- 3. Admins to view all products/services
CREATE POLICY "Users can view their own or approved products"
  ON products_services
  FOR SELECT
  TO authenticated
  USING (
    is_approved = true 
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Products/Services RLS policy updated successfully!';
    RAISE NOTICE 'Users can now view their own pending/rejected listings.';
END $$;
