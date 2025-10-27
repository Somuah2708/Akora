/*
  # User Connections System

  1. New Tables
    - `connections` - Friend/connection requests between users
      - `id` (uuid, primary key)
      - `requester_id` (uuid, user who sent request)
      - `addressee_id` (uuid, user who received request)
      - `status` (enum: pending, accepted, rejected)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
  2. Features
    - Send connection requests
    - Accept/reject requests
    - View pending requests
    - View connections
    - Auto-create direct chat when connection accepted
    
  3. Security
    - RLS policies for privacy
    - Users can only see their own connections
    - Prevent duplicate requests
*/

-- Create connection status enum
DO $$ BEGIN
  CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create connections table
CREATE TABLE IF NOT EXISTS public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status connection_status NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id) -- Can't connect with yourself
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_connections_requester ON public.connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_addressee ON public.connections(addressee_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON public.connections(status);

-- Enable RLS
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own connections"
  ON public.connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can send connection requests"
  ON public.connections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update connections they're involved in"
  ON public.connections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can delete their own connection requests"
  ON public.connections
  FOR DELETE
  TO authenticated
  USING (auth.uid() = requester_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER connections_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION update_connections_updated_at();

-- Function to get connection status between two users
CREATE OR REPLACE FUNCTION get_connection_status(user1_id uuid, user2_id uuid)
RETURNS connection_status AS $$
DECLARE
  conn_status connection_status;
BEGIN
  SELECT status INTO conn_status
  FROM connections
  WHERE (requester_id = user1_id AND addressee_id = user2_id)
     OR (requester_id = user2_id AND addressee_id = user1_id)
  LIMIT 1;
  
  RETURN conn_status;
END;
$$ LANGUAGE plpgsql;

-- Function to check if users are connected
CREATE OR REPLACE FUNCTION are_users_connected(user1_id uuid, user2_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM connections
    WHERE status = 'accepted'
      AND ((requester_id = user1_id AND addressee_id = user2_id)
       OR (requester_id = user2_id AND addressee_id = user1_id))
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get pending connection requests count
CREATE OR REPLACE FUNCTION get_pending_requests_count(user_id uuid)
RETURNS bigint AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM connections
    WHERE addressee_id = user_id AND status = 'pending'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create chat when connection is accepted
CREATE OR REPLACE FUNCTION create_chat_on_connection_accepted()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create chat if status changed to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Check if chat already exists
    IF NOT EXISTS (
      SELECT 1 FROM chats c
      INNER JOIN chat_participants cp1 ON c.id = cp1.chat_id AND cp1.user_id = NEW.requester_id
      INNER JOIN chat_participants cp2 ON c.id = cp2.chat_id AND cp2.user_id = NEW.addressee_id
      WHERE c.is_group = false
    ) THEN
      -- Create direct chat
      DECLARE
        new_chat_id uuid;
      BEGIN
        INSERT INTO chats (is_group, created_by)
        VALUES (false, NEW.addressee_id)
        RETURNING id INTO new_chat_id;
        
        -- Add both users as participants
        INSERT INTO chat_participants (chat_id, user_id)
        VALUES 
          (new_chat_id, NEW.requester_id),
          (new_chat_id, NEW.addressee_id);
          
        -- Send system message
        INSERT INTO messages (chat_id, sender_id, content, is_system_message)
        VALUES (
          new_chat_id,
          NEW.addressee_id,
          'You are now connected! Start chatting.',
          true
        );
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_connection_accepted
  AFTER UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_on_connection_accepted();

-- Insert sample connections (only if connections table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.connections LIMIT 1) THEN
    -- Sample connection requests
    INSERT INTO public.connections (requester_id, addressee_id, status) VALUES
      ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'accepted'),
      ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'pending');
  END IF;
END $$;
