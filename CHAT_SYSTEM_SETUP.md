# Chat System Setup Guide

This guide will help you set up the complete chat functionality in your app.

## What's Included

### Database Tables
1. **chats** - Chat conversations (direct & group)
2. **chat_participants** - Users in each chat
3. **messages** - All chat messages

### Features
- ✅ Direct messaging (1-on-1)
- ✅ Group chats
- ✅ Real-time message updates
- ✅ Unread message tracking
- ✅ Message history
- ✅ User search
- ✅ Automatic chat creation
- ✅ Read receipts (last_read_at)

## Step 1: Apply Database Migration

### Option A: Supabase Dashboard (Easiest)

1. Go to https://app.supabase.com
2. Navigate to **SQL Editor**
3. Copy `supabase/migrations/20251227000002_create_chat_system.sql`
4. Paste and click **Run**

### Option B: Supabase CLI

```bash
cd /Users/user/Downloads/Akora
supabase db push
```

## Step 2: Verify Tables

After migration, check in **Table Editor**:
- ✅ chats
- ✅ chat_participants  
- ✅ messages

## Step 3: Test Sample Data

The migration includes sample data:
- **3 chats** (2 direct, 1 group)
- **11 sample messages**
- Between John, Jane, and Alex (from posts migration)

## Step 4: Update Your Chat Screens

The chat UI is already built! Just update the imports to use the new helper functions.

### Update `app/(tabs)/chat.tsx`

Replace the import at the top:

```typescript
// Add this import
import { fetchUserChats, getOrCreateDirectChat, searchUsers } from '@/lib/chats';
```

Replace the `fetchChats` function with:

```typescript
const fetchChats = async () => {
  if (!user) return;
  setLoading(true);
  const userChats = await fetchUserChats(user.id);
  setChats(userChats);
  setLoading(false);
};
```

Replace the `searchUsers` function with:

```typescript
const searchUsers = async (query: string) => {
  if (!query.trim() || !user) return;
  setSearchLoading(true);
  const results = await searchUsers(query, user.id);
  setSearchResults(results);
  setSearchLoading(false);
};
```

Replace the `createDirectChat` function with:

```typescript
const createDirectChat = async (otherUserId: string) => {
  if (!user) return;
  
  const chatId = await getOrCreateDirectChat(user.id, otherUserId);
  
  if (chatId) {
    router.push(`/chat/${chatId}`);
    setSearchModalVisible(false);
    setSearchQuery('');
    setSearchResults([]);
    fetchChats();
  } else {
    Alert.alert('Error', 'Failed to create chat');
  }
};
```

### Update `app/chat/[id].tsx`

Replace the imports:

```typescript
import { 
  fetchChatMessages, 
  sendMessage, 
  subscribeToMessages, 
  getChatInfo,
  markChatAsRead 
} from '@/lib/chats';
```

Replace the `fetchMessages` function with:

```typescript
const fetchMessages = async () => {
  if (!chatId) return;
  setLoading(true);
  const msgs = await fetchChatMessages(chatId);
  setMessages(msgs);
  setLoading(false);
  
  // Mark as read
  if (user) {
    await markChatAsRead(chatId, user.id);
  }
};
```

Replace the `fetchChatInfo` function with:

```typescript
const fetchChatInfo = async () => {
  if (!chatId || !user) return;
  const info = await getChatInfo(chatId, user.id);
  if (info) {
    setChatInfo({
      name: info.name || 'Chat',
      avatar_url: info.avatar_url,
      type: info.type,
    });
  }
};
```

Replace the `subscribeToMessages` function with:

```typescript
const subscribeToMessages = () => {
  if (!chatId) return;

  const subscription = subscribeToMessages(chatId, (message) => {
    setMessages(prev => [...prev, message]);
    
    // Auto-scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    // Mark as read if not from current user
    if (user && message.sender_id !== user.id) {
      markChatAsRead(chatId, user.id);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
};
```

Replace the `handleSend` function with:

```typescript
const handleSend = async () => {
  if (!newMessage.trim() || !user || !chatId) return;

  const messageContent = newMessage.trim();
  setNewMessage('');
  setSending(true);

  const message = await sendMessage(chatId, user.id, messageContent);

  if (message) {
    // Message will be added via real-time subscription
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  } else {
    Alert.alert('Error', 'Failed to send message');
  }

  setSending(false);
};
```

## Step 5: Real-Time Updates

The chat system automatically updates in real-time! Messages appear instantly using Supabase real-time subscriptions.

## Features Breakdown

### Direct Messaging
- Click "New Chat" → Search for user → Start chatting
- Chat is automatically created if it doesn't exist
- Uses other participant's name and avatar

### Group Chats
- Create with multiple participants
- Custom name and avatar
- Everyone can send messages

### Unread Counts
- Shows number of unread messages per chat
- Updates automatically when you read messages
- Uses `last_read_at` timestamp

### Message Features
- Send text messages
- Delete messages (soft delete)
- Real-time delivery
- Timestamp display
- Sender information

## Testing the Chat System

1. **View existing chats**: Open the Chat tab
2. **Send a message**: Click on a chat → Type → Send
3. **Create new chat**: Click + → Search "jane" → Click to start chat
4. **Test real-time**: Open same chat in 2 devices/browsers
5. **Check unread counts**: Messages show unread badge

## Troubleshooting

### No chats showing
- Check migrations were applied
- Verify sample data exists: `SELECT * FROM chats;`
- Check user is authenticated

### Messages not sending
- Verify RLS policies are enabled
- Check user is participant of chat
- Look for errors in Expo console

### Real-time not working
- Verify Supabase real-time is enabled in dashboard
- Check subscription is created correctly
- Look for WebSocket errors

### Search not working
- Verify profiles table has data
- Check search query format
- Ensure RLS policies allow reading profiles

## Advanced Features to Add

### Future Enhancements
- [ ] Image/file sharing
- [ ] Voice messages
- [ ] Message reactions (emoji)
- [ ] Read receipts (who read what)
- [ ] Typing indicators
- [ ] Message editing
- [ ] Push notifications
- [ ] Message forwarding
- [ ] Chat archiving
- [ ] Block/report users

### Implementation Tips

**Typing Indicators:**
```typescript
// Send presence updates
const channel = supabase.channel('typing')
  .on('presence', { event: 'sync' }, () => {
    // Show who's typing
  });
```

**Push Notifications:**
- Use Expo Notifications
- Send when message arrives and user is offline
- Store device tokens in profiles table

**Image Sharing:**
- Use Supabase Storage
- Upload image → Get URL → Send as message
- Add `image_url` column to messages table

## Database Schema Reference

### chats table
```sql
id          uuid        Primary key
type        text        'direct' or 'group'
name        text        Group name (null for direct)
avatar_url  text        Group avatar
created_at  timestamp
updated_at  timestamp   Auto-updated on new message
```

### chat_participants table
```sql
id            uuid        Primary key
chat_id       uuid        References chats
user_id       uuid        References profiles
joined_at     timestamp
last_read_at  timestamp   For unread counts
```

### messages table
```sql
id          uuid        Primary key
chat_id     uuid        References chats
sender_id   uuid        References profiles
content     text        Message content
created_at  timestamp
updated_at  timestamp
is_deleted  boolean     Soft delete flag
```

## Helper Functions Available

From `lib/chats.ts`:

- `fetchUserChats(userId)` - Get all user's chats
- `getOrCreateDirectChat(user1, user2)` - Create/get direct chat
- `createGroupChat(name, participants)` - Create group
- `fetchChatMessages(chatId)` - Get messages
- `sendMessage(chatId, senderId, content)` - Send message
- `deleteMessage(messageId)` - Delete message
- `getUnreadCount(chatId, userId)` - Get unread count
- `markChatAsRead(chatId, userId)` - Mark as read
- `subscribeToMessages(chatId, callback)` - Real-time updates
- `searchUsers(query, currentUserId)` - Search users
- `getChatInfo(chatId, userId)` - Get chat details
- `leaveChat(chatId, userId)` - Leave chat
- `addParticipant(chatId, userId)` - Add to group

## Security (RLS Policies)

All tables have Row Level Security enabled:

✅ Users can only see chats they're part of
✅ Users can only send messages to their chats
✅ Users can only edit/delete their own messages
✅ Direct chat creation is restricted
✅ Group chat members can update group details

Your data is secure! 🔒
