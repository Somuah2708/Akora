# Instagram-Style Post Sharing in Chats - Setup Guide

## Overview
This feature allows users to share posts to their friends via chat, where the post appears as a visual card (like Instagram) that can be tapped to view the full post.

## Step 1: Run the Database Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Add columns to support post sharing in messages (Instagram-style)
-- This allows messages to contain shared posts with rich previews

-- Add message_type column to distinguish between text, post, image, etc.
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'post', 'image', 'video'));

-- Add post_id column to reference shared posts
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL;

-- Add index for querying messages by post
CREATE INDEX IF NOT EXISTS idx_messages_post_id ON public.messages(post_id);

-- Add index for querying messages by type
CREATE INDEX IF NOT EXISTS idx_messages_type ON public.messages(message_type);

COMMENT ON COLUMN public.messages.message_type IS 'Type of message: text (regular message), post (shared post), image, video';
COMMENT ON COLUMN public.messages.post_id IS 'Reference to shared post for message_type = post';
```

Or run the file: `ADD_POST_SHARING_TO_MESSAGES.sql`

## Step 2: Update Your Chat Screen

You need to modify your chat messages screen to display shared posts as cards instead of plain text.

### In your chat screen component (e.g., `app/(tabs)/chats/[id].tsx`):

1. **Fetch messages with post data:**

```typescript
const { data: messages } = await supabase
  .from('messages')
  .select(`
    *,
    sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url),
    post:posts(id, description, images, user_id, created_at, profiles(username, full_name, avatar_url))
  `)
  .eq('chat_id', chatId)
  .order('created_at', { ascending: true });
```

2. **Render messages based on type:**

```typescript
{messages.map((message) => (
  <View key={message.id}>
    {message.message_type === 'post' && message.post ? (
      // Shared Post Card (Instagram-style)
      <TouchableOpacity 
        style={styles.sharedPostCard}
        onPress={() => navigateToPost(message.post.id)}
      >
        <View style={styles.sharedPostHeader}>
          <Image 
            source={{ uri: message.post.profiles.avatar_url }} 
            style={styles.sharedPostAvatar} 
          />
          <Text style={styles.sharedPostUsername}>
            {message.post.profiles.full_name || message.post.profiles.username}
          </Text>
        </View>
        
        {message.post.images?.[0] && (
          <Image 
            source={{ uri: message.post.images[0] }} 
            style={styles.sharedPostImage} 
          />
        )}
        
        <Text style={styles.sharedPostDescription} numberOfLines={2}>
          {message.post.description}
        </Text>
      </TouchableOpacity>
    ) : (
      // Regular Text Message
      <View style={styles.textMessage}>
        <Text style={styles.messageText}>{message.content}</Text>
      </View>
    )}
  </View>
))}
```

3. **Add styles:**

```typescript
const styles = StyleSheet.create({
  sharedPostCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginVertical: 8,
    maxWidth: '80%',
  },
  sharedPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sharedPostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  sharedPostUsername: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  sharedPostImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  sharedPostDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  textMessage: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
    maxWidth: '80%',
  },
  messageText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
});
```

4. **Navigate to post when tapped:**

```typescript
const navigateToPost = (postId: string) => {
  router.push(`/post/${postId}`);
};
```

## How It Works Now:

1. ✅ User taps share button on a post in discover feed
2. ✅ Selects a friend from the list
3. ✅ Post is sent as a `message_type: 'post'` with `post_id` reference
4. ✅ In the chat screen, the message displays as a visual card showing:
   - Post author's avatar and name
   - Post image (if available)
   - Post description preview
5. ✅ When friend taps the card, they navigate to the full post
6. ✅ Share is tracked in `post_shares` table

## Just Like Instagram! 🎉

The post appears as a rich preview card in the chat that can be tapped to view the full post, exactly like Instagram's share functionality.
