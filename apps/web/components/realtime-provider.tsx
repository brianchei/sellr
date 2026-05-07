'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchRealtimeToken, type ApiMessage } from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import {
  applyIncomingMessage,
  invalidateNotificationActivity,
} from '@/lib/query-refresh';

type IncomingMessageEvent = {
  conversationId: string;
  message: ApiMessage;
};

function isIncomingMessage(value: unknown): value is IncomingMessageEvent {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.conversationId !== 'string') return false;
  const m = v.message;
  return (
    typeof m === 'object' &&
    m !== null &&
    typeof (m as Record<string, unknown>).id === 'string'
  );
}

export function RealtimeProvider() {
  const queryClient = useQueryClient();
  const { hydrated, isAuthenticated, userId } = useAuth();

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !userId) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    async function connect() {
      try {
        const { token } = await fetchRealtimeToken();
        if (cancelled) return;
        const socket = connectSocket(token);

        const handleMessage = (payload: unknown) => {
          if (!isIncomingMessage(payload)) return;
          const knownConversation = applyIncomingMessage(queryClient, payload);
          if (!knownConversation) {
            void queryClient.invalidateQueries({ queryKey: ['conversations'] });
          }
          if (payload.message.senderId !== userId) {
            void invalidateNotificationActivity(queryClient);
          }
        };

        const handleReconnect = async () => {
          try {
            const fresh = await fetchRealtimeToken();
            socket.auth = { token: fresh.token };
          } catch {
            // Reconnect attempts will keep using the stale token; if it has
            // expired the next handshake will fail and Socket.IO will retry.
          }
        };

        socket.on('message:new', handleMessage);
        socket.io.on('reconnect_attempt', handleReconnect);

        cleanup = () => {
          socket.off('message:new', handleMessage);
          socket.io.off('reconnect_attempt', handleReconnect);
        };
      } catch {
        // Realtime is best-effort; polling fallbacks remain in place.
      }
    }

    void connect();

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
      disconnectSocket();
    };
  }, [hydrated, isAuthenticated, queryClient, userId]);

  return null;
}
