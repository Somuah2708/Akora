import { supabase } from './supabase';
import type { Message, Profile, ChatWithDetails, Chat } from './supabase';

/**
 * Fetch all chats for the current user with participants and latest message
 */
export async function fetchUserChats(userId: string): Promise<ChatWithDetails[]> {
  try {
    // Get all chats the user is part of
    const { data: chatParticipants, error: participantsError } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', userId);

    if (participantsError) throw participantsError;
    if (!chatParticipants || chatParticipants.length === 0) return [];

    const chatIds = chatParticipants.map(cp => cp.chat_id);

    // Get chat details
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .in('id', chatIds)
      .order('updated_at', { ascending: false });

    if (chatsError) throw chatsError;
    if (!chats) return [];

    // Get all participants for these chats
    const { data: allParticipants, error: allParticipantsError } = await supabase
      .from('chat_participants')
      .select(`
        *,
        profiles (*)
      `)
      .in('chat_id', chatIds);

    if (allParticipantsError) throw allParticipantsError;

    // Get latest message for each chat
    const { data: latestMessages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:sender_id (username, full_name)
      `)
      .in('chat_id', chatIds)
      .order('created_at', { ascending: false });

    if (messagesError) throw messagesError;

    // Build chat with details
    const chatsWithDetails: ChatWithDetails[] = await Promise.all(
      chats.map(async (chat) => {
        const participants = allParticipants?.filter(p => p.chat_id === chat.id) || [];
        const chatMessages = latestMessages?.filter(m => m.chat_id === chat.id) || [];
        const lastMessage = chatMessages[0];

        // For direct chats, use other participant's info
        let displayName = chat.name;
        let displayAvatar = chat.avatar_url;

        if (chat.type === 'direct') {
          const otherParticipant = participants.find(p => p.user_id !== userId);
          if (otherParticipant?.profiles) {
            displayName = otherParticipant.profiles.full_name || otherParticipant.profiles.username;
            displayAvatar = otherParticipant.profiles.avatar_url;
          }
        }

        // Get unread count
        const unreadCount = await getUnreadCount(chat.id, userId);

        return {
          ...chat,
          name: displayName,
          avatar_url: displayAvatar,
          participants,
          messages: chatMessages,
          last_message: lastMessage,
          unread_count: unreadCount,
        };
      })
    );

    return chatsWithDetails;
  } catch (error) {
    console.error('Error fetching user chats:', error);
    return [];
  }
}

/**
 * Get or create a direct chat between two users
 */
export async function getOrCreateDirectChat(user1Id: string, user2Id: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_or_create_direct_chat', {
      user1_id: user1Id,
      user2_id: user2Id,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting or creating direct chat:', error);
    return null;
  }
}

/**
 * Create a group chat
 */
export async function createGroupChat(
  name: string,
  participantIds: string[],
  avatarUrl?: string
): Promise<string | null> {
  try {
    // Create the chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        type: 'group',
        name,
        avatar_url: avatarUrl,
      })
      .select()
      .single();

    if (chatError) throw chatError;

    // Add participants
    const participants = participantIds.map(userId => ({
      chat_id: chat.id,
      user_id: userId,
    }));

    const { error: participantsError } = await supabase
      .from('chat_participants')
      .insert(participants);

    if (participantsError) throw participantsError;

    return chat.id;
  } catch (error) {
    console.error('Error creating group chat:', error);
    return null;
  }
}

/**
 * Fetch messages for a specific chat
 */
export async function fetchChatMessages(chatId: string): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id (*)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return [];
  }
}

/**
 * Send a message to a chat
 */
export async function sendMessage(
  chatId: string,
  senderId: string,
  content: string
): Promise<Message | null> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        content,
      })
      .select(`
        *,
        sender:profiles!sender_id (*)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(messageId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true, content: 'This message was deleted' })
      .eq('id', messageId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting message:', error);
    return false;
  }
}

/**
 * Get unread message count for a chat
 */
export async function getUnreadCount(chatId: string, userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_unread_count', {
      p_chat_id: chatId,
      p_user_id: userId,
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

/**
 * Mark chat as read (updates last_read_at)
 */
export async function markChatAsRead(chatId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('mark_chat_as_read', {
      p_chat_id: chatId,
      p_user_id: userId,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking chat as read:', error);
    return false;
  }
}

/**
 * Subscribe to new messages in a chat (real-time)
 */
export function subscribeToMessages(
  chatId: string,
  callback: (message: Message) => void
) {
  const subscription = supabase
    .channel(`messages:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      async (payload) => {
        // Fetch the complete message with sender profile
        const { data } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!sender_id (*)
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          callback(data);
        }
      }
    )
    .subscribe();

  return subscription;
}

/**
 * Search users by username or full name
 */
export async function searchUsers(
  query: string,
  currentUserId: string,
  limit: number = 10
): Promise<Profile[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId)
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

/**
 * Get chat info (name, avatar, participants)
 */
export async function getChatInfo(chatId: string, currentUserId: string) {
  try {
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single();

    if (chatError) throw chatError;

    // Get participants
    const { data: participants, error: participantsError } = await supabase
      .from('chat_participants')
      .select(`
        *,
        profiles (*)
      `)
      .eq('chat_id', chatId);

    if (participantsError) throw participantsError;

    // For direct chats, use other participant's info
    let displayName = chat.name;
    let displayAvatar = chat.avatar_url;

    if (chat.type === 'direct') {
      const otherParticipant = participants?.find(p => p.user_id !== currentUserId);
      if (otherParticipant?.profiles) {
        displayName = otherParticipant.profiles.full_name || otherParticipant.profiles.username;
        displayAvatar = otherParticipant.profiles.avatar_url;
      }
    }

    return {
      ...chat,
      name: displayName,
      avatar_url: displayAvatar,
      participants,
    };
  } catch (error) {
    console.error('Error getting chat info:', error);
    return null;
  }
}

/**
 * Leave a chat (remove participant)
 */
export async function leaveChat(chatId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('chat_participants')
      .delete()
      .eq('chat_id', chatId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error leaving chat:', error);
    return false;
  }
}

/**
 * Add participant to group chat
 */
export async function addParticipant(chatId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('chat_participants')
      .insert({
        chat_id: chatId,
        user_id: userId,
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding participant:', error);
    return false;
  }
}
