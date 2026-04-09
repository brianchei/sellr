import type { FastifyInstance } from 'fastify';
import type { JWTPayload } from '../middleware/auth';
import { buildUserJwtPayload } from './memberships';

function accessTtlSec(): number {
  return Number.parseInt(process.env.JWT_ACCESS_TOKEN_TTL ?? '900', 10);
}

function refreshTtlSec(): number {
  return Number.parseInt(process.env.JWT_REFRESH_TOKEN_TTL ?? '2592000', 10);
}

export async function issueTokenPair(
  fastify: FastifyInstance,
  userId: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const payload = await buildUserJwtPayload(userId);
  const accessToken = fastify.jwt.sign(payload, { expiresIn: accessTtlSec() });
  const refreshToken = fastify.jwt.sign(
    { sub: userId, typ: 'refresh' } as unknown as JWTPayload,
    { expiresIn: refreshTtlSec() },
  );
  return { accessToken, refreshToken };
}

export async function refreshAccessToken(
  fastify: FastifyInstance,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const decoded = fastify.jwt.verify<{ sub: string; typ?: string }>(
    refreshToken,
  );
  if (decoded.typ !== 'refresh' || !decoded.sub) {
    throw Object.assign(new Error('Invalid refresh token'), {
      statusCode: 401,
    });
  }
  return issueTokenPair(fastify, decoded.sub);
}
