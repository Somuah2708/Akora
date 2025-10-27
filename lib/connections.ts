import { supabase, type Profile } from './supabase';

export type ConnectionStatus = 'pending' | 'accepted' | 'rejected';

export interface Connection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
  requester?: Profile;
  addressee?: Profile;
}

/**
 * Search for users by name or username
 */
export async function searchUsers(query: string, currentUserId?: string): Promise<Profile[]> {
  try {
    let queryBuilder = supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(20);

    // Exclude current user from results
    if (currentUserId) {
      queryBuilder = queryBuilder.neq('id', currentUserId);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

/**
 * Send a connection request to another user
 */
export async function sendConnectionRequest(
  requesterId: string,
  addresseeId: string
): Promise<Connection | null> {
  try {
    // Check if connection already exists
    const { data: existing } = await supabase
      .from('connections')
      .select('*')
      .or(
        `and(requester_id.eq.${requesterId},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${requesterId})`
      )
      .single();

    if (existing) {
      throw new Error('Connection request already exists');
    }

    const { data, error } = await supabase
      .from('connections')
      .insert({
        requester_id: requesterId,
        addressee_id: addresseeId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error sending connection request:', error);
    throw error;
  }
}

/**
 * Accept a connection request
 */
export async function acceptConnectionRequest(connectionId: string): Promise<Connection | null> {
  try {
    const { data, error } = await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('id', connectionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error accepting connection:', error);
    throw error;
  }
}

/**
 * Reject a connection request
 */
export async function rejectConnectionRequest(connectionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('connections')
      .update({ status: 'rejected' })
      .eq('id', connectionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error rejecting connection:', error);
    throw error;
  }
}

/**
 * Cancel a sent connection request
 */
export async function cancelConnectionRequest(connectionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error canceling connection:', error);
    throw error;
  }
}

/**
 * Fetch pending connection requests for a user (received requests)
 */
export async function fetchPendingRequests(userId: string): Promise<Connection[]> {
  try {
    const { data, error } = await supabase
      .from('connections')
      .select('*, requester:profiles!connections_requester_id_fkey(id, username, full_name, avatar_url)')
      .eq('addressee_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    return [];
  }
}

/**
 * Fetch sent connection requests (requests user has sent)
 */
export async function fetchSentRequests(userId: string): Promise<Connection[]> {
  try {
    const { data, error } = await supabase
      .from('connections')
      .select('*, addressee:profiles!connections_addressee_id_fkey(id, username, full_name, avatar_url)')
      .eq('requester_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching sent requests:', error);
    return [];
  }
}

/**
 * Fetch all accepted connections for a user
 */
export async function fetchConnections(userId: string): Promise<Profile[]> {
  try {
    const { data, error } = await supabase
      .from('connections')
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(id, username, full_name, avatar_url, bio),
        addressee:profiles!connections_addressee_id_fkey(id, username, full_name, avatar_url, bio)
      `)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Extract the other user's profile
    const connections = (data || []).map((conn: any) => {
      if (conn.requester_id === userId) {
        return conn.addressee;
      } else {
        return conn.requester;
      }
    });

    return connections;
  } catch (error) {
    console.error('Error fetching connections:', error);
    return [];
  }
}

/**
 * Get connection status between two users
 */
export async function getConnectionStatus(
  userId: string,
  otherUserId: string
): Promise<{
  status: ConnectionStatus | null;
  connectionId: string | null;
  isRequester: boolean;
}> {
  try {
    const { data, error } = await supabase
      .from('connections')
      .select('id, status, requester_id')
      .or(
        `and(requester_id.eq.${userId},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${userId})`
      )
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No connection found
        return { status: null, connectionId: null, isRequester: false };
      }
      throw error;
    }

    return {
      status: data.status as ConnectionStatus,
      connectionId: data.id,
      isRequester: data.requester_id === userId,
    };
  } catch (error) {
    console.error('Error getting connection status:', error);
    return { status: null, connectionId: null, isRequester: false };
  }
}

/**
 * Check if two users are connected
 */
export async function areUsersConnected(userId: string, otherUserId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('connections')
      .select('id')
      .eq('status', 'accepted')
      .or(
        `and(requester_id.eq.${userId},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${userId})`
      )
      .single();

    if (error) {
      if (error.code === 'PGRST116') return false;
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking connection:', error);
    return false;
  }
}

/**
 * Get count of pending connection requests
 */
export async function getPendingRequestsCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('connections')
      .select('*', { count: 'exact', head: true })
      .eq('addressee_id', userId)
      .eq('status', 'pending');

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting pending requests count:', error);
    return 0;
  }
}
