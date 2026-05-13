import {
  getProfileCompletionIssues,
  type ProfileCompletionIssue,
} from '@sellr/shared';
import type { fetchMe } from '@sellr/api-client';

type MeData = Awaited<ReturnType<typeof fetchMe>>;

export const PROFILE_COMPLETION_COPY: Record<
  ProfileCompletionIssue,
  { title: string; body: string; action: string }
> = {
  display_name: {
    title: 'Add your real display name',
    body: 'Buyers and sellers should know who they are coordinating with before pickup.',
    action: 'Update profile',
  },
  verified_contact: {
    title: 'Verify your email or phone',
    body: 'A verified contact method is required before posting or contacting sellers.',
    action: 'Review sign-in',
  },
  community_membership: {
    title: 'Join a community',
    body: 'Posting and seller contact are only available inside verified communities.',
    action: 'Join community',
  },
};

export function profileCompletionIssues(me: MeData | undefined) {
  if (!me) return [];
  return getProfileCompletionIssues({
    displayName: me.user.displayName,
    emailVerifiedAt: me.user.emailVerifiedAt,
    phoneE164: me.user.phoneE164,
    verifiedAt: me.user.verifiedAt,
    communityIds: me.communityIds,
  });
}

export function isProfileReadyForHighIntentAction(me: MeData | undefined) {
  return profileCompletionIssues(me).length === 0;
}
