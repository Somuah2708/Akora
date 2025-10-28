import { supabase } from './supabase';

// Types
export type FriendRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  receiver?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
};

export type Friend = {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  friend?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
    bio?: string;
  };
};

export type DirectMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
  sender?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
};

export type Group = {
  id: string;
  name: string;
  avatar_url?: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  user?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
};

export type GroupMessage = {
  id: string;
  group_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
};

// Friend Requests
export async function searchUsers(query: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, bio')
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(20);

  if (error) throw error;
  return data;
}

export async function sendFriendRequest(receiverId: string, senderId: string) {
  const { data, error } = await supabase
    .from('friend_requests')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPendingFriendRequests(userId: string) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select(`
      *,
      sender:sender_id (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as FriendRequest[];
}

export async function getSentFriendRequests(userId: string) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select(`
      *,
      receiver:receiver_id (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('sender_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as FriendRequest[];
}

export async function acceptFriendRequest(requestId: string) {
  const { error } = await supabase.rpc('accept_friend_request', {
    request_id: requestId,
  });

  if (error) throw error;
}

export async function rejectFriendRequest(requestId: string) {
  const { error } = await supabase.rpc('reject_friend_request', {
    request_id: requestId,
  });

  if (error) throw error;
}

export async function checkFriendshipStatus(userId: string, otherUserId: string) {
  // Check if they're friends
  const { data: friendship } = await supabase
    .from('friends')
    .select('id')
    .eq('user_id', userId)
    .eq('friend_id', otherUserId)
    .single();

  if (friendship) return 'friends';

  // Check if there's a pending request
  const { data: pendingRequest } = await supabase
    .from('friend_requests')
    .select('id, sender_id, receiver_id')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .eq('status', 'pending')
    .single();

  if (pendingRequest) {
    return pendingRequest.sender_id === userId ? 'request_sent' : 'request_received';
  }

  return 'none';
}

// Friends
export async function getFriends(userId: string) {
  const { data, error } = await supabase
    .from('friends')
    .select(`
      *,
      friend:friend_id (
        id,
        username,
        full_name,
        avatar_url,
        bio
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Friend[];
}

export async function unfriend(friendUserId: string) {
  const { error } = await supabase.rpc('unfriend', {
    friend_user_id: friendUserId,
  });

  if (error) throw error;
}

// Direct Messages
export async function getDirectMessages(userId: string, friendId: string) {
  const { data, error } = await supabase
    .from('direct_messages')
    .select(`
      *,
      sender:sender_id (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as DirectMessage[];
}

export async function sendDirectMessage(senderId: string, receiverId: string, message: string) {
  const { data, error } = await supabase
    .from('direct_messages')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      message,
    })
    .select(`
      *,
      sender:sender_id (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .single();

  if (error) throw error;
  return data as DirectMessage;
}

export async function markMessageAsRead(messageId: string) {
  const { error } = await supabase
    .from('direct_messages')
    .update({ is_read: true })
    .eq('id', messageId);

  if (error) throw error;
}

export async function getUnreadMessageCount(userId: string) {
  const { count, error } = await supabase
    .from('direct_messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
}

// Subscribe to new direct messages
export function subscribeToDirectMessages(userId: string, friendId: string, callback: (message: DirectMessage) => void) {
  const channel = supabase
    .channel(`direct_messages:${userId}:${friendId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `sender_id=eq.${friendId}`,
      },
      async (payload) => {
        // Fetch full message with sender info
        const { data } = await supabase
          .from('direct_messages')
          .select(`
            *,
            sender:sender_id (
              id,
              username,
              full_name,
              avatar_url
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          callback(data as DirectMessage);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Groups
export async function createGroup(name: string, description: string, createdBy: string, memberIds: string[]) {
  // Create group
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      name,
      description,
      created_by: createdBy,
    })
    .select()
    .single();

  if (groupError) throw groupError;

  // Add creator as admin
  const members = [
    { group_id: group.id, user_id: createdBy, role: 'admin' },
    ...memberIds.map(id => ({ group_id: group.id, user_id: id, role: 'member' as const })),
  ];

  const { error: membersError } = await supabase
    .from('group_members')
    .insert(members);

  if (membersError) throw membersError;

  return group;
}

export async function getMyGroups(userId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      *,
      group:group_id (
        id,
        name,
        avatar_url,
        description,
        created_by,
        created_at
      )
    `)
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getGroupMembers(groupId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      *,
      user:user_id (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return data as GroupMember[];
}

export async function addGroupMember(groupId: string, userId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .insert({
      group_id: groupId,
      user_id: userId,
      role: 'member',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function leaveGroup(groupId: string, userId: string) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) throw error;
}

// Group Messages
export async function getGroupMessages(groupId: string) {
  const { data, error } = await supabase
    .from('group_messages')
    .select(`
      *,
      sender:sender_id (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as GroupMessage[];
}

export async function sendGroupMessage(groupId: string, senderId: string, message: string) {
  const { data, error } = await supabase
    .from('group_messages')
    .insert({
      group_id: groupId,
      sender_id: senderId,
      message,
    })
    .select(`
      *,
      sender:sender_id (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .single();

  if (error) throw error;
  return data as GroupMessage;
}

// Subscribe to group messages
export function subscribeToGroupMessages(groupId: string, callback: (message: GroupMessage) => void) {
  const channel = supabase
    .channel(`group_messages:${groupId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      },
      async (payload) => {
        // Fetch full message with sender info
        const { data } = await supabase
          .from('group_messages')
          .select(`
            *,
            sender:sender_id (
              id,
              username,
              full_name,
              avatar_url
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          callback(data as GroupMessage);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Get conversation list with latest message
export async function getConversationList(userId: string) {
  // Get all friends
  const { data: friends, error: friendsError } = await supabase
    .from('friends')
    .select(`
      friend_id,
      friend:friend_id (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('user_id', userId);

  if (friendsError) throw friendsError;

  // Get latest message for each friend
  const conversations = await Promise.all(
    (friends || []).map(async ({ friend_id, friend }) => {
      const { data: messages } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${friend_id}),and(sender_id.eq.${friend_id},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: false })
        .limit(1);

      const { count: unreadCount } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', friend_id)
        .eq('receiver_id', userId)
        .eq('is_read', false);

      return {
        friend,
        latestMessage: messages?.[0] || null,
        unreadCount: unreadCount || 0,
      };
    })
  );

  // Sort by latest message
  return conversations.sort((a, b) => {
    if (!a.latestMessage) return 1;
    if (!b.latestMessage) return -1;
    return new Date(b.latestMessage.created_at).getTime() - new Date(a.latestMessage.created_at).getTime();
  });
}

// Get mutual friends count between two users
export async function getMutualFriendsCount(userId1: string, userId2: string): Promise<number> {
  try {
    // Get user1's friends
    const { data: user1Friends, error: error1 } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', userId1);

    if (error1) throw error1;

    // Get user2's friends
    const { data: user2Friends, error: error2 } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', userId2);

    if (error2) throw error2;

    if (!user1Friends || !user2Friends) return 0;

    // Find intersection
    const user1FriendIds = new Set(user1Friends.map(f => f.friend_id));
    const mutualCount = user2Friends.filter(f => user1FriendIds.has(f.friend_id)).length;

    return mutualCount;
  } catch (error) {
    console.error('Error getting mutual friends count:', error);
    return 0;
  }
}
