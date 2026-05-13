import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  getProfileCompletionIssues,
  type ProfileCompletionIssue,
} from '@sellr/shared';
import { prisma } from './prisma';

const PROFILE_COMPLETION_MESSAGES: Record<ProfileCompletionIssue, string> = {
  display_name: 'Add your real display name before posting or contacting.',
  verified_contact: 'Verify your email or phone before posting or contacting.',
  community_membership: 'Join a community before posting or contacting.',
};

export async function requireHighIntentProfile(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    select: {
      displayName: true,
      emailVerifiedAt: true,
      phoneE164: true,
      verifiedAt: true,
    },
  });

  if (!user) {
    reply.code(404).send({ error: 'User not found' });
    return false;
  }

  const issues = getProfileCompletionIssues({
    ...user,
    communityIds: request.user.communityIds,
  });

  if (issues.length === 0) {
    return true;
  }

  reply.code(403).send({
    error: 'Complete your profile before posting or contacting.',
    code: 'PROFILE_COMPLETION_REQUIRED',
    issues,
    message: PROFILE_COMPLETION_MESSAGES[issues[0]],
  });
  return false;
}
