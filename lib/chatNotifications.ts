import { supabase } from './supabase';

/**
 * Send push notification for new chat message
 */
export async function sendChatMessageNotification(
  senderId: string,
  receiverId: string,
  message: string,
  messageType: 'text' | 'image' | 'video' | 'voice' | 'document' | 'post' = 'text'
): Promise<void> {
  try {
    console.log('🔔 [PUSH] Starting notification process...');
    console.log('🔔 [PUSH] Sender:', senderId, 'Receiver:', receiverId);
    
    // CRITICAL: Don't send notification if sender and receiver are the same
    if (senderId === receiverId) {
      console.log('⚠️ [PUSH] Sender and receiver are the same, skipping notification');
      return;
    }

    // Get sender info
    const { data: sender } = await supabase
      .from('profiles')
      .select('full_name, username, avatar_url')
      .eq('id', senderId)
      .single();

    if (!sender) {
      console.log('⚠️ [PUSH] Sender not found');
      return;
    }
    
    console.log('✅ [PUSH] Sender found:', sender.full_name || sender.username);

    // Get receiver's push tokens - EXPLICITLY exclude sender's tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('push_notification_tokens')
      .select('token, user_id')
      .eq('user_id', receiverId)
      .eq('is_active', true);

    console.log('🔍 [PUSH] Token query for receiver:', receiverId);
    console.log('🔍 [PUSH] Sender ID (should NOT receive):', senderId);
    console.log('🔍 [PUSH] Raw tokens from DB:', JSON.stringify(tokens));
    console.log('🔍 [PUSH] Token error:', tokenError);
    
    // CRITICAL: Filter to ONLY include receiver's tokens, exclude any sender tokens
    const receiverOnlyTokens = (tokens || []).filter(t => {
      const isReceiver = t.user_id === receiverId;
      const isNotSender = t.user_id !== senderId;
      console.log(`🔍 [PUSH] Token check: user_id=${t.user_id}, isReceiver=${isReceiver}, isNotSender=${isNotSender}`);
      return isReceiver && isNotSender;
    });
    
    console.log('🔍 [PUSH] Receiver-only tokens after filtering:', receiverOnlyTokens.length);
    console.log('🔍 [PUSH] Token values to send to:', receiverOnlyTokens.map(t => t.token.substring(0, 20) + '...'));

    if (receiverOnlyTokens.length === 0) {
      console.log('❌ [PUSH] No active push tokens found for receiver:', receiverId);
      return;
    }
    
    console.log('✅ [PUSH] Found', receiverOnlyTokens.length, 'token(s) for receiver only');

    // Format notification body based on message type
    let notificationBody = message;
    if (messageType === 'image') {
      notificationBody = '📷 Photo';
    } else if (messageType === 'video') {
      notificationBody = '🎥 Video';
    } else if (messageType === 'voice') {
      notificationBody = '🎤 Voice message';
    } else if (messageType === 'document') {
      notificationBody = '📄 Document';
    } else if (messageType === 'post') {
      notificationBody = '📝 Shared a post';
    }

    // Truncate long messages
    if (notificationBody.length > 100) {
      notificationBody = notificationBody.substring(0, 97) + '...';
    }

    console.log('📤 [PUSH] Calling Edge Function with:', {
      tokenCount: receiverOnlyTokens.length,
      title: sender.full_name || sender.username,
      body: notificationBody.substring(0, 50)
    });

    // Send push notification via Supabase Edge Function
    const { data: functionData, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        pushTokens: receiverOnlyTokens.map(t => t.token),
        title: sender.full_name || sender.username,
        body: notificationBody,
        data: {
          type: 'new_message',
          senderId: senderId,
          receiverId: receiverId,
          messageType: messageType,
          screen: 'chat',
          chatId: senderId,
        },
        badge: 1,
        sound: 'default',
        priority: 'high',
      },
    });

    console.log('📥 [PUSH] Edge Function response:', { data: functionData, error });

    if (error) {
      console.error('❌ [PUSH] Error sending push notification:', error);
    } else {
      console.log('✅ [PUSH] Push notification sent successfully!');
    }
  } catch (error) {
    console.error('❌ [PUSH] Error in sendChatMessageNotification:', error);
  }
}

/**
 * Send push notification for new group message
 */
export async function sendGroupMessageNotification(
  senderId: string,
  groupId: string,
  message: string,
  messageType: 'text' | 'image' | 'video' | 'voice' | 'document' = 'text'
): Promise<void> {
  try {
    // Get sender info
    const { data: sender } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', senderId)
      .single();

    if (!sender) return;

    // Get group info
    const { data: group } = await supabase
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .single();

    if (!group) return;

    // Get all group members except sender
    const { data: members } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .neq('user_id', senderId);

    if (!members || members.length === 0) return;

    const memberIds = members.map(m => m.user_id);

    // Get push tokens for all members
    const { data: tokens } = await supabase
      .from('push_notification_tokens')
      .select('token')
      .in('user_id', memberIds)
      .eq('is_active', true);

    if (!tokens || tokens.length === 0) return;

    // Format notification body
    let notificationBody = `${sender.full_name || sender.username}: `;
    if (messageType === 'image') {
      notificationBody += '📷 Photo';
    } else if (messageType === 'video') {
      notificationBody += '🎥 Video';
    } else if (messageType === 'voice') {
      notificationBody += '🎤 Voice message';
    } else if (messageType === 'document') {
      notificationBody += '📄 Document';
    } else {
      notificationBody += message;
    }

    // Truncate long messages
    if (notificationBody.length > 100) {
      notificationBody = notificationBody.substring(0, 97) + '...';
    }

    // Send push notification
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        pushTokens: tokens.map(t => t.token),
        title: group.name,
        body: notificationBody,
        data: {
          type: 'new_group_message',
          senderId: senderId,
          groupId: groupId,
          messageType: messageType,
          screen: 'group-chat',
          chatId: groupId,
        },
        badge: 1,
        sound: 'default',
        priority: 'high',
      },
    });

    if (error) {
      console.error('Error sending group push notification:', error);
    }
  } catch (error) {
    console.error('Error in sendGroupMessageNotification:', error);
  }
}

/**
 * Send push notification for new friend request
 */
export async function sendFriendRequestNotification(
  senderId: string,
  receiverId: string
): Promise<void> {
  try {
    console.log('🔔 [PUSH] Starting friend request notification...');
    console.log('🔔 [PUSH] Sender:', senderId, 'Receiver:', receiverId);

    // Get sender info
    const { data: sender } = await supabase
      .from('profiles')
      .select('full_name, username, avatar_url')
      .eq('id', senderId)
      .single();

    if (!sender) {
      console.log('⚠️ [PUSH] Sender not found');
      return;
    }

    console.log('✅ [PUSH] Sender found:', sender.full_name || sender.username);

    // Get receiver's push tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('push_notification_tokens')
      .select('token')
      .eq('user_id', receiverId)
      .eq('is_active', true);

    console.log('🔍 [PUSH] Token query result:', { tokens, tokenError, count: tokens?.length });

    if (!tokens || tokens.length === 0) {
      console.log('❌ [PUSH] No active push tokens found for receiver:', receiverId);
      return;
    }

    console.log('✅ [PUSH] Found', tokens.length, 'token(s) for receiver');

    const senderName = sender.full_name || sender.username;

    console.log('📤 [PUSH] Calling Edge Function for friend request');

    // Send push notification via Supabase Edge Function
    const { data: functionData, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        pushTokens: tokens.map(t => t.token),
        title: 'New Friend Request',
        body: `${senderName} sent you a friend request`,
        data: {
          type: 'friend_request',
          senderId: senderId,
          receiverId: receiverId,
          screen: 'friends',
        },
        badge: 1,
        sound: 'default',
        priority: 'high',
      },
    });

    console.log('📥 [PUSH] Edge Function response:', { data: functionData, error });

    if (error) {
      console.error('❌ [PUSH] Error sending friend request notification:', error);
    } else {
      console.log('✅ [PUSH] Friend request notification sent successfully!');
    }
  } catch (error) {
    console.error('❌ [PUSH] Error in sendFriendRequestNotification:', error);
  }
}
