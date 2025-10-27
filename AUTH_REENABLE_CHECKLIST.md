# Authentication Re-enablement Checklist

⚠️ **IMPORTANT**: When you add real authentication, follow these steps:

## 1. Re-enable RLS on Friend System Tables

Create a new migration to re-enable Row Level Security:

```sql
-- Re-enable RLS on friend system tables
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- Re-enable RLS on old chat system tables
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
```

## 2. Update Friend System Functions to Use auth.uid()

Replace the mock-auth functions with secure versions:

```sql
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
```

## 3. Update lib/friends.ts

Revert the unfriend function to not require user_id parameter:

```typescript
// Change from:
export async function unfriend(userId: string, friendUserId: string) {
  const { error } = await supabase.rpc('unfriend', {
    user_id_param: userId,
    friend_user_id: friendUserId,
  });
  if (error) throw error;
}

// Back to:
export async function unfriend(friendUserId: string) {
  const { error } = await supabase.rpc('unfriend', {
    friend_user_id: friendUserId,
  });
  if (error) throw error;
}
```

## 4. Update hooks/useAuth.ts

Replace mock authentication with real Supabase auth:

```typescript
// Remove mock user logic
// Add real Supabase auth with:
// - supabase.auth.signUp()
// - supabase.auth.signInWithPassword()
// - supabase.auth.signOut()
// - supabase.auth.onAuthStateChange()
```

## 5. Enable Auth Routing

Update app/_layout.tsx to redirect unauthenticated users:

```typescript
// Add auth check and redirect to /auth/sign-in if no user
```

## 6. Test Thoroughly

- [ ] Sign up with new account
- [ ] Sign in/out
- [ ] Send friend requests (should only work when authenticated)
- [ ] Accept/reject friend requests
- [ ] Send direct messages
- [ ] All queries respect user permissions

---

**Files to update when adding auth:**
- `supabase/migrations/[new]_enable_rls_and_auth.sql`
- `lib/friends.ts` (unfriend function signature)
- `hooks/useAuth.ts` (replace mock with real auth)
- `app/_layout.tsx` (add auth routing)
- Any UI components calling `unfriend()` function
