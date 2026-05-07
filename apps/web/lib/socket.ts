'use client';

import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

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

export function connectSocket(token: string): Socket {
  if (socket && socket.connected) {
    socket.auth = { token };
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(resolveRealtimeUrl(), {
    transports: ['websocket'],
    auth: { token },
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    autoConnect: true,
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
