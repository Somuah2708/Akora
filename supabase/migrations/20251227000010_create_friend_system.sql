/*
  # Friend System & Enhanced Chat
  
  1. Friend Requests Table
    - Handles sending, accepting, rejecting friend requests
  
  2. Friends Table
    - Stores accepted friendships (bidirectional)
  
  3. Messages Table (1-on-1)
    - Direct messages between friends
  
  4. Groups & Group Messages
    - Group chat functionality
*/

-- Friend Requests Table
CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Friends Table (bidirectional friendships)
CREATE TABLE IF NOT EXISTS friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Direct Messages Table (1-on-1 chat)
CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_read boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Groups Table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar_url text,
  description text,
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Group Members Table
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Group Messages Table
CREATE TABLE IF NOT EXISTS group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver ON direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friend_requests
CREATE POLICY "Users can view their own friend requests"
  ON friend_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests"
  ON friend_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update requests they received"
  ON friend_requests FOR UPDATE
  USING (auth.uid() = receiver_id);

-- RLS Policies for friends
CREATE POLICY "Users can view their friendships"
  ON friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "System can insert friendships"
  ON friends FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can remove their friendships"
  ON friends FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- RLS Policies for direct_messages
CREATE POLICY "Users can view messages they sent or received"
  ON direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages to friends"
  ON direct_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM friends
      WHERE (user_id = sender_id AND friend_id = receiver_id)
         OR (user_id = receiver_id AND friend_id = sender_id)
    )
  );

CREATE POLICY "Users can update their received messages"
  ON direct_messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- RLS Policies for groups
CREATE POLICY "Anyone can view groups they're in"
  ON groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
        AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups"
  ON groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
        AND group_members.user_id = auth.uid()
        AND group_members.role = 'admin'
    )
  );

-- RLS Policies for group_members
CREATE POLICY "Anyone can view group members if they're in the group"
  ON group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can add members"
  ON group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_members.group_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for group_messages
CREATE POLICY "Group members can view group messages"
  ON group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_messages.group_id
        AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can send messages"
  ON group_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_messages.group_id
        AND group_members.user_id = auth.uid()
    )
  );

-- Function to accept friend request
CREATE OR REPLACE FUNCTION accept_friend_request(request_id uuid)
RETURNS void AS $$
DECLARE
  v_sender_id uuid;
  v_receiver_id uuid;
BEGIN
  -- Get sender and receiver IDs
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

-- Function to reject friend request
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

-- Function to unfriend
CREATE OR REPLACE FUNCTION unfriend(friend_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Remove both sides of friendship
  DELETE FROM friends
  WHERE (user_id = auth.uid() AND friend_id = friend_user_id)
     OR (user_id = friend_user_id AND friend_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample data for testing (only if profiles exist)
-- Sample pending friend request from user 2 to user 1
INSERT INTO friend_requests (sender_id, receiver_id, status)
SELECT 
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'pending'
WHERE 
  EXISTS (SELECT 1 FROM profiles WHERE id = '22222222-2222-2222-2222-222222222222')
  AND EXISTS (SELECT 1 FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111')
  AND NOT EXISTS (
    SELECT 1 FROM friend_requests 
    WHERE sender_id = '22222222-2222-2222-2222-222222222222'
      AND receiver_id = '11111111-1111-1111-1111-111111111111'
  );

-- Sample accepted friendship between user 1 and user 3
INSERT INTO friend_requests (sender_id, receiver_id, status)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'accepted'
WHERE 
  EXISTS (SELECT 1 FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111')
  AND EXISTS (SELECT 1 FROM profiles WHERE id = '33333333-3333-3333-3333-333333333333')
  AND NOT EXISTS (
    SELECT 1 FROM friend_requests 
    WHERE sender_id = '11111111-1111-1111-1111-111111111111'
      AND receiver_id = '33333333-3333-3333-3333-333333333333'
  );

INSERT INTO friends (user_id, friend_id)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333'
WHERE 
  EXISTS (SELECT 1 FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111')
  AND EXISTS (SELECT 1 FROM profiles WHERE id = '33333333-3333-3333-3333-333333333333')
  AND NOT EXISTS (
    SELECT 1 FROM friends 
    WHERE user_id = '11111111-1111-1111-1111-111111111111'
      AND friend_id = '33333333-3333-3333-3333-333333333333'
  );

INSERT INTO friends (user_id, friend_id)
SELECT 
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111'
WHERE 
  EXISTS (SELECT 1 FROM profiles WHERE id = '33333333-3333-3333-3333-333333333333')
  AND EXISTS (SELECT 1 FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111')
  AND NOT EXISTS (
    SELECT 1 FROM friends 
    WHERE user_id = '33333333-3333-3333-3333-333333333333'
      AND friend_id = '11111111-1111-1111-1111-111111111111'
  );

-- Sample direct messages (only if both users exist and are friends)
INSERT INTO direct_messages (sender_id, receiver_id, message, created_at)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'Hey! How are you?',
  now() - interval '2 hours'
WHERE 
  EXISTS (SELECT 1 FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111')
  AND EXISTS (SELECT 1 FROM profiles WHERE id = '33333333-3333-3333-3333-333333333333');

INSERT INTO direct_messages (sender_id, receiver_id, message, created_at)
SELECT 
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'I''m good! Thanks for asking',
  now() - interval '1 hour 50 minutes'
WHERE 
  EXISTS (SELECT 1 FROM profiles WHERE id = '33333333-3333-3333-3333-333333333333')
  AND EXISTS (SELECT 1 FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111');

INSERT INTO direct_messages (sender_id, receiver_id, message, created_at)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'Want to grab coffee later?',
  now() - interval '1 hour 30 minutes'
WHERE 
  EXISTS (SELECT 1 FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111')
  AND EXISTS (SELECT 1 FROM profiles WHERE id = '33333333-3333-3333-3333-333333333333');

INSERT INTO direct_messages (sender_id, receiver_id, message, created_at)
SELECT 
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'Sure! What time works for you?',
  now() - interval '1 hour'
WHERE 
  EXISTS (SELECT 1 FROM profiles WHERE id = '33333333-3333-3333-3333-333333333333')
  AND EXISTS (SELECT 1 FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111');
