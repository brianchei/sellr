'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  createListing,
  publishListing,
  type CreateListingInput,
} from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';

const CATEGORIES = [
  'Electronics',
  'Furniture',
  'Home',
  'Books',
  'Clothing',
  'Sports',
  'Tools',
  'Other',
];

const CONDITIONS = [
  { value: 'like_new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'for_parts', label: 'For parts' },
];

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

function isValidUrl(value: string): boolean {
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

export default function SellPage() {
  const router = useRouter();
  const { primaryCommunityId } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subcategory, setSubcategory] = useState('');
  const [condition, setCondition] = useState(CONDITIONS[1].value);
  const [conditionNote, setConditionNote] = useState('');
  const [price, setPrice] = useState('');
  const [negotiable, setNegotiable] = useState(true);
  const [photoUrl, setPhotoUrl] = useState('');
  const [locationNeighborhood, setLocationNeighborhood] = useState('');
  const [locationRadiusM, setLocationRadiusM] = useState('1000');
  const [dayOfWeek, setDayOfWeek] = useState('6');
  const [startHour, setStartHour] = useState('10');
  const [endHour, setEndHour] = useState('14');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): CreateListingInput | null => {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanPhotoUrl = photoUrl.trim();
    const cleanNeighborhood = locationNeighborhood.trim();
    const cleanSubcategory = subcategory.trim();
    const cleanConditionNote = conditionNote.trim();
    const parsedPrice = parsePrice(price);
    const parsedRadius = Number.parseInt(locationRadiusM, 10);
    const parsedDay = Number.parseInt(dayOfWeek, 10);
    const parsedStart = Number.parseInt(startHour, 10);
    const parsedEnd = Number.parseInt(endHour, 10);

    if (!primaryCommunityId) {
      setError('Join a community before listing an item.');
      return null;
    }

    if (cleanTitle.length < 3 || cleanTitle.length > 60) {
      setError('Title must be between 3 and 60 characters.');
      return null;
    }

    if (cleanDescription.length < 10 || cleanDescription.length > 1000) {
      setError('Description must be between 10 and 1000 characters.');
      return null;
    }

    if (parsedPrice === null) {
      setError('Enter a valid price greater than $0.');
      return null;
    }

    if (!isValidUrl(cleanPhotoUrl)) {
      setError('Add a valid image URL starting with http:// or https://.');
      return null;
    }

    if (!cleanNeighborhood) {
      setError('Add a neighborhood or pickup area.');
      return null;
    }

    if (!Number.isInteger(parsedRadius) || parsedRadius < 100 || parsedRadius > 5000) {
      setError('Pickup radius must be between 100 and 5000 meters.');
      return null;
    }

    if (parsedEnd <= parsedStart) {
      setError('Availability end time must be after the start time.');
      return null;
    }

    return {
      communityId: primaryCommunityId,
      title: cleanTitle,
      description: cleanDescription,
      category,
      ...(cleanSubcategory ? { subcategory: cleanSubcategory } : {}),
      condition,
      ...(cleanConditionNote ? { conditionNote: cleanConditionNote } : {}),
      price: parsedPrice,
      negotiable,
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
      aiGenerated: false,
    };
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const payload = validate();
    if (!payload) {
      return;
    }

    setLoading(true);
    try {
      const created = await createListing(payload);
      await publishListing(created.listing.id);
      router.push('/marketplace');
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not publish this listing. Check the details and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (!primaryCommunityId) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section className="rounded-lg border border-[var(--border-default)] bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">
            Join a community before selling
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Sellr listings are scoped to verified local communities.
          </p>
          <Link
            href="/onboarding"
            className="mt-5 inline-flex rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
          >
            Join community
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-brand-contrast)]">
            Structured listing
          </p>
          <h1 className="mt-1 text-3xl font-semibold">
            Sell an item
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Create a clear listing with the details buyers need before they
            reach out. Your listing publishes to your community marketplace.
          </p>
        </div>
        <Link
          href="/marketplace"
          className="rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-secondary)]"
        >
          Back to browse
        </Link>
      </div>

      <form
        onSubmit={(event) => void onSubmit(event)}
        className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <section className="space-y-5 rounded-lg border border-[var(--border-default)] bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">
              Item details
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Keep it specific. Good listings answer obvious buyer questions.
            </p>
          </div>

          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={60}
              placeholder="IKEA desk, walnut finish"
              className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
            />
          </label>

          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
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
                value={category}
                onChange={(event) => setCategory(event.target.value)}
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
                value={subcategory}
                onChange={(event) => setSubcategory(event.target.value)}
                placeholder="Desk, textbook, bike"
                className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Condition
              <select
                value={condition}
                onChange={(event) => setCondition(event.target.value)}
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
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                inputMode="decimal"
                placeholder="45"
                className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Condition note
            <input
              value={conditionNote}
              onChange={(event) => setConditionNote(event.target.value)}
              maxLength={200}
              placeholder="Small scratch on left side"
              className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
            />
          </label>

          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Image URL
            <input
              value={photoUrl}
              onChange={(event) => setPhotoUrl(event.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
            />
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 text-sm">
            <input
              type="checkbox"
              checked={negotiable}
              onChange={(event) => setNegotiable(event.target.checked)}
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
            <h2 className="text-base font-semibold">
              Pickup context
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Share enough location detail for discovery without exposing an
              exact address.
            </p>

            <label className="mt-4 block text-sm font-medium text-[var(--text-primary)]">
              Neighborhood or area
              <input
                value={locationNeighborhood}
                onChange={(event) => setLocationNeighborhood(event.target.value)}
                placeholder="North Campus"
                className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-[var(--text-primary)]">
              Approximate radius
              <select
                value={locationRadiusM}
                onChange={(event) => setLocationRadiusM(event.target.value)}
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
            <h2 className="text-base font-semibold">
              Availability
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Add one recurring pickup window for the MVP.
            </p>

            <label className="mt-4 block text-sm font-medium text-[var(--text-primary)]">
              Day
              <select
                value={dayOfWeek}
                onChange={(event) => setDayOfWeek(event.target.value)}
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
                  value={startHour}
                  onChange={(event) => setStartHour(event.target.value)}
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
                  value={endHour}
                  onChange={(event) => setEndHour(event.target.value)}
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
            disabled={loading}
            className="w-full rounded-lg bg-[var(--color-brand-primary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Publishing...' : 'Publish listing'}
          </button>
        </aside>
      </form>
    </main>
  );
}
