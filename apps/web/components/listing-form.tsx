'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { uploadListingImage } from '@sellr/api-client';
import {
  LISTING_IMAGE_MAX_BYTES,
  LISTING_IMAGE_MAX_COUNT,
  LISTING_IMAGE_MIME_TYPES,
} from '@sellr/shared';
import {
  ListingBuyerPreview,
  type ListingImageStatus,
} from '@/components/listing-buyer-preview';
import {
  CATEGORIES,
  CONDITIONS,
  DAYS,
  getListingFormErrors,
  type ListingFormValues,
} from '@/lib/listing-form';

type ListingFormProps = {
  values: ListingFormValues;
  onChange: (values: ListingFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  error: string | null;
  isSubmitting: boolean;
  submitLabel: string;
  submittingLabel: string;
};

type FieldName = keyof ListingFormValues;
type TouchedFields = Partial<Record<FieldName, true>>;

function fieldClassName(hasError: boolean): string {
  return `mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 ${
    hasError
      ? 'border-[var(--color-brand-warm)] focus:border-[var(--color-brand-warm)] focus:ring-[var(--color-brand-warm-soft)]'
      : 'border-[var(--border-default)] focus:border-[var(--color-brand-contrast)] focus:ring-[var(--color-brand-contrast-muted)]'
  }`;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p
      id={id}
      className="mt-1.5 text-xs font-medium text-[var(--color-brand-warm-strong)]"
    >
      {message}
    </p>
  );
}

export function ListingForm({
  values,
  onChange,
  onSubmit,
  error,
  isSubmitting,
  submitLabel,
  submittingLabel,
}: ListingFormProps) {
  const [touchedFields, setTouchedFields] = useState<TouchedFields>({});
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const latestValuesRef = useRef(values);
  const fieldErrors = getListingFormErrors(values);
  const cleanPhotoUrl = values.photoUrls[0]?.trim() ?? '';
  const canPreviewImage = cleanPhotoUrl.length > 0 && !fieldErrors.photoUrls;
  const imageStatus: ListingImageStatus = !canPreviewImage
    ? 'idle'
    : isUploadingImage
      ? 'loading'
      : loadedImageUrl === cleanPhotoUrl
      ? 'loaded'
      : failedImageUrl === cleanPhotoUrl
        ? 'error'
        : 'loading';

  useEffect(() => {
    latestValuesRef.current = values;
  }, [values]);

  useEffect(() => {
    if (!canPreviewImage) {
      return;
    }

    let cancelled = false;
    const preview = new window.Image();
    preview.onload = () => {
      if (!cancelled) {
        setLoadedImageUrl(cleanPhotoUrl);
        setFailedImageUrl(null);
      }
    };
    preview.onerror = () => {
      if (!cancelled) {
        setLoadedImageUrl(null);
        setFailedImageUrl(cleanPhotoUrl);
      }
    };
    preview.src = cleanPhotoUrl;

    return () => {
      cancelled = true;
      preview.onload = null;
      preview.onerror = null;
    };
  }, [canPreviewImage, cleanPhotoUrl]);

  const visibleError = (field: FieldName): string | undefined =>
    showAllErrors || touchedFields[field] ? fieldErrors[field] : undefined;

  const markTouched = (field: FieldName) => {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  };

  const setField = <Key extends keyof ListingFormValues>(
    key: Key,
    value: ListingFormValues[Key],
  ) => {
    onChange({ ...values, [key]: value });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    setShowAllErrors(true);
    onSubmit(event);
  };

  const photoUrlError =
    visibleError('photoUrls') ??
    imageUploadError ??
    (canPreviewImage && imageStatus === 'error'
      ? 'This image could not load. Try another file.'
      : undefined);

  const updatePhotoUrls = (photoUrls: string[]) => {
    const nextValues = { ...latestValuesRef.current, photoUrls };
    latestValuesRef.current = nextValues;
    onChange(nextValues);
  };

  const removePhotoUrl = (photoUrl: string) => {
    setImageUploadError(null);
    markTouched('photoUrls');
    updatePhotoUrls(values.photoUrls.filter((url) => url !== photoUrl));
  };

  const handleImageFiles = async (files: FileList | null) => {
    markTouched('photoUrls');
    setImageUploadError(null);

    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) {
      return;
    }

    const remainingSlots = LISTING_IMAGE_MAX_COUNT - values.photoUrls.length;
    if (remainingSlots <= 0) {
      setImageUploadError(`Remove a photo before adding another one.`);
      return;
    }

    const filesToUpload = selectedFiles.slice(0, remainingSlots);
    const unsupportedFile = filesToUpload.find(
      (file) =>
        !LISTING_IMAGE_MIME_TYPES.includes(
          file.type as (typeof LISTING_IMAGE_MIME_TYPES)[number],
        ),
    );
    if (unsupportedFile) {
      setImageUploadError('Upload JPG, PNG, or WebP images.');
      return;
    }

    const oversizedFile = filesToUpload.find(
      (file) => file.size > LISTING_IMAGE_MAX_BYTES,
    );
    if (oversizedFile) {
      setImageUploadError('Keep each image under 3 MB.');
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploaded = await Promise.all(
        filesToUpload.map((file) => uploadListingImage(file)),
      );
      const currentPhotoUrls = latestValuesRef.current.photoUrls;
      updatePhotoUrls([
        ...currentPhotoUrls,
        ...uploaded.map((result) => result.url),
      ]);
      if (selectedFiles.length > filesToUpload.length) {
        setImageUploadError(
          `Uploaded ${filesToUpload.length} photos. Remove a photo before adding more.`,
        );
      }
    } catch (uploadError) {
      setImageUploadError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Could not upload this image. Try another file.',
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      <section className="space-y-5 rounded-lg border border-[var(--border-default)] bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-lg font-semibold">Item details</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Keep it specific. Good listings answer obvious buyer questions.
          </p>
        </div>

        <label className="block text-sm font-medium text-[var(--text-primary)]">
          Title
          <input
            value={values.title}
            onChange={(event) => setField('title', event.target.value)}
            onBlur={() => markTouched('title')}
            maxLength={60}
            placeholder="IKEA desk, walnut finish"
            aria-invalid={Boolean(visibleError('title'))}
            aria-describedby="listing-title-error listing-title-count"
            className={fieldClassName(Boolean(visibleError('title')))}
          />
          <div className="mt-1.5 flex items-start justify-between gap-3">
            <FieldError
              id="listing-title-error"
              message={visibleError('title')}
            />
            <span
              id="listing-title-count"
              className="ml-auto shrink-0 text-xs text-[var(--text-tertiary)]"
            >
              {values.title.trim().length}/60
            </span>
          </div>
        </label>

        <label className="block text-sm font-medium text-[var(--text-primary)]">
          Description
          <textarea
            value={values.description}
            onChange={(event) => setField('description', event.target.value)}
            onBlur={() => markTouched('description')}
            maxLength={1000}
            rows={5}
            placeholder="Mention dimensions, age, what is included, and any flaws."
            aria-invalid={Boolean(visibleError('description'))}
            aria-describedby="listing-description-error listing-description-count"
            className={`${fieldClassName(Boolean(visibleError('description')))} resize-y leading-6`}
          />
          <div className="mt-1.5 flex items-start justify-between gap-3">
            <FieldError
              id="listing-description-error"
              message={visibleError('description')}
            />
            <span
              id="listing-description-count"
              className="ml-auto shrink-0 text-xs text-[var(--text-tertiary)]"
            >
              {values.description.trim().length}/1000
            </span>
          </div>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Category
            <select
              value={values.category}
              onChange={(event) => setField('category', event.target.value)}
              className={fieldClassName(false)}
            >
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Subcategory
            <input
              value={values.subcategory}
              onChange={(event) => setField('subcategory', event.target.value)}
              onBlur={() => markTouched('subcategory')}
              placeholder="Desk, textbook, bike"
              aria-invalid={Boolean(visibleError('subcategory'))}
              aria-describedby="listing-subcategory-error"
              className={fieldClassName(Boolean(visibleError('subcategory')))}
            />
            <FieldError
              id="listing-subcategory-error"
              message={visibleError('subcategory')}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Condition
            <select
              value={values.condition}
              onChange={(event) => setField('condition', event.target.value)}
              className={fieldClassName(false)}
            >
              {CONDITIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Price
            <input
              value={values.price}
              onChange={(event) => setField('price', event.target.value)}
              onBlur={() => markTouched('price')}
              inputMode="decimal"
              placeholder="45"
              aria-invalid={Boolean(visibleError('price'))}
              aria-describedby="listing-price-error"
              className={fieldClassName(Boolean(visibleError('price')))}
            />
            <FieldError
              id="listing-price-error"
              message={visibleError('price')}
            />
          </label>
        </div>

        <label className="block text-sm font-medium text-[var(--text-primary)]">
          Condition note
          <input
            value={values.conditionNote}
            onChange={(event) => setField('conditionNote', event.target.value)}
            onBlur={() => markTouched('conditionNote')}
            maxLength={200}
            placeholder="Small scratch on left side"
            aria-invalid={Boolean(visibleError('conditionNote'))}
            aria-describedby="listing-condition-note-error listing-condition-note-count"
            className={fieldClassName(Boolean(visibleError('conditionNote')))}
          />
          <div className="mt-1.5 flex items-start justify-between gap-3">
            <FieldError
              id="listing-condition-note-error"
              message={visibleError('conditionNote')}
            />
            <span
              id="listing-condition-note-count"
              className="ml-auto shrink-0 text-xs text-[var(--text-tertiary)]"
            >
              {values.conditionNote.trim().length}/200
            </span>
          </div>
        </label>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Photos
            <input
              type="file"
              accept={LISTING_IMAGE_MIME_TYPES.join(',')}
              multiple
              disabled={isUploadingImage}
              onChange={(event) => {
                void handleImageFiles(event.target.files);
                event.target.value = '';
              }}
              onBlur={() => markTouched('photoUrls')}
              aria-invalid={Boolean(photoUrlError)}
              aria-describedby="listing-photo-url-error listing-photo-help"
              className={fieldClassName(Boolean(photoUrlError))}
            />
          </label>
          <p
            id="listing-photo-help"
            className="mt-1.5 text-xs text-[var(--text-tertiary)]"
          >
            JPG, PNG, or WebP. Up to {LISTING_IMAGE_MAX_COUNT} photos.
          </p>
          <FieldError id="listing-photo-url-error" message={photoUrlError} />

          {values.photoUrls.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {values.photoUrls.map((photoUrl, index) => (
                <div
                  key={photoUrl}
                  className="overflow-hidden rounded-lg border border-[var(--border-default)] bg-white"
                >
                  <div
                    className="flex aspect-square items-end bg-[var(--bg-tertiary)] bg-cover bg-center"
                    style={{ backgroundImage: `url("${photoUrl}")` }}
                  >
                    {index === 0 ? (
                      <span className="m-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-brand-contrast)] shadow-sm">
                        Primary
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhotoUrl(photoUrl)}
                    className="w-full border-0 bg-white px-2 py-2 text-xs font-medium text-[var(--color-brand-warm-strong)] hover:bg-[var(--color-brand-warm-soft)]"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 text-sm">
          <input
            type="checkbox"
            checked={values.negotiable}
            onChange={(event) => setField('negotiable', event.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="font-medium text-[var(--text-primary)]">
              Open to reasonable offers
            </span>
            <span className="mt-1 block text-[var(--text-secondary)]">
              Buyers will see that price is flexible.
            </span>
          </span>
        </label>
      </section>

      <aside className="space-y-5">
        <ListingBuyerPreview values={values} imageStatus={imageStatus} />

        <section className="rounded-lg border border-[var(--border-default)] bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold">Pickup context</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            Share enough location detail for discovery without exposing an
            exact address.
          </p>

          <label className="mt-4 block text-sm font-medium text-[var(--text-primary)]">
            Neighborhood or area
            <input
              value={values.locationNeighborhood}
              onChange={(event) =>
                setField('locationNeighborhood', event.target.value)
              }
              onBlur={() => markTouched('locationNeighborhood')}
              placeholder="North Campus"
              aria-invalid={Boolean(visibleError('locationNeighborhood'))}
              aria-describedby="listing-neighborhood-error"
              className={fieldClassName(
                Boolean(visibleError('locationNeighborhood')),
              )}
            />
            <FieldError
              id="listing-neighborhood-error"
              message={visibleError('locationNeighborhood')}
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-[var(--text-primary)]">
            Approximate radius
            <select
              value={values.locationRadiusM}
              onChange={(event) =>
                setField('locationRadiusM', event.target.value)
              }
              onBlur={() => markTouched('locationRadiusM')}
              aria-invalid={Boolean(visibleError('locationRadiusM'))}
              aria-describedby="listing-radius-error"
              className={fieldClassName(
                Boolean(visibleError('locationRadiusM')),
              )}
            >
              <option value="500">Within 500 m</option>
              <option value="1000">Within 1 km</option>
              <option value="2500">Within 2.5 km</option>
              <option value="5000">Within 5 km</option>
            </select>
            <FieldError
              id="listing-radius-error"
              message={visibleError('locationRadiusM')}
            />
          </label>
        </section>

        <section className="rounded-lg border border-[var(--border-default)] bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold">Availability</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            Add one recurring pickup window for the MVP.
          </p>

          <label className="mt-4 block text-sm font-medium text-[var(--text-primary)]">
            Day
            <select
              value={values.dayOfWeek}
              onChange={(event) => setField('dayOfWeek', event.target.value)}
              className={fieldClassName(false)}
            >
              {DAYS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Start
              <select
                value={values.startHour}
                onChange={(event) => setField('startHour', event.target.value)}
                className={fieldClassName(false)}
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <option key={hour} value={hour}>
                    {String(hour).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-[var(--text-primary)]">
              End
              <select
                value={values.endHour}
                onChange={(event) => setField('endHour', event.target.value)}
                onBlur={() => markTouched('endHour')}
                aria-invalid={Boolean(visibleError('endHour'))}
                aria-describedby="listing-end-hour-error"
                className={fieldClassName(Boolean(visibleError('endHour')))}
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <option key={hour} value={hour}>
                    {String(hour).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </label>
          </div>
          <FieldError
            id="listing-end-hour-error"
            message={visibleError('endHour')}
          />
        </section>

        {error ? (
          <p
            className="rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-3 text-sm text-[var(--color-brand-warm-strong)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || isUploadingImage}
          className="w-full rounded-lg bg-[var(--color-brand-primary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? submittingLabel
            : isUploadingImage
              ? 'Uploading photos...'
              : submitLabel}
        </button>
      </aside>
    </form>
  );
}
