import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DirectMessage } from './friends';

// Keep a small in-memory cache for instant access
const memoryThreads = new Map<string, { messages: DirectMessage[]; updatedAt: string; friend?: any }>();
const THREAD_LIMIT = 200; // cap per conversation

export const getThreadKey = (userId: string, friendId: string) => {
  const key = [userId, friendId].sort().join('-');
  return `thread:${key}`;
};

export async function getCachedThread(userId: string, friendId: string) {
  const key = getThreadKey(userId, friendId);
  console.log('📦 [CACHE] Getting cached thread:', key);
  
  const mem = memoryThreads.get(key);
  if (mem) {
    console.log('✅ [CACHE] Found in memory:', mem.messages.length, 'messages');
    return mem;
  }
  
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      console.log('⚠️ [CACHE] No cache found in AsyncStorage');
      return null;
    }
    
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.messages)) {
      console.log('✅ [CACHE] Found in AsyncStorage:', parsed.messages.length, 'messages');
      memoryThreads.set(key, parsed);
      return parsed;
    }
  } catch (e) {
    console.error('❌ [CACHE] Error reading cache:', e);
  }
  return null;
}

export async function setCachedThread(
  userId: string,
  friendId: string,
  messages: DirectMessage[],
  friend?: any
) {
  const key = getThreadKey(userId, friendId);
  console.log('💾 [CACHE] Saving thread:', key, 'with', messages.length, 'messages');
  
  // Sort newest first (descending)
  const sorted = [...messages].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  // Keep only the most recent THREAD_LIMIT messages
  const trimmed = sorted.slice(0, THREAD_LIMIT);
  const payload = { messages: trimmed, updatedAt: new Date().toISOString(), friend };
  memoryThreads.set(key, payload);
  
  console.log('✅ [CACHE] Saved to memory cache');
  
  try {
    await AsyncStorage.setItem(key, JSON.stringify(payload));
    console.log('✅ [CACHE] Saved to AsyncStorage');
  } catch (e) {
    console.error('❌ [CACHE] Error saving to AsyncStorage:', e);
  }
}

export function upsertMessageList(list: DirectMessage[], msg: DirectMessage) {
  const map = new Map<string, DirectMessage>();
  for (const m of list) map.set(m.id, m);
  const existing = map.get(msg.id);
  map.set(msg.id, existing ? { ...existing, ...msg } : msg);
  // Sort newest first (descending) for inverted FlatList
  return Array.from(map.values()).sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
