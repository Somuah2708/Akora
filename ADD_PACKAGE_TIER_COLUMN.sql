-- Add package_tier column to persist tier selection
ALTER TABLE public.akora_events
  ADD COLUMN IF NOT EXISTS package_tier TEXT CHECK (package_tier IN ('basic', 'standard', 'priority', 'premium')) DEFAULT 'standard';

-- Create index for faster tier-based queries
CREATE INDEX IF NOT EXISTS idx_akora_events_package_tier ON public.akora_events(package_tier);

-- Update existing records to set tier based on listing_fee
UPDATE public.akora_events
SET package_tier = CASE
  WHEN listing_fee >= 300 THEN 'premium'
  WHEN listing_fee >= 150 THEN 'priority'
  WHEN listing_fee >= 50 THEN 'standard'
  ELSE 'basic'
END
WHERE package_tier IS NULL;
