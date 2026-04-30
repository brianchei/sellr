'use client';

import type { FormEvent } from 'react';
import {
  CATEGORIES,
  CONDITIONS,
  DAYS,
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

export function ListingForm({
  values,
  onChange,
  onSubmit,
  error,
  isSubmitting,
  submitLabel,
  submittingLabel,
}: ListingFormProps) {
  const setField = <Key extends keyof ListingFormValues>(
    key: Key,
    value: ListingFormValues[Key],
  ) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <form
      onSubmit={onSubmit}
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
            maxLength={60}
            placeholder="IKEA desk, walnut finish"
            className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
          />
        </label>

        <label className="block text-sm font-medium text-[var(--text-primary)]">
          Description
          <textarea
            value={values.description}
            onChange={(event) => setField('description', event.target.value)}
            maxLength={1000}
            rows={5}
            placeholder="Mention dimensions, age, what is included, and any flaws."
            className="mt-2 w-full resize-y rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm leading-6 outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Category
            <select
              value={values.category}
              onChange={(event) => setField('category', event.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
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
              placeholder="Desk, textbook, bike"
              className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Condition
            <select
              value={values.condition}
              onChange={(event) => setField('condition', event.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
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
              inputMode="decimal"
              placeholder="45"
              className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
            />
          </label>
        </div>

        <label className="block text-sm font-medium text-[var(--text-primary)]">
          Condition note
          <input
            value={values.conditionNote}
            onChange={(event) => setField('conditionNote', event.target.value)}
            maxLength={200}
            placeholder="Small scratch on left side"
            className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
          />
        </label>

        <label className="block text-sm font-medium text-[var(--text-primary)]">
          Image URL
          <input
            value={values.photoUrl}
            onChange={(event) => setField('photoUrl', event.target.value)}
            placeholder="https://example.com/photo.jpg"
            className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
          />
        </label>

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
              placeholder="North Campus"
              className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-[var(--text-primary)]">
            Approximate radius
            <select
              value={values.locationRadiusM}
              onChange={(event) =>
                setField('locationRadiusM', event.target.value)
              }
              className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
            >
              <option value="500">Within 500 m</option>
              <option value="1000">Within 1 km</option>
              <option value="2500">Within 2.5 km</option>
              <option value="5000">Within 5 km</option>
            </select>
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
              className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
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
                className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
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
                className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <option key={hour} value={hour}>
                    {String(hour).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </label>
          </div>
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
          disabled={isSubmitting}
          className="w-full rounded-lg bg-[var(--color-brand-primary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </button>
      </aside>
    </form>
  );
}
