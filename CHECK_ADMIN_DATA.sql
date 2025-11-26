-- Check admin messages and conversations data

-- 1. Check your admin user profile
SELECT id, email, full_name, role, is_admin 
FROM profiles 
WHERE email = 'bigsouu@gmail.com';  -- Replace with your admin email

-- 2. Check all admin messages
SELECT 
  am.id,
  am.user_id,
  am.message,
  am.sender_type,
  am.created_at,
  p.full_name as user_name,
  p.email as user_email
FROM admin_messages am
LEFT JOIN profiles p ON p.id = am.user_id
ORDER BY am.created_at DESC;

-- 3. Check all admin conversations
SELECT 
  ac.id,
  ac.user_id,
  ac.last_message,
  ac.last_message_at,
  ac.unread_admin_count,
  ac.unread_user_count,
  p.full_name as user_name,
  p.email as user_email
FROM admin_conversations ac
LEFT JOIN profiles p ON p.id = ac.user_id
ORDER BY ac.last_message_at DESC;

-- 4. If no conversations exist but messages do, manually create conversation:
-- (Only run if query 3 returns empty but query 2 has data)
/*
INSERT INTO admin_conversations (user_id, last_message, last_message_at, unread_admin_count)
SELECT 
  user_id,
  message,
  created_at,
  1
FROM admin_messages
WHERE sender_type = 'user'
ORDER BY created_at DESC
LIMIT 1
ON CONFLICT (user_id) DO NOTHING;
*/
