import { supabase } from './supabase';

export type ChatTarget = { peerUserId?: string; groupId?: string };

export type UserChatSetting = {
  id: string;
  user_id: string;
  peer_user_id: string | null;
  group_id: string | null;
  pinned: boolean;
  muted_until: string | null;
  archived_at: string | null;
  last_read_at: string | null;
  created_at: string;
  updated_at: string;
};

function validateTarget(target: ChatTarget) {
  if ((!!target.peerUserId && !!target.groupId) || (!target.peerUserId && !target.groupId)) {
    throw new Error('Must provide exactly one of peerUserId or groupId');
  }
}

export async function getSettingsForUser(userId: string): Promise<UserChatSetting[]> {
  const { data, error } = await supabase
    .from('user_chat_settings')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data as UserChatSetting[];
}

export async function getSetting(userId: string, target: ChatTarget): Promise<UserChatSetting | null> {
  validateTarget(target);
  let query = supabase.from('user_chat_settings').select('*').eq('user_id', userId).limit(1);
  if (target.peerUserId) query = query.eq('peer_user_id', target.peerUserId);
  if (target.groupId) query = query.eq('group_id', target.groupId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as UserChatSetting | null;
}

export async function upsertSetting(userId: string, target: ChatTarget, patch: Partial<UserChatSetting>): Promise<UserChatSetting> {
  validateTarget(target);
  // Manual upsert to avoid on_conflict issues with partial unique indexes
  const existing = await getSetting(userId, target);
  const base: any = {
    pinned: patch.pinned,
    muted_until: patch.muted_until,
    archived_at: patch.archived_at,
    last_read_at: patch.last_read_at,
  };
  if (existing) {
    const { data, error } = await supabase
      .from('user_chat_settings')
      .update(base)
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw error;
    return data as UserChatSetting;
  } else {
    const insertPayload: any = {
      user_id: userId,
      peer_user_id: target.peerUserId ?? null,
      group_id: target.groupId ?? null,
      pinned: base.pinned ?? false,
      muted_until: base.muted_until ?? null,
      archived_at: base.archived_at ?? null,
      last_read_at: base.last_read_at ?? null,
    };
    const { data, error } = await supabase
      .from('user_chat_settings')
      .insert(insertPayload)
      .select('*')
      .single();
    if (error) throw error;
    return data as UserChatSetting;
  }
}

export async function pinChat(userId: string, target: ChatTarget, pinned = true) {
  return upsertSetting(userId, target, { pinned });
}

export async function markDirectConversationRead(userId: string, peerUserId: string) {
  // Mark all incoming messages as read
  const { error } = await supabase
    .from('direct_messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('receiver_id', userId)
    .eq('sender_id', peerUserId)
    .eq('is_read', false);
  if (error && error.code !== '42703') { // tolerate if read_at column not present yet
    throw error;
  }
}

export async function markGroupConversationRead(groupId: string, userId: string) {
  await supabase.rpc('mark_group_messages_read', { p_group_id: groupId, p_user_id: userId });
}
