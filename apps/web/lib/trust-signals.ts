import type { ApiUserTrustProfile } from '@sellr/api-client';

type ContactVerificationProfile = Pick<
  ApiUserTrustProfile,
  'emailVerifiedAt' | 'verifiedAt'
> & {
  phoneE164?: string | null;
};

export function activeListingCountLabel(count: number | undefined): string {
  const safeCount = count ?? 0;
  return `${safeCount} active ${safeCount === 1 ? 'listing' : 'listings'}`;
}

export function contactVerificationLabel(
  profile: ContactVerificationProfile | null | undefined,
  unverifiedLabel = 'Needs verification',
): string {
  if (profile?.emailVerifiedAt) {
    return 'Email verified';
  }

  if (profile?.phoneE164 && profile.verifiedAt) {
    return 'Phone verified';
  }

  if (profile?.verifiedAt) {
    return 'Verified contact';
  }

  return unverifiedLabel;
}

export function publicContactVerificationLabel(
  profile: ContactVerificationProfile | null | undefined,
): string | null {
  const label = contactVerificationLabel(profile, '');
  return label.length > 0 ? label : null;
}

export function communityTrustLabel(
  profile: Pick<ApiUserTrustProfile, 'communityMember'> | null | undefined,
): string | null {
  if (!profile || profile.communityMember === false) {
    return null;
  }

  return 'Active community member';
}

export function profilePhotoSignalLabel(
  profile: Pick<ApiUserTrustProfile, 'avatarUrl'> | null | undefined,
): string | null {
  return profile?.avatarUrl ? 'Profile photo added' : null;
}

export function profileSignalSummary(
  profile: ApiUserTrustProfile | null | undefined,
): string {
  if (!profile) {
    return '';
  }

  const signals = [
    publicContactVerificationLabel(profile),
    communityTrustLabel(profile),
    profilePhotoSignalLabel(profile),
    activeListingCountLabel(profile?.listingCount),
  ].filter((signal): signal is string => Boolean(signal));

  return signals.join(' · ');
}
