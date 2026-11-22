export interface SyncEventPayload {
  id: string;
  type: string;
  data: unknown;
  timestamp: string;
}

type Subscriber = (event: SyncEventPayload) => void;

const globalForPubSub = globalThis as unknown as {
  __nilasSseSubscribers?: Set<Subscriber>;
  __nilasRecentEvents?: SyncEventPayload[];
};

const subscribers =
  globalForPubSub.__nilasSseSubscribers ||
  (globalForPubSub.__nilasSseSubscribers = new Set<Subscriber>());

const recentEvents =
  globalForPubSub.__nilasRecentEvents ||
  (globalForPubSub.__nilasRecentEvents = []);

/**
 * Broadcast real-time domain events to connected SSE clients (and optionally Redis Pub/Sub if REDIS_URL is enabled).
 */
export function publishRealtimeEvent(type: string, data: unknown): SyncEventPayload {
  const payload: SyncEventPayload = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    data,
    timestamp: new Date().toISOString(),
  };

  recentEvents.unshift(payload);
  if (recentEvents.length > 50) {
    recentEvents.length = 50;
  }

  for (const listener of subscribers) {
    try {
      listener(payload);
    } catch {
      // Ignore closed client stream errors
    }
  }

  return payload;
}

export function subscribeRealtimeEvents(listener: Subscriber): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

export function getRecentRealtimeEvents(limit = 15): SyncEventPayload[] {
  return recentEvents.slice(0, limit);
}
