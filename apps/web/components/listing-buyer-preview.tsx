import {
  conditionLabel,
  dayLabel,
  isValidImageUrl,
  type ListingFormValues,
} from '@/lib/listing-form';
import {
  formatPickupHour,
  formatPrice,
  formatRadius,
} from '@/lib/listing-format';

export type ListingImageStatus = 'idle' | 'loading' | 'loaded' | 'error';

type ListingBuyerPreviewProps = {
  values: ListingFormValues;
  imageStatus: ListingImageStatus;
};

function formatPreviewPrice(value: string): string {
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) && amount >= 0 ? formatPrice(amount) : '$--';
}

function formatPreviewAvailability(values: ListingFormValues): string {
  const start = Number.parseInt(values.startHour, 10);
  const end = Number.parseInt(values.endHour, 10);
  if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) {
    return 'Pickup window pending';
  }

  return `${dayLabel(values.dayOfWeek)}, ${formatPickupHour(start)}-${formatPickupHour(end)}`;
}

function formatPreviewPickup(values: ListingFormValues): string {
  const radius = Number.parseInt(values.locationRadiusM, 10);
  const neighborhood = values.locationNeighborhood.trim() || 'Pickup area';

  if (!Number.isInteger(radius)) {
    return neighborhood;
  }

  return `${neighborhood} - ${formatRadius(radius)} radius`;
}

export function ListingBuyerPreview({
  values,
  imageStatus,
}: ListingBuyerPreviewProps) {
  const cleanPhotoUrl = values.photoUrls[0]?.trim() ?? '';
  const hasLoadedImage =
    cleanPhotoUrl.length > 0 &&
    isValidImageUrl(cleanPhotoUrl) &&
    imageStatus === 'loaded';
  const title = values.title.trim() || 'Listing title';
  const description =
    values.description.trim() ||
    'A clear description will help buyers decide whether to reach out.';
  const pickup = formatPreviewPickup(values);
  const category = values.subcategory.trim() || values.category;

  return (
    <section className="app-panel-soft p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Buyer preview</h2>
        <span className="rounded-full bg-[#111111] px-2.5 py-1 text-xs font-semibold text-[var(--color-brand-primary)]">
          Draft
        </span>
      </div>

      <div
        className="mt-4 flex aspect-[4/3] items-center justify-center rounded-[var(--radius-panel)] border border-black/10 bg-[var(--bg-tertiary)] bg-cover bg-center text-sm font-medium text-[var(--text-tertiary)]"
        style={
          hasLoadedImage ? { backgroundImage: `url("${cleanPhotoUrl}")` } : {}
        }
      >
        {!hasLoadedImage ? (
          <span>
            {imageStatus === 'loading' ? 'Loading image...' : 'Image preview'}
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <p className="inline-flex rounded-full bg-[var(--color-brand-primary)] px-3 py-1 text-xl font-bold text-[var(--text-primary)]">
          {formatPreviewPrice(values.price)}
        </p>
        <h3 className="mt-1 line-clamp-2 break-words text-base font-semibold text-[var(--text-primary)]">
          {title}
        </h3>
        <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-[var(--text-secondary)]">
          {description}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-[var(--color-brand-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-brand-primary-strong)]">
          {conditionLabel(values.condition)}
        </span>
        <span className="rounded-full bg-white/75 px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
          {category}
        </span>
        <span className="rounded-full bg-[var(--color-brand-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-brand-accent-strong)]">
          {values.negotiable ? 'Open to offers' : 'Firm price'}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm">
        <div>
          <dt className="font-medium text-[var(--text-primary)]">Pickup</dt>
          <dd className="mt-0.5 text-[var(--text-secondary)]">{pickup}</dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--text-primary)]">
            Availability
          </dt>
          <dd className="mt-0.5 text-[var(--text-secondary)]">
            {formatPreviewAvailability(values)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
