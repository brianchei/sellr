import type { ApiListing, UpdateListingInput } from '@sellr/api-client';
import { photoUrls } from '@/lib/listing-format';

export const CATEGORIES = [
  'Electronics',
  'Furniture',
  'Home',
  'Books',
  'Clothing',
  'Sports',
  'Tools',
  'Other',
];

export const CONDITIONS = [
  { value: 'like_new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'for_parts', label: 'For parts' },
];

export const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export type ListingFormValues = {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  condition: string;
  conditionNote: string;
  price: string;
  negotiable: boolean;
  photoUrl: string;
  locationNeighborhood: string;
  locationRadiusM: string;
  dayOfWeek: string;
  startHour: string;
  endHour: string;
};

export const DEFAULT_LISTING_FORM_VALUES: ListingFormValues = {
  title: '',
  description: '',
  category: CATEGORIES[0],
  subcategory: '',
  condition: CONDITIONS[1].value,
  conditionNote: '',
  price: '',
  negotiable: true,
  photoUrl: '',
  locationNeighborhood: '',
  locationRadiusM: '1000',
  dayOfWeek: '6',
  startHour: '10',
  endHour: '14',
};

type ListingFormValidationResult =
  | { ok: true; payload: UpdateListingInput }
  | { ok: false; error: string };

export type ListingFormErrors = Partial<
  Record<keyof ListingFormValues, string>
>;

export function isValidImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function parsePrice(value: string): number | null {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed * 100) / 100;
}

function numberFromUnknown(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : fallback;
}

function firstAvailabilityWindow(
  value: unknown,
): { dayOfWeek: number; startHour: number; endHour: number } {
  const first = Array.isArray(value) ? value[0] : null;
  if (typeof first !== 'object' || first === null) {
    return { dayOfWeek: 6, startHour: 10, endHour: 14 };
  }

  const window = first as Record<string, unknown>;
  return {
    dayOfWeek: numberFromUnknown(window.dayOfWeek, 6),
    startHour: numberFromUnknown(window.startHour, 10),
    endHour: numberFromUnknown(window.endHour, 14),
  };
}

export function conditionLabel(value: string): string {
  return (
    CONDITIONS.find((condition) => condition.value === value)?.label ??
    value.replaceAll('_', ' ')
  );
}

export function dayLabel(value: string): string {
  const parsedDay = Number.parseInt(value, 10);
  return (
    DAYS.find((day) => day.value === parsedDay)?.label ?? 'Pickup window'
  );
}

export function listingFormValuesFromListing(
  listing: ApiListing,
): ListingFormValues {
  const price =
    typeof listing.price === 'number'
      ? listing.price
      : Number.parseFloat(String(listing.price));
  const window = firstAvailabilityWindow(listing.availabilityWindows);

  return {
    title: listing.title,
    description: listing.description,
    category: listing.category,
    subcategory: listing.subcategory ?? '',
    condition: listing.condition,
    conditionNote: listing.conditionNote ?? '',
    price: Number.isFinite(price) ? String(price) : '',
    negotiable: listing.negotiable,
    photoUrl: photoUrls(listing.photoUrls)[0] ?? '',
    locationNeighborhood: listing.locationNeighborhood,
    locationRadiusM: String(listing.locationRadiusM),
    dayOfWeek: String(window.dayOfWeek),
    startHour: String(window.startHour),
    endHour: String(window.endHour),
  };
}

export function validateListingForm(
  values: ListingFormValues,
): ListingFormValidationResult {
  const errors = getListingFormErrors(values);
  const firstError = Object.values(errors).find(Boolean);
  if (firstError) {
    return { ok: false, error: firstError };
  }

  const cleanTitle = values.title.trim();
  const cleanDescription = values.description.trim();
  const cleanPhotoUrl = values.photoUrl.trim();
  const cleanNeighborhood = values.locationNeighborhood.trim();
  const cleanSubcategory = values.subcategory.trim();
  const cleanConditionNote = values.conditionNote.trim();
  const parsedPrice = parsePrice(values.price);
  const parsedRadius = Number.parseInt(values.locationRadiusM, 10);
  const parsedDay = Number.parseInt(values.dayOfWeek, 10);
  const parsedStart = Number.parseInt(values.startHour, 10);
  const parsedEnd = Number.parseInt(values.endHour, 10);

  return {
    ok: true,
    payload: {
      title: cleanTitle,
      description: cleanDescription,
      category: values.category,
      ...(cleanSubcategory ? { subcategory: cleanSubcategory } : {}),
      condition: values.condition,
      ...(cleanConditionNote ? { conditionNote: cleanConditionNote } : {}),
      price: parsedPrice ?? 0,
      negotiable: values.negotiable,
      locationRadiusM: parsedRadius,
      locationNeighborhood: cleanNeighborhood,
      availabilityWindows: [
        {
          dayOfWeek: parsedDay,
          startHour: parsedStart,
          endHour: parsedEnd,
        },
      ],
      photoUrls: [cleanPhotoUrl],
    },
  };
}

export function getListingFormErrors(
  values: ListingFormValues,
): ListingFormErrors {
  const cleanTitle = values.title.trim();
  const cleanDescription = values.description.trim();
  const cleanPhotoUrl = values.photoUrl.trim();
  const cleanNeighborhood = values.locationNeighborhood.trim();
  const cleanSubcategory = values.subcategory.trim();
  const cleanConditionNote = values.conditionNote.trim();
  const parsedPrice = parsePrice(values.price);
  const parsedRadius = Number.parseInt(values.locationRadiusM, 10);
  const parsedStart = Number.parseInt(values.startHour, 10);
  const parsedEnd = Number.parseInt(values.endHour, 10);
  const errors: ListingFormErrors = {};

  if (cleanTitle.length < 3 || cleanTitle.length > 60) {
    errors.title = 'Use 3-60 characters so buyers can scan the item quickly.';
  }

  if (cleanDescription.length < 10 || cleanDescription.length > 1000) {
    errors.description =
      'Add 10-1000 characters with size, condition, inclusions, or flaws.';
  }

  if (cleanSubcategory.length > 50) {
    errors.subcategory = 'Keep the subcategory under 50 characters.';
  }

  if (parsedPrice === null) {
    errors.price = 'Enter a valid price greater than $0.';
  }

  if (cleanConditionNote.length > 200) {
    errors.conditionNote = 'Keep the condition note under 200 characters.';
  }

  if (!isValidImageUrl(cleanPhotoUrl)) {
    errors.photoUrl = 'Add a valid image URL starting with http:// or https://.';
  }

  if (!cleanNeighborhood) {
    errors.locationNeighborhood = 'Add a neighborhood or pickup area.';
  }

  if (
    !Number.isInteger(parsedRadius) ||
    parsedRadius < 100 ||
    parsedRadius > 5000
  ) {
    errors.locationRadiusM = 'Pickup radius must be between 100 and 5000 m.';
  }

  if (parsedEnd <= parsedStart) {
    errors.endHour = 'End time must be after the start time.';
  }

  return errors;
}
