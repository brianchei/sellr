'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  fetchRealtimeToken,
  type ApiMessage,
} from '@sellr/api-client';
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

/**
 * If `fetchRealtimeToken` fails this many times in a row, we stop trying.
 * Three is enough to ride out a short Fastify restart (re-auth happens on
 * the very next reconnect after Fastify is back up) but small enough to
 * exit promptly when the underlying session is just gone.
 */
const MAX_TOKEN_REFRESH_FAILURES = 3;

function isAuthError(message: string | undefined): boolean {
  return typeof message === 'string' && /unauthorized/i.test(message);
}

export function RealtimeProvider() {
  const queryClient = useQueryClient();
  const { hydrated, isAuthenticated, userId } = useAuth();

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !userId) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;
    let tokenRefreshFailures = 0;

    async function refreshTokenOrBail(): Promise<string | null> {
      try {
        const fresh = await fetchRealtimeToken();
        tokenRefreshFailures = 0;
        return fresh.token;
      } catch (err) {
        // A 401 from `/realtime-token` means the access cookie is gone or
        // expired — the user is effectively logged out from the realtime
        // socket's POV. Skip straight to the bail threshold.
        if (err instanceof ApiError && err.status === 401) {
          tokenRefreshFailures = MAX_TOKEN_REFRESH_FAILURES;
        } else {
          tokenRefreshFailures += 1;
        }
        return null;
      }
    }

    async function connect() {
      const token = await refreshTokenOrBail();
      if (cancelled || !token) return;
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

      const handleReconnectAttempt = async () => {
        if (cancelled) return;
        if (tokenRefreshFailures >= MAX_TOKEN_REFRESH_FAILURES) {
          // Stop retrying; the session is almost certainly invalid.
          socket.disconnect();
          return;
        }
        const fresh = await refreshTokenOrBail();
        if (cancelled) return;
        if (fresh) {
          socket.auth = { token: fresh };
        } else if (tokenRefreshFailures >= MAX_TOKEN_REFRESH_FAILURES) {
          socket.disconnect();
        }
      };

      const handleConnectError = (err: Error) => {
        // Socket.IO surfaces auth-middleware rejections through `connect_error`.
        // If the rejection looks like an auth failure, force a fresh token on
        // the next attempt instead of retrying with the stale one.
        if (isAuthError(err.message)) {
          tokenRefreshFailures = Math.max(tokenRefreshFailures, 1);
        }
      };

      socket.on('message:new', handleMessage);
      socket.on('connect_error', handleConnectError);
      socket.io.on('reconnect_attempt', handleReconnectAttempt);

      cleanup = () => {
        socket.off('message:new', handleMessage);
        socket.off('connect_error', handleConnectError);
        socket.io.off('reconnect_attempt', handleReconnectAttempt);
      };
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
