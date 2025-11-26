# Admin Chat System - Complete Guide

## Overview
The Admin Chat system enables direct communication between users and support staff without requiring friend requests. Messages are delivered in real-time with full media support (images and documents).

## Architecture

### Database Tables

#### admin_messages
Stores individual messages between users and admins.

```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- message: TEXT (message content)
- sender_type: TEXT ('user' or 'admin')
- media_url: TEXT (optional - URL to uploaded file)
- media_type: TEXT (optional - 'image' or 'document')
- is_read: BOOLEAN (default: false)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### admin_conversations
Tracks conversation metadata and unread counts.

```sql
- id: UUID (primary key)
- user_id: UUID (unique, references auth.users)
- last_message: TEXT
- last_message_at: TIMESTAMPTZ
- unread_admin_count: INTEGER (messages admins haven't read)
- unread_user_count: INTEGER (messages users haven't read)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### Storage Bucket

**chat-media** (public bucket)
- Path: `admin-chat/{user_id}_{timestamp}.{ext}`
- Supported formats:
  - Images: JPG, JPEG, PNG
  - Documents: PDF, DOC, DOCX
- Public read access with authenticated write

## User Flow

### 1. Accessing Admin Chat
**Entry Point**: Secretariat > Send us a Message button

```typescript
// In app/secretariat/index.tsx
const handleMessage = () => {
  router.push('/admin-chat');
};
```

**Screen**: `/app/admin-chat/index.tsx`

### 2. Sending Messages

#### Text Messages
1. User types message in input field
2. Taps Send button
3. Message inserted into `admin_messages` table
4. Real-time subscription delivers to admin instantly
5. Conversation metadata auto-updates via trigger

#### Media Messages
1. User taps paperclip icon
2. Attach menu shows: Photo | Document
3. User selects media type and picks file
4. Preview shows before sending
5. On send:
   - File uploads to `chat-media` bucket
   - Public URL generated
   - Message inserted with `media_url` and `media_type`
6. Media renders in chat bubble

### 3. Real-Time Updates

```typescript
// Supabase real-time subscription
const channel = supabase
  .channel(`admin-messages-${user.id}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'admin_messages',
    filter: `user_id=eq.${user.id}`,
  }, (payload) => {
    // New message arrives
    const newMsg = payload.new as Message;
    setMessages(prev => {
      // Prevent duplicates
      if (prev.some(m => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });
  })
  .subscribe();
```

## Admin Flow

### 1. Viewing All Conversations
**Screen**: `/app/admin/messages/index.tsx`

Features:
- List of all user conversations
- User avatar (first letter of name)
- Last message preview
- Unread badge (red circle with count)
- Real-time updates when new messages arrive
- Sorted by most recent activity

```typescript
// Real-time subscription for conversation updates
const channel = supabase
  .channel('admin-conversations')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'admin_conversations',
  }, () => {
    fetchConversations(); // Refresh list
  })
  .subscribe();
```

### 2. Individual Chat
**Screen**: `/app/admin/messages/[userId].tsx`

Features:
- User header with name and email
- Message history with media support
- User badge on user messages
- Admin badge on admin messages
- Real-time message delivery
- Auto mark-as-read

```typescript
// Admin sends message
const { error } = await supabase
  .from('admin_messages')
  .insert({
    user_id: userId,
    message: messageText,
    sender_type: 'admin',
  });
```

## Media Upload Process

### Image Upload
```typescript
const pickImage = async () => {
  // Request permissions
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return;

  // Pick image
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
  });

  // Set attachment for preview
  if (!result.canceled) {
    setAttachment({
      uri: result.assets[0].uri,
      type: 'image',
      name: result.assets[0].fileName || 'image.jpg',
      mimeType: 'image/jpeg',
    });
  }
};
```

### Document Upload
```typescript
const pickDocument = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    copyToCacheDirectory: true,
  });

  if (!result.canceled) {
    setAttachment({
      uri: result.assets[0].uri,
      type: 'document',
      name: result.assets[0].name,
      mimeType: result.assets[0].mimeType,
    });
  }
};
```

### Upload to Supabase Storage
```typescript
const uploadMedia = async (file: MediaAttachment): Promise<string | null> => {
  // Convert URI to blob
  const response = await fetch(file.uri);
  const blob = await response.blob();
  
  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}_${Date.now()}.${fileExt}`;
  const filePath = `admin-chat/${fileName}`;

  // Upload to storage
  const { error } = await supabase.storage
    .from('chat-media')
    .upload(filePath, blob, {
      contentType: file.mimeType,
    });

  if (error) throw error;

  // Get public URL
  const { data } = supabase.storage
    .from('chat-media')
    .getPublicUrl(filePath);

  return data.publicUrl;
};
```

### Send Message with Media
```typescript
const sendMessage = async () => {
  let mediaUrl = null;
  let mediaType = null;

  // Upload media first if attached
  if (attachment) {
    mediaUrl = await uploadMedia(attachment);
    mediaType = attachment.type;
  }

  // Insert message with media
  await supabase
    .from('admin_messages')
    .insert({
      user_id: user.id,
      message: messageText || `Sent a ${attachment.type}`,
      sender_type: 'user',
      media_url: mediaUrl,
      media_type: mediaType,
    });
};
```

## UI Components

### Date Separators
Shows "Today", "Yesterday", or date for message grouping.

```typescript
const formatDate = (timestamp: string) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
};
```

### Media Rendering

#### Image
```tsx
{message.media_url && message.media_type === 'image' && (
  <Image 
    source={{ uri: message.media_url }} 
    style={styles.messageImage} 
  />
)}
```

#### Document
```tsx
{message.media_url && message.media_type === 'document' && (
  <View style={styles.documentPreview}>
    <FileText size={32} color="#4169E1" />
    <Text>Document</Text>
  </View>
)}
```

### Attachment Preview (Before Sending)
```tsx
{attachment && (
  <View style={styles.attachmentPreview}>
    {attachment.type === 'image' ? (
      <Image source={{ uri: attachment.uri }} style={styles.previewImage} />
    ) : (
      <View style={styles.previewDocument}>
        <FileText size={24} color="#4169E1" />
        <Text>{attachment.name}</Text>
      </View>
    )}
    <TouchableOpacity onPress={() => setAttachment(null)}>
      <X size={18} color="#FFFFFF" />
    </TouchableOpacity>
  </View>
)}
```

### Attach Menu
```tsx
{showAttachMenu && (
  <View style={styles.attachMenu}>
    <TouchableOpacity onPress={pickImage}>
      <ImageIcon size={20} color="#1E40AF" />
      <Text>Photo</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={pickDocument}>
      <FileText size={20} color="#991B1B" />
      <Text>Document</Text>
    </TouchableOpacity>
  </View>
)}
```

## Database Migrations

### Required Migrations (Run in order)

1. **CREATE_APP_CONTACT_SETTINGS_TABLE.sql**
   - Creates contact settings (email, phone, address, etc.)
   - Admin can edit via `/admin/contact-settings`

2. **CREATE_ADMIN_MESSAGES_TABLE.sql**
   - Creates `admin_messages` and `admin_conversations` tables
   - Sets up RLS policies
   - Creates auto-update trigger

3. **ADD_MEDIA_TO_ADMIN_MESSAGES.sql**
   - Adds `media_url` and `media_type` columns
   - Adds index for media queries

4. **Verify Storage Bucket**
   - Check if `chat-media` bucket exists
   - Should already be created (used by friend chat)

## Security & RLS Policies

### admin_messages

**User Read**: Users can view their own messages
```sql
CREATE POLICY "Users can view their own messages"
  ON admin_messages FOR SELECT
  USING (user_id = auth.uid());
```

**Admin Read**: Admins can view all messages
```sql
CREATE POLICY "Admins can view all messages"
  ON admin_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

**User Insert**: Users can only send messages as 'user'
```sql
CREATE POLICY "Users can send messages"
  ON admin_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND 
    sender_type = 'user'
  );
```

**Admin Insert**: Admins can send messages as 'admin'
```sql
CREATE POLICY "Admins can send messages"
  ON admin_messages FOR INSERT
  WITH CHECK (
    sender_type = 'admin' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### Storage Bucket

**Read**: Public (all users can view media)
**Write**: Authenticated users only
**Path**: Enforced via client-side naming `admin-chat/{user_id}_{timestamp}`

## Troubleshooting

### Messages Not Appearing in Real-Time

**Symptoms**: User sends message but doesn't see it until refresh

**Solutions**:
1. Check Supabase real-time is enabled for the table
2. Verify subscription is active: `console.log('📡 Subscription status:', status)`
3. Check duplicate prevention isn't filtering legitimate messages
4. Ensure message is inserted successfully (no SQL errors)

**Debug Code**:
```typescript
const channel = supabase
  .channel(`admin-messages-${user.id}`)
  .on('postgres_changes', {...}, (payload) => {
    console.log('📩 New message received:', payload);
    // Check if this logs when message sent
  })
  .subscribe((status) => {
    console.log('📡 Subscription status:', status);
    // Should show 'SUBSCRIBED'
  });
```

### Media Upload Failing

**Symptoms**: Upload spinner shows but media doesn't send

**Solutions**:
1. Check `chat-media` bucket exists in Supabase Storage
2. Verify bucket is public (for read access)
3. Check file size limits (default 50MB)
4. Verify RLS policies allow authenticated uploads

**Debug Code**:
```typescript
const uploadMedia = async (file: MediaAttachment) => {
  try {
    console.log('📤 Uploading:', file.name);
    const { error } = await supabase.storage
      .from('chat-media')
      .upload(filePath, blob);
    
    if (error) {
      console.error('❌ Upload error:', error);
      return null;
    }
    
    console.log('✅ Upload success');
    return url;
  } catch (e) {
    console.error('❌ Upload exception:', e);
    return null;
  }
};
```

### Permissions Denied

**Symptoms**: ImagePicker or DocumentPicker fails silently

**Solutions**:
1. Check `app.json` has camera roll permissions
2. Request permissions explicitly before opening picker
3. Handle permission denial gracefully with Alert

**Required in app.json**:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow Akora to access your photos to share in chat"
        }
      ]
    ]
  }
}
```

### Admin Can't See User Messages

**Symptoms**: Admin messages list is empty but users sent messages

**Solutions**:
1. Check admin profile has `role = 'admin'` in database
2. Verify RLS policies allow admin SELECT on admin_messages
3. Check admin_conversations trigger is creating conversation records

**Debug Query**:
```sql
-- Check admin role
SELECT id, email, role FROM profiles WHERE id = '{admin_user_id}';

-- Check conversation exists
SELECT * FROM admin_conversations WHERE user_id = '{user_id}';

-- Check messages exist
SELECT * FROM admin_messages WHERE user_id = '{user_id}';
```

### ScrollView Not Scrolling to Bottom

**Symptoms**: New messages appear but user has to manually scroll

**Solutions**:
1. Add timeout to allow render: `setTimeout(() => scrollViewRef.current?.scrollToEnd(), 100)`
2. Call after state update in subscription callback
3. Use `animated: true` for smooth scroll

```typescript
setMessages(prev => [...prev, newMsg]);
setTimeout(() => {
  scrollViewRef.current?.scrollToEnd({ animated: true });
}, 100);
```

## Testing Checklist

### User Side Testing
- [ ] Tap "Send us a Message" from Secretariat
- [ ] Screen opens without crashing
- [ ] Send text message - appears instantly
- [ ] Tap paperclip - attach menu shows
- [ ] Select Photo - picker opens
- [ ] Choose image - preview shows
- [ ] Tap send - image uploads and displays
- [ ] Tap paperclip - attach menu shows
- [ ] Select Document - picker opens
- [ ] Choose PDF - preview shows
- [ ] Tap send - document uploads and displays with icon
- [ ] Admin sends message - appears instantly without refresh
- [ ] Date separators show correctly (Today, Yesterday)
- [ ] Time stamps show in 12-hour format
- [ ] Messages scroll to bottom automatically
- [ ] "Support Team" badge shows on admin messages

### Admin Side Testing
- [ ] Navigate to `/admin/messages`
- [ ] Conversations list shows all user chats
- [ ] Unread badge shows correct count
- [ ] Tap conversation - individual chat opens
- [ ] User's name and email show in header
- [ ] Send reply - user receives instantly
- [ ] Images from user display correctly
- [ ] Documents from user show with icon
- [ ] Mark as read updates unread count
- [ ] Real-time: new user message appears without refresh

### Performance Testing
- [ ] Upload large image (5MB+) - shows progress
- [ ] Send 20+ messages - scrolling remains smooth
- [ ] Multiple users messaging simultaneously - no conflicts
- [ ] Background/foreground app - subscription reconnects
- [ ] Poor network - shows retry or error state

## Performance Optimization

### Message Loading
- Initial load: Fetch last 50 messages
- Pagination: Load older messages on scroll to top
- Indexes: Created on `user_id` and `created_at` columns

### Media Optimization
- Images: Compressed to 80% quality before upload
- Thumbnails: Consider generating on server for faster load
- Lazy loading: Only load media when message visible

### Real-Time Efficiency
- One subscription per user (not per message)
- Duplicate prevention: Check message ID before adding
- Cleanup: Unsubscribe on unmount with `removeChannel()`

## Future Enhancements

### Planned Features
1. **Voice Messages**: Add audio recording and playback
2. **Typing Indicators**: Show when admin is typing
3. **Message Reactions**: Emoji reactions to messages
4. **File Preview**: Full-screen image viewer, PDF reader
5. **Search**: Search messages by keyword
6. **Conversation Archive**: Archive resolved conversations
7. **Canned Responses**: Pre-written admin replies
8. **Notifications**: Push notifications for new messages
9. **Read Receipts**: Show when admin read user message
10. **Message Editing**: Edit sent messages within 5 minutes

### Technical Improvements
1. **Offline Support**: Queue messages when offline, send when online
2. **End-to-End Encryption**: Encrypt messages at rest and in transit
3. **Message Deletion**: Allow users to delete their messages
4. **Admin Notes**: Internal notes visible only to admins
5. **Conversation Tags**: Tag conversations (Urgent, Resolved, etc.)

## File Structure

```
app/
├── admin-chat/
│   └── index.tsx              # User chat screen
├── admin/
│   ├── contact-settings.tsx   # Admin contact settings form
│   └── messages/
│       ├── index.tsx          # Admin conversations list
│       └── [userId].tsx       # Admin individual chat
└── secretariat/
    └── index.tsx              # Entry point with "Send us a Message" button

SQL/
├── CREATE_APP_CONTACT_SETTINGS_TABLE.sql
├── CREATE_ADMIN_MESSAGES_TABLE.sql
└── ADD_MEDIA_TO_ADMIN_MESSAGES.sql
```

## Related Documentation
- [CUSTOMER_CARE_CENTER.md](./CUSTOMER_CARE_CENTER.md) - Contact settings system
- [CONTACT_SETTINGS_ADMIN_GUIDE.md](./CONTACT_SETTINGS_ADMIN_GUIDE.md) - Admin guide
- [ADMIN_PROFILES_COMPLETE.md](./ADMIN_PROFILES_COMPLETE.md) - Admin access control

## Support
For issues or questions about the admin chat system:
1. Check console logs for errors
2. Review this guide's troubleshooting section
3. Verify database migrations are applied
4. Check Supabase real-time is enabled
5. Verify storage bucket permissions

Last updated: January 2025
