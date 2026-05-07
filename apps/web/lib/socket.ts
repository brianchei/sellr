'use client';

import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Resolve the realtime endpoint at runtime. Production deployments typically
 * set `NEXT_PUBLIC_REALTIME_URL` to either a same-origin path (e.g. `/`,
 * served via a reverse proxy that forwards `/socket.io/` to Fastify) or to a
 * dedicated subdomain like `https://api.example.com`. In dev we fall back to
 * the API URL or the default Fastify port.
 */
function resolveRealtimeUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_REALTIME_URL;
  if (explicit) return explicit;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) return apiUrl;
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:3001`;
    }
  }
  return 'http://localhost:3001';
}

/**
 * Optional Socket.IO mount path. Defaults to `/socket.io` (Socket.IO's own
 * default). Set `NEXT_PUBLIC_REALTIME_PATH` when a reverse proxy serves the
 * websocket at a non-default prefix (e.g. `/realtime/socket.io`).
 */
function resolveRealtimePath(): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_REALTIME_PATH;
  return explicit && explicit.length > 0 ? explicit : undefined;
}

export function connectSocket(token: string): Socket {
  if (socket && socket.connected) {
    socket.auth = { token };
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const realtimePath = resolveRealtimePath();
  socket = io(resolveRealtimeUrl(), {
    transports: ['websocket'],
    auth: { token },
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    autoConnect: true,
    ...(realtimePath ? { path: realtimePath } : {}),
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
