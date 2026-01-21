-- Fix push token cleanup when switching accounts on same device
-- The problem: RLS prevents User A from deactivating User B's tokens
-- Solution: Create a SECURITY DEFINER function that bypasses RLS

-- Function to register push token and deactivate same token for other users
-- This ensures one physical device can only have active tokens for ONE user
CREATE OR REPLACE FUNCTION register_push_token_exclusive(
  p_user_id UUID,
  p_token TEXT,
  p_device_type TEXT
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_id UUID;
BEGIN
  -- CRITICAL: First, deactivate this exact token for ALL OTHER users
  -- This ensures when you switch accounts, only the new account gets notifications
  UPDATE push_notification_tokens
  SET is_active = false, 
      updated_at = NOW()
  WHERE token = p_token 
    AND user_id != p_user_id;
  
  -- Log how many were deactivated
  RAISE NOTICE 'Deactivated % tokens for other users', FOUND;

  -- Insert or update the token for current user
  INSERT INTO push_notification_tokens (user_id, token, device_type, is_active, updated_at, last_used_at)
  VALUES (p_user_id, p_token, p_device_type, true, NOW(), NOW())
  ON CONFLICT (user_id, token)
  DO UPDATE SET 
    is_active = true,
    device_type = EXCLUDED.device_type,
    updated_at = NOW(),
    last_used_at = NOW()
  RETURNING id INTO v_token_id;

  RETURN v_token_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION register_push_token_exclusive(UUID, TEXT, TEXT) TO authenticated;

-- Also add a policy to allow service role to manage all tokens
-- This is needed for the Edge Function to query tokens
DROP POLICY IF EXISTS "Service role can read all tokens" ON push_notification_tokens;
CREATE POLICY "Service role can read all tokens"
  ON push_notification_tokens FOR SELECT
  TO service_role
  USING (true);

-- Verify: Show all active tokens (run this to check for duplicates)
-- SELECT token, array_agg(user_id) as users, count(*) 
-- FROM push_notification_tokens 
-- WHERE is_active = true 
-- GROUP BY token 
-- HAVING count(*) > 1;
