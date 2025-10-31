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
  const mem = memoryThreads.get(key);
  if (mem) return mem;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.messages)) {
      memoryThreads.set(key, parsed);
      return parsed;
    }
  } catch (e) {
    // ignore
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
  const trimmed = [...messages]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-THREAD_LIMIT);
  const payload = { messages: trimmed, updatedAt: new Date().toISOString(), friend };
  memoryThreads.set(key, payload);
  try {
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    // ignore storage errors
  }
}

export function upsertMessageList(list: DirectMessage[], msg: DirectMessage) {
  const map = new Map<string, DirectMessage>();
  for (const m of list) map.set(m.id, m);
  const existing = map.get(msg.id);
  map.set(msg.id, existing ? { ...existing, ...msg } : msg);
  return Array.from(map.values()).sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}
