/*
  # Enable Real Authentication for Friend System
  
  Replace friend system functions to use auth.uid() for proper authentication.
  This restores security checks now that real auth is enabled.
*/

-- Function to accept friend request (WITH auth check)
CREATE OR REPLACE FUNCTION accept_friend_request(request_id uuid)
RETURNS void AS $$
DECLARE
  v_sender_id uuid;
  v_receiver_id uuid;
BEGIN
  -- Get sender and receiver IDs (WITH auth check)
  SELECT sender_id, receiver_id INTO v_sender_id, v_receiver_id
  FROM friend_requests
  WHERE id = request_id AND receiver_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or unauthorized';
  END IF;

  -- Update request status
  UPDATE friend_requests
  SET status = 'accepted', updated_at = now()
  WHERE id = request_id;

  -- Insert bidirectional friendship
  INSERT INTO friends (user_id, friend_id)
  VALUES (v_sender_id, v_receiver_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO friends (user_id, friend_id)
  VALUES (v_receiver_id, v_sender_id)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject friend request (WITH auth check)
CREATE OR REPLACE FUNCTION reject_friend_request(request_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE friend_requests
  SET status = 'rejected', updated_at = now()
  WHERE id = request_id AND receiver_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or unauthorized';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unfriend (WITH auth check)
CREATE OR REPLACE FUNCTION unfriend(friend_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Remove both sides of friendship
  DELETE FROM friends
  WHERE (user_id = auth.uid() AND friend_id = friend_user_id)
     OR (user_id = friend_user_id AND friend_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
