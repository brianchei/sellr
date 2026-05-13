import type { ApiCommunityDetail } from '@sellr/api-client';

type CommunityPresentation = {
  eyebrow: string;
  description: string;
  heroBackground: string;
  accessBadgeTone: 'accent' | 'contrast';
  listingHelper: string;
  sellerHelper: string;
  guidanceFallback: string[];
  localAreas: string[];
  trustHighlights: string[];
};

function isBadgerMarket(community: ApiCommunityDetail): boolean {
  const normalizedName = community.name.trim().toLowerCase();
  const normalizedDomain = community.emailDomain?.trim().toLowerCase();
  return (
    normalizedName.includes('badger') ||
    normalizedName.includes('uw-madison') ||
    normalizedDomain === 'wisc.edu'
  );
}

function genericPresentation(
  community: ApiCommunityDetail,
): CommunityPresentation {
  return {
    eyebrow: `${community.type.replaceAll('_', ' ')} community`,
    description:
      'A verified local marketplace for members to browse nearby listings, understand community context, and coordinate pickup with clearer trust signals.',
    heroBackground:
      community.type === 'campus'
        ? 'linear-gradient(135deg, var(--color-brand-primary-soft) 0%, rgba(255,255,255,0.96) 50%, var(--color-brand-contrast-soft) 100%)'
        : 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, var(--color-brand-accent-soft) 46%, var(--color-brand-primary-soft) 100%)',
    accessBadgeTone: 'accent',
    listingHelper: 'Ready for local pickup',
    sellerHelper: 'Members with live listings',
    guidanceFallback: [
      'Keep pickup coordination inside Sellr until details are clear.',
      'Use a recognizable profile and accurate listing photos.',
      'Choose familiar public pickup areas when possible.',
    ],
    localAreas:
      community.type === 'campus'
        ? ['Campus center', 'Student neighborhoods', 'Library or union pickup']
        : ['Neighborhood center', 'Lobby or common area', 'Public pickup spot'],
    trustHighlights: [
      'Verified community access',
      'Member-scoped marketplace',
      'Pickup-first resale',
    ],
  };
}

export function getCommunityPresentation(
  community: ApiCommunityDetail,
): CommunityPresentation {
  if (!isBadgerMarket(community)) {
    return genericPresentation(community);
  }

  return {
    eyebrow: 'Badger Market',
    description:
      'A UW-Madison resale space for students and campus neighbors to trade dorm, apartment, class, and game-day essentials with verified community context.',
    heroBackground:
      'linear-gradient(135deg, var(--color-brand-primary-soft) 0%, rgba(255,255,255,0.96) 38%, rgba(239,118,122,0.15) 68%, var(--color-brand-contrast-soft) 100%)',
    accessBadgeTone: 'contrast',
    listingHelper: 'Dorm, apartment, class, and game-day finds',
    sellerHelper: 'Badgers with live listings',
    guidanceFallback: [
      'Meet in familiar campus or public neighborhood spots when possible.',
      'Use clear photos and honest condition notes for fast student-to-student decisions.',
      'Keep pickup timing realistic around classes, work, and game-day traffic.',
    ],
    localAreas: [
      'Memorial Union',
      'College Library',
      'State Street',
      'Langdon',
      'Eagle Heights',
    ],
    trustHighlights: [
      'wisc.edu community access',
      'Campus-aware pickup',
      'Student resale focus',
    ],
  };
}
