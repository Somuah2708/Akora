# Admin Support Messages in Chat Tab

## What Changed

Admin support messages now appear directly in the **Chat tab** for admin users, making it easy to see and respond to customer support requests alongside regular conversations.

## How It Works

### For Admins
1. Open the **Chat tab**
2. Support conversations appear at the top in a **"CUSTOMER SUPPORT"** section
3. Support chats have:
   - Yellow/amber background (#FEF3C7)
   - "Support" badge
   - User's name (or first letter if no avatar)
   - Last message preview
   - Unread count badge (amber colored)
4. Tap a support conversation to open the admin chat screen
5. Real-time updates - new support messages appear instantly

### For Regular Users
- No changes - Chat tab shows only their regular conversations
- They continue to access support via "Send us a Message" in Secretariat

## Features

✅ **Real-time Updates** - New support messages trigger automatic refresh
✅ **Visual Distinction** - Yellow background + "Support" badge
✅ **Unread Counts** - Shows number of unread messages from users
✅ **Pull to Refresh** - Swipe down to manually refresh all conversations
✅ **Seamless Navigation** - Tap to open admin chat screen

## Technical Details

### Database Query
Fetches from `admin_conversations` table with user profile join:
```sql
SELECT *,
  user:user_id (id, email, full_name, avatar_url, role, is_admin)
FROM admin_conversations
ORDER BY last_message_at DESC
```

### Real-Time Subscription
Listens to `admin_conversations` table changes:
```typescript
supabase
  .channel('admin_conversations_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'admin_conversations',
  }, () => {
    fetchSupportConversations(); // Refresh list
  })
```

### Admin Check
On mount, checks user's profile:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('role, is_admin')
  .eq('id', user.id)
  .single();

setIsAdmin(profile?.role === 'admin' || profile?.is_admin === true);
```

## File Modified

- **app/(tabs)/chat.tsx**
  - Added `supportConversations` state
  - Added `isAdmin` state
  - Added `fetchSupportConversations()` function
  - Added admin check in useEffect
  - Added real-time subscription for support messages
  - Added "CUSTOMER SUPPORT" section in render
  - Updated refresh function to include support conversations

## Testing

1. **Enable Real-Time** (if not done):
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_conversations;
   ```

2. **Test as User**:
   - Go to Secretariat → "Send us a Message"
   - Send a test message
   - Message should save successfully

3. **Test as Admin**:
   - Login as admin user
   - Go to Chat tab
   - Should see "CUSTOMER SUPPORT" section at top
   - Should see the user's message in yellow card
   - Tap to open chat
   - Reply to user
   - Check unread count updates

4. **Test Real-Time**:
   - Keep admin Chat tab open
   - Send another message from user account
   - Admin should see conversation update immediately

## Troubleshooting

### Support conversations not showing for admin

**Check admin role**:
```sql
SELECT id, email, role, is_admin 
FROM profiles 
WHERE id = 'your-admin-user-id';
```

If not admin, update:
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@example.com';
```

### Real-time not working

**Enable replication**:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_conversations;
```

**Verify it's enabled**:
```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'admin_conversations';
```

### Messages showing but can't open chat

- Verify `/app/admin/messages/[userId].tsx` exists
- Check navigation is correct: `router.push(\`/admin/messages/\${friend?.id}\`)`
- Check console for errors

## UI Styling

```typescript
// Support conversation background
backgroundColor: '#FEF3C7' // Yellow-50

// Support badge
backgroundColor: '#F59E0B' // Amber-500

// Avatar fallback
backgroundColor: '#FCD34D' // Yellow-300
color: '#92400E' // Yellow-800

// Unread badge
backgroundColor: '#F59E0B' // Amber-500
```

## Next Steps

After this update:
1. Admins can monitor support requests from Chat tab
2. No need to navigate to separate admin section
3. Support conversations integrated with regular workflow
4. Real-time notifications keep admins informed

---

**Last Updated**: November 26, 2025
