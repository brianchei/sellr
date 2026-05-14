import type { ApiListing } from '@sellr/api-client';

export const CONDITION_LABELS: Record<string, string> = {
  like_new: 'Like new',
  good: 'Good',
  fair: 'Fair',
  for_parts: 'For parts',
};

const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

type AvailabilityWindow = {
  dayOfWeek?: unknown;
  startHour?: unknown;
  endHour?: unknown;
  specificDate?: unknown;
};

export function formatCondition(condition: string): string {
  return CONDITION_LABELS[condition] ?? condition.replaceAll('_', ' ');
}

export function photoUrls(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function availabilityWindows(value: unknown): AvailabilityWindow[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is AvailabilityWindow =>
          typeof item === 'object' && item !== null,
      )
    : [];
}

export function formatPrice(price: ApiListing['price']): string {
  const amount =
    typeof price === 'number' ? price : Number.parseFloat(String(price));

  if (!Number.isFinite(amount)) {
    return '$--';
  }

  if (amount === 0) {
    return 'Free';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatRadius(radiusM: number): string {
  const miles = radiusM / 1609.344;
  return `${Number.parseFloat(miles.toFixed(1))} mi`;
}

export function formatPickupHour(hour: number): string {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const displayHour = normalizedHour % 12 || 12;
  const meridiem = normalizedHour < 12 ? 'AM' : 'PM';
  return `${displayHour} ${meridiem}`;
}

function formatPickupDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatAvailabilityWindow(window: AvailabilityWindow): string {
  const dateLabel = formatPickupDate(window.specificDate);
  const dayLabel =
    typeof window.dayOfWeek === 'number' &&
    window.dayOfWeek >= 0 &&
    window.dayOfWeek <= 6
      ? DAY_LABELS[window.dayOfWeek]
      : 'Available';
  const label = dateLabel ?? dayLabel;
  const start =
    typeof window.startHour === 'number'
      ? formatPickupHour(window.startHour)
      : null;
  const end =
    typeof window.endHour === 'number'
      ? formatPickupHour(window.endHour)
      : null;

  if (start && end) {
    return `${label}, ${start}-${end}`;
  }

  return label;
}

export function formatPostedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Recently listed';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export type ListedFreshness = {
  label: string;
  tone: 'fresh' | 'recent' | 'older';
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function formatRelativeListedDate(
  value: string,
  now: Date = new Date(),
): ListedFreshness {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { label: 'Recently listed', tone: 'recent' };
  }

  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / MS_PER_DAY);

  if (diffDays <= 0) {
    return { label: 'Listed today', tone: 'fresh' };
  }
  if (diffDays === 1) {
    return { label: 'Listed yesterday', tone: 'fresh' };
  }
  if (diffDays < 7) {
    return { label: `Listed ${diffDays} days ago`, tone: 'fresh' };
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return {
      label: `Listed ${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`,
      tone: 'recent',
    };
  }

  return { label: `Listed ${formatPostedDate(value)}`, tone: 'older' };
}
