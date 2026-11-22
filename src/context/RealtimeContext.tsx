'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';

export interface RealtimeEventPayload {
  id?: string;
  type: string;
  data?: unknown;
  timestamp: string | number;
}

type RealtimeListener = (event: RealtimeEventPayload) => void;

interface RealtimeContextValue {
  isLive: boolean;
  broadcast: (type: string, data?: unknown) => void;
  subscribe: (types: string[], listener: RealtimeListener) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

const CHANNEL_NAME = 'nilas_treat_sync';
const STORAGE_SIGNAL_KEY = 'nilas_sync_signal';

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [isLive, setIsLive] = useState(false);
  const listenersRef = useRef<Map<string, Set<RealtimeListener>>>(new Map());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const dispatchEvent = useCallback((event: RealtimeEventPayload) => {
    // 1. Specific listeners
    const specific = listenersRef.current.get(event.type);
    if (specific) {
      specific.forEach((fn) => {
        try {
          fn(event);
        } catch (err) {
          console.warn('[Realtime] Listener error:', err);
        }
      });
    }

    // 2. Wildcard '*' listeners
    const wildcards = listenersRef.current.get('*');
    if (wildcards) {
      wildcards.forEach((fn) => {
        try {
          fn(event);
        } catch (err) {
          console.warn('[Realtime] Wildcard listener error:', err);
        }
      });
    }
  }, []);

  // Broadcast to other tabs & windows
  const broadcast = useCallback(
    (type: string, data?: unknown) => {
      const payload: RealtimeEventPayload = {
        id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        data,
        timestamp: new Date().toISOString(),
      };

      // 1. Dispatch locally
      dispatchEvent(payload);

      // 2. BroadcastChannel to other tabs
      if (channelRef.current) {
        try {
          channelRef.current.postMessage(payload);
        } catch {
          // ignore channel errors
        }
      }

      // 3. LocalStorage event fallback
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            STORAGE_SIGNAL_KEY,
            JSON.stringify({ ...payload, _t: Date.now() })
          );
        } catch {
          // ignore storage quota errors
        }
      }
    },
    [dispatchEvent]
  );

  // Subscribe to specific event types
  const subscribe = useCallback(
    (types: string[], listener: RealtimeListener) => {
      for (const t of types) {
        if (!listenersRef.current.has(t)) {
          listenersRef.current.set(t, new Set());
        }
        listenersRef.current.get(t)!.add(listener);
      }

      return () => {
        for (const t of types) {
          const set = listenersRef.current.get(t);
          if (set) {
            set.delete(listener);
            if (set.size === 0) {
              listenersRef.current.delete(t);
            }
          }
        }
      };
    },
    []
  );

  // Initialize BroadcastChannel & Storage Listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel(CHANNEL_NAME);
        bc.onmessage = (ev) => {
          if (ev.data && typeof ev.data.type === 'string') {
            dispatchEvent(ev.data);
          }
        };
        channelRef.current = bc;
      } catch (err) {
        console.warn('[Realtime] BroadcastChannel unsupported:', err);
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_SIGNAL_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed.type === 'string') {
            dispatchEvent(parsed);
          }
        } catch {
          // ignore JSON parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
    };
  }, [dispatchEvent]);

  const connectSSERef = useRef<() => void>(() => {});

  // Connect to SSE stream
  const connectSSE = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const es = new EventSource('/api/sync/events');
      eventSourceRef.current = es;

      es.onopen = () => {
        retryCountRef.current = 0;
        setIsLive(true);
      };

      es.onmessage = (event) => {
        if (!event.data) return;
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.type) {
            dispatchEvent(parsed);
          }
        } catch {
          // ignore keepalive pings
        }
      };

      es.onerror = () => {
        setIsLive(false);
        if (es.readyState === EventSource.CLOSED) {
          es.close();
          eventSourceRef.current = null;
          // Reconnect with backoff
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10_000);
          retryCountRef.current += 1;
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSSERef.current();
          }, delay);
        }
      };
    } catch (err) {
      console.warn('[Realtime] EventSource error:', err);
      Promise.resolve().then(() => setIsLive(false));
    }
  }, [dispatchEvent]);

  useEffect(() => {
    connectSSERef.current = connectSSE;
  }, [connectSSE]);

  useEffect(() => {
    let unmounted = false;
    Promise.resolve().then(() => {
      if (!unmounted) connectSSERef.current();
    });

    // Reconnect immediately when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
          connectSSERef.current();
        }
      }
    };

    const handleFocus = () => {
      if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
        connectSSERef.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      unmounted = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ isLive, broadcast, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return ctx;
}

export function useRealtimeBroadcast() {
  const { broadcast } = useRealtime();
  return broadcast;
}

/**
 * Hook to subscribe to one or more real-time event types.
 * Safely manages lifecycle and unsubscription.
 */
export function useRealtimeSubscription(
  types: string | string[],
  callback: (event: RealtimeEventPayload) => void
) {
  const { subscribe } = useRealtime();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const typesArray = Array.isArray(types) ? types : [types];
  const typesKey = typesArray.join(',');

  useEffect(() => {
    const list = typesKey.split(',').filter(Boolean);
    if (list.length === 0) return;

    const unsubscribe = subscribe(list, (event) => {
      callbackRef.current(event);
    });

    return unsubscribe;
  }, [typesKey, subscribe]);
}
