import type { Server, Socket } from 'socket.io';
import type { JWTPayload } from '../middleware/auth';
import { logger } from './logger';

type AuthenticatedSocketData = {
  userId: string;
  communityIds: string[];
};

type JwtVerifier = {
  jwt: { verify: (token: string) => JWTPayload };
};

let ioInstance: Server | null = null;

function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function initSocketIO(io: Server, jwtVerifier: JwtVerifier): void {
  ioInstance = io;

  io.use((socket: Socket, next) => {
    const auth = socket.handshake.auth as Record<string, unknown> | undefined;
    const tokenRaw = auth?.token;
    const token = typeof tokenRaw === 'string' ? tokenRaw : undefined;

    if (!token) {
      next(new Error('Unauthorized: missing realtime token'));
      return;
    }

    try {
      const payload = jwtVerifier.jwt.verify(token);
      if (!payload.sub) {
        next(new Error('Unauthorized: invalid token payload'));
        return;
      }
      const data: AuthenticatedSocketData = {
        userId: payload.sub,
        communityIds: payload.communityIds,
      };
      socket.data = data;
      next();
    } catch {
      next(new Error('Unauthorized: invalid realtime token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const data = socket.data as AuthenticatedSocketData | undefined;
    if (!data?.userId) {
      socket.disconnect(true);
      return;
    }

    void socket.join(userRoom(data.userId));
  });
}

export function emitToUsers(
  userIds: string[],
  event: string,
  payload: unknown,
): void {
  if (!ioInstance || userIds.length === 0) return;
  const rooms = userIds.map(userRoom);
  try {
    ioInstance.to(rooms).emit(event, payload);
  } catch (err) {
    logger.error({ err, event }, 'Failed to emit realtime event');
  }
}
