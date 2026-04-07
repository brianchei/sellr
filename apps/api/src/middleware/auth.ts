import type { FastifyRequest, FastifyReply } from 'fastify';

export interface JWTPayload {
  sub: string;
  communityIds: string[];
  role: Record<string, string>;
  iat: number;
  exp: number;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
  }
}

export async function verifyJWT(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

export async function requireCommunityMembership(
  request: FastifyRequest<{ Params?: { communityId?: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const communityId =
    request.params?.communityId ??
    (request.body as { communityId?: string })?.communityId;

  if (!communityId) return;

  const isMember = request.user.communityIds.includes(communityId);
  if (!isMember) {
    reply.code(403).send({ error: 'Not a member of this community' });
  }
}
