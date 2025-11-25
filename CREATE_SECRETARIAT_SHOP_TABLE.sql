-- =====================================================
-- SECRETARIAT SHOP PRODUCTS TABLE
-- Professional admin-only merchandise shop for OAA
-- =====================================================

-- Create the secretariat_shop_products table
CREATE TABLE IF NOT EXISTS secretariat_shop_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Product Information
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Clothing', 'Accessories', 'Homeware', 'Stationery', 'Books', 'Electronics', 'Sports', 'Other')),
  
  -- Pricing (stored in both currencies for convenience)
  price_usd DECIMAL(10, 2) NOT NULL,
  price_ghs DECIMAL(10, 2) NOT NULL,
  
  -- Product Details
  sizes TEXT[] DEFAULT '{}', -- Array of available sizes ['S', 'M', 'L', 'XL']
  colors TEXT[] DEFAULT '{}', -- Array of available colors ['Black', 'White', 'Blue']
  condition TEXT DEFAULT 'New' CHECK (condition IN ('New', 'Like New', 'Good', 'Fair')),
  
  -- Inventory
  quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),
  in_stock BOOLEAN DEFAULT true,
  
  -- Media
  images TEXT[] DEFAULT '{}', -- Array of image URLs
  
  -- Contact & Metadata
  contact_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
  ) STORED
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_secretariat_shop_products_user_id ON secretariat_shop_products(user_id);
CREATE INDEX IF NOT EXISTS idx_secretariat_shop_products_category ON secretariat_shop_products(category);
CREATE INDEX IF NOT EXISTS idx_secretariat_shop_products_in_stock ON secretariat_shop_products(in_stock);
CREATE INDEX IF NOT EXISTS idx_secretariat_shop_products_created_at ON secretariat_shop_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_secretariat_shop_products_search ON secretariat_shop_products USING GIN(search_vector);

-- Enable Row Level Security
ALTER TABLE secretariat_shop_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- 1. Everyone can view products that are in stock
CREATE POLICY "Anyone can view in-stock products"
ON secretariat_shop_products
FOR SELECT
USING (in_stock = true OR auth.uid() = user_id);

-- 2. Only admins can insert products
CREATE POLICY "Only admins can insert products"
ON secretariat_shop_products
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- 3. Only admins can update products
CREATE POLICY "Only admins can update products"
ON secretariat_shop_products
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- 4. Only admins can delete products
CREATE POLICY "Only admins can delete products"
ON secretariat_shop_products
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_secretariat_shop_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_secretariat_shop_products_timestamp
BEFORE UPDATE ON secretariat_shop_products
FOR EACH ROW
EXECUTE FUNCTION update_secretariat_shop_products_updated_at();

-- Grant permissions
GRANT SELECT ON secretariat_shop_products TO authenticated;
GRANT INSERT, UPDATE, DELETE ON secretariat_shop_products TO authenticated;

-- Comments for documentation
COMMENT ON TABLE secretariat_shop_products IS 'OAA Secretariat Shop products - admin-only merchandise management';
COMMENT ON COLUMN secretariat_shop_products.price_usd IS 'Price in USD (primary currency)';
COMMENT ON COLUMN secretariat_shop_products.price_ghs IS 'Price in GHS (1 USD = 10.99 GHS)';
COMMENT ON COLUMN secretariat_shop_products.in_stock IS 'Whether product is currently available for purchase';
COMMENT ON COLUMN secretariat_shop_products.quantity IS 'Current stock quantity (0 = out of stock)';

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- Insert a new product (admin only)
-- INSERT INTO secretariat_shop_products (
--   user_id, name, description, category, price_usd, price_ghs,
--   sizes, colors, images, quantity
-- ) VALUES (
--   auth.uid(),
--   'OAA Alumni Polo Shirt',
--   'Premium cotton polo with embroidered school crest',
--   'Clothing',
--   35.99,
--   395.63,
--   ARRAY['S', 'M', 'L', 'XL', 'XXL'],
--   ARRAY['Navy', 'White', 'Maroon'],
--   ARRAY['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
--   50
-- );

-- Get all in-stock products
-- SELECT * FROM secretariat_shop_products WHERE in_stock = true ORDER BY created_at DESC;

-- Search products
-- SELECT * FROM secretariat_shop_products 
-- WHERE search_vector @@ to_tsquery('english', 'polo | shirt')
-- AND in_stock = true;

-- Update stock quantity
-- UPDATE secretariat_shop_products SET quantity = 25 WHERE id = 'product-uuid';

-- Mark product as out of stock
-- UPDATE secretariat_shop_products SET in_stock = false WHERE quantity = 0;
