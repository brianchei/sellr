import type { FastifyRequest, FastifyReply } from 'fastify';
import { SELLR_ACCESS_COOKIE } from '../lib/authCookies';

export interface JWTPayload {
  sub: string;
  communityIds: string[];
  role: Record<string, string>;
  typ?: 'refresh';
  iat?: number;
  exp?: number;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
  }
}

function bearerToken(request: FastifyRequest): string | undefined {
  const h = request.headers.authorization;
  if (typeof h === 'string' && h.startsWith('Bearer ')) {
    return h.slice(7);
  }
  return undefined;
}

function accessTokenFromCookie(request: FastifyRequest): string | undefined {
  const raw = request.cookies[SELLR_ACCESS_COOKIE];
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

export async function verifyJWT(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token = bearerToken(request) ?? accessTokenFromCookie(request);
  if (!token) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
  try {
    const payload = request.server.jwt.verify<JWTPayload>(token);
    request.user = payload;
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}

export function requireCommunityMembership(
  request: FastifyRequest<{ Params: { communityId?: string } }>,
  reply: FastifyReply,
): void {
  const body = request.body as { communityId?: string };
  const communityId = request.params.communityId ?? body.communityId;

  if (!communityId) return;

  const isMember = request.user.communityIds.includes(communityId);
  if (!isMember) {
    reply.code(403).send({ error: 'Not a member of this community' });
  }
}
