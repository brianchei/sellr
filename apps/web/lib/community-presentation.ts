import type { ApiCommunityDetail } from '@sellr/api-client';

type CommunityPresentation = {
  eyebrow: string;
  description: string;
  heroBackground: string;
  accentColor: string | null;
  bannerImageUrl: string | null;
  logoImageUrl: string | null;
  accessBadgeTone: 'accent' | 'contrast';
  listingHelper: string;
  sellerHelper: string;
  guidanceFallback: string[];
  localAreas: string[];
  trustHighlights: string[];
};

type PresentationConfig = {
  shortDescription?: string | null;
  themeKey?: 'default' | 'badger' | 'campus' | 'neighborhood' | null;
  accentColor?: string | null;
  bannerImageUrl?: string | null;
  logoImageUrl?: string | null;
  pickupGuidance?: string | null;
  localAreas?: string[];
};

function presentationConfig(value: unknown): PresentationConfig {
  if (typeof value !== 'object' || value === null) return {};
  const record = value as Record<string, unknown>;
  return {
    shortDescription:
      typeof record.shortDescription === 'string'
        ? record.shortDescription
        : null,
    themeKey:
      record.themeKey === 'badger' ||
      record.themeKey === 'campus' ||
      record.themeKey === 'neighborhood' ||
      record.themeKey === 'default'
        ? record.themeKey
        : null,
    accentColor:
      typeof record.accentColor === 'string' ? record.accentColor : null,
    bannerImageUrl:
      typeof record.bannerImageUrl === 'string'
        ? record.bannerImageUrl
        : null,
    logoImageUrl:
      typeof record.logoImageUrl === 'string' ? record.logoImageUrl : null,
    pickupGuidance:
      typeof record.pickupGuidance === 'string'
        ? record.pickupGuidance
        : null,
    localAreas: Array.isArray(record.localAreas)
      ? record.localAreas.filter(
          (area): area is string => typeof area === 'string' && area.length > 0,
        )
      : undefined,
  };
}

function isBadgerMarket(community: ApiCommunityDetail): boolean {
  const config = presentationConfig(community.presentation);
  if (config.themeKey === 'badger') return true;
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
  const config = presentationConfig(community.presentation);
  const fallbackLocalAreas =
    community.type === 'campus'
      ? ['Campus center', 'Student neighborhoods', 'Library or union pickup']
      : ['Neighborhood center', 'Lobby or common area', 'Public pickup spot'];

  return {
    eyebrow: `${community.type.replaceAll('_', ' ')} community`,
    description:
      config.shortDescription ||
      'A verified local marketplace for members to browse nearby listings, understand community context, and coordinate pickup with clearer trust signals.',
    heroBackground:
      config.accentColor
        ? `linear-gradient(135deg, ${config.accentColor}24 0%, rgba(255,255,255,0.96) 50%, var(--color-brand-primary-soft) 100%)`
        : community.type === 'campus'
        ? 'linear-gradient(135deg, var(--color-brand-primary-soft) 0%, rgba(255,255,255,0.96) 50%, var(--color-brand-contrast-soft) 100%)'
        : 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, var(--color-brand-accent-soft) 46%, var(--color-brand-primary-soft) 100%)',
    accentColor: config.accentColor ?? null,
    bannerImageUrl: config.bannerImageUrl ?? null,
    logoImageUrl: config.logoImageUrl ?? null,
    accessBadgeTone: 'accent',
    listingHelper: 'Ready for local pickup',
    sellerHelper: 'Members with live listings',
    guidanceFallback: [
      config.pickupGuidance ||
        'Keep pickup coordination inside Sellr until details are clear.',
      'Use a recognizable profile and accurate listing photos.',
      'Choose familiar public pickup areas when possible.',
    ],
    localAreas:
      config.localAreas && config.localAreas.length > 0
        ? config.localAreas
        : fallbackLocalAreas,
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
  const config = presentationConfig(community.presentation);
  if (!isBadgerMarket(community)) {
    return genericPresentation(community);
  }

  return {
    eyebrow: 'Badger Market',
    description:
      config.shortDescription ||
      'A UW-Madison resale space for students and campus neighbors to trade dorm, apartment, class, and game-day essentials with verified community context.',
    heroBackground:
      config.accentColor
        ? `linear-gradient(135deg, ${config.accentColor}22 0%, rgba(255,255,255,0.96) 38%, rgba(239,118,122,0.15) 68%, var(--color-brand-contrast-soft) 100%)`
        : 'linear-gradient(135deg, var(--color-brand-primary-soft) 0%, rgba(255,255,255,0.96) 38%, rgba(239,118,122,0.15) 68%, var(--color-brand-contrast-soft) 100%)',
    accentColor: config.accentColor ?? null,
    bannerImageUrl: config.bannerImageUrl ?? null,
    logoImageUrl: config.logoImageUrl ?? null,
    accessBadgeTone: 'contrast',
    listingHelper: 'Dorm, apartment, class, and game-day finds',
    sellerHelper: 'Badgers with live listings',
    guidanceFallback: [
      config.pickupGuidance ||
        'Meet in familiar campus or public neighborhood spots when possible.',
      'Use clear photos and honest condition notes for fast student-to-student decisions.',
      'Keep pickup timing realistic around classes, work, and game-day traffic.',
    ],
    localAreas:
      config.localAreas && config.localAreas.length > 0
        ? config.localAreas
        : [
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
