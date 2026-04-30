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

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatRadius(radiusM: number): string {
  if (radiusM >= 1000) {
    return `${Number.parseFloat((radiusM / 1000).toFixed(1))} km`;
  }
  return `${radiusM} m`;
}

export function formatAvailabilityWindow(window: AvailabilityWindow): string {
  const day =
    typeof window.dayOfWeek === 'number' &&
    window.dayOfWeek >= 0 &&
    window.dayOfWeek <= 6
      ? DAY_LABELS[window.dayOfWeek]
      : 'Available';
  const start =
    typeof window.startHour === 'number'
      ? `${String(window.startHour).padStart(2, '0')}:00`
      : null;
  const end =
    typeof window.endHour === 'number'
      ? `${String(window.endHour).padStart(2, '0')}:00`
      : null;

  if (start && end) {
    return `${day}, ${start}-${end}`;
  }

  return day;
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
