import { prisma } from './prisma';
import type { JWTPayload } from '../middleware/auth';

export async function buildUserJwtPayload(userId: string): Promise<JWTPayload> {
  const rows = await prisma.communityMember.findMany({
    where: { userId, status: 'active' },
    select: { communityId: true, role: true },
  });
  const communityIds = rows.map((r) => r.communityId);
  const role: Record<string, string> = {};
  for (const r of rows) {
    role[r.communityId] = r.role;
  }
  return { sub: userId, communityIds, role };
}
