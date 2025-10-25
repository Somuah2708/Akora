/*
  # Add approval system to products_services table

  1. Changes
    - Add `is_approved` column to `products_services` table with default value of false
    - Make `price` column nullable to support free listings
    - Remove price constraint to allow zero or null values
    - Update RLS policies to only show approved listings to regular users
    - Allow admins to see all listings regardless of approval status

  2. Security
    - Update RLS policies for proper access control
    - Ensure only approved content is visible to regular users
*/

-- Add is_approved column to products_services table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products_services' AND column_name = 'is_approved'
  ) THEN
    ALTER TABLE products_services ADD COLUMN is_approved boolean DEFAULT false;
  END IF;
END $$;

-- Make price column nullable and remove constraint
DO $$
BEGIN
  -- Drop the existing price constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'products_services' AND constraint_name = 'products_services_price_check'
  ) THEN
    ALTER TABLE products_services DROP CONSTRAINT products_services_price_check;
  END IF;
  
  -- Make price column nullable
  ALTER TABLE products_services ALTER COLUMN price DROP NOT NULL;
END $$;

-- Update RLS policy for SELECT to only show approved listings to regular users
DROP POLICY IF EXISTS "All users can view products and services" ON products_services;

CREATE POLICY "Users can view approved products and services"
  ON products_services
  FOR SELECT
  TO authenticated
  USING (
    is_approved = true OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Create index for better performance on approval queries
CREATE INDEX IF NOT EXISTS idx_products_services_approved ON products_services (is_approved);