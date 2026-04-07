import type { Server } from 'socket.io';

export function initSocketIO(io: Server): void {
  io.on('connection', () => {
    // Phase 1: conversation rooms
  });
}
