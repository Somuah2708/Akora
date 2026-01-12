// Lightweight in-app event bus (no external deps)
// Typed events to keep usage safe across screens

type ForumBookmarkChanged = { discussionId: string; saved: boolean };

// Tab refresh events (Instagram-style: tap tab while on it to refresh)
type TabRefresh = { timestamp: number };

type Events = {
  'forum:bookmarkChanged': ForumBookmarkChanged;
  'tab:homeRefresh': TabRefresh;
  'tab:discoverRefresh': TabRefresh;
};

type Handler<T> = (payload: T) => void;

const listeners = new Map<keyof Events, Set<Function>>();

export function on<E extends keyof Events>(event: E, handler: Handler<Events[E]>): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(handler as any);
  return () => off(event, handler);
}

export function off<E extends keyof Events>(event: E, handler: Handler<Events[E]>) {
  const set = listeners.get(event);
  if (!set) return;
  set.delete(handler as any);
}

export function emit<E extends keyof Events>(event: E, payload: Events[E]) {
  const set = listeners.get(event);
  if (!set) return;
  set.forEach((handler) => {
    try {
      (handler as Handler<Events[E]>)(payload);
    } catch (e) {
      // Avoid crashing the emitter if a handler throws
      // eslint-disable-next-line no-console
      console.error('[eventBus] handler error for', String(event), e);
    }
  });
}
