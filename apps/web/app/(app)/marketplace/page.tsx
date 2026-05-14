'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCommunityListings } from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';
import { ListingCard } from '@/components/listing-card';
import { CATEGORIES } from '@/lib/listing-form';
import { CONDITION_LABELS } from '@/lib/listing-format';
import { ACTIVITY_REFETCH_INTERVAL_MS } from '@/lib/query-refresh';

type SortOption = 'recent' | 'price-asc' | 'price-desc';
type ConditionOption = 'all' | keyof typeof CONDITION_LABELS_MAP;

const CONDITION_LABELS_MAP = CONDITION_LABELS;

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'recent', label: 'Recently listed' },
  { value: 'price-asc', label: 'Lowest price' },
  { value: 'price-desc', label: 'Highest price' },
];

const CONDITION_FILTERS: Array<{ value: ConditionOption; label: string }> = [
  { value: 'all', label: 'Any' },
  ...(
    Object.entries(CONDITION_LABELS_MAP) as Array<
      [keyof typeof CONDITION_LABELS_MAP, string]
    >
  ).map(([value, label]) => ({
    value: value as ConditionOption,
    label,
  })),
];

export default function MarketplacePage() {
  const { primaryCommunityId } = useAuth();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [condition, setCondition] = useState<ConditionOption>('all');
  const [sort, setSort] = useState<SortOption>('recent');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [hasPhotosOnly, setHasPhotosOnly] = useState(false);

  const trimmedQuery = query.trim();

  const listingsQuery = useQuery({
    queryKey: [
      'community-listings',
      primaryCommunityId,
      {
        category,
        condition,
        hasPhotosOnly,
        q: trimmedQuery,
        sort,
      },
    ],
    queryFn: () => {
      if (!primaryCommunityId) {
        throw new Error('Join a community before browsing listings.');
      }
      return fetchCommunityListings({
        communityId: primaryCommunityId,
        ...(trimmedQuery ? { q: trimmedQuery } : {}),
        ...(category !== 'all' ? { category } : {}),
        ...(condition !== 'all' ? { condition } : {}),
        hasPhotos: hasPhotosOnly,
        sort,
        limit: 50,
      });
    },
    enabled: Boolean(primaryCommunityId),
    refetchInterval: ACTIVITY_REFETCH_INTERVAL_MS,
  });

  const rawListings = listingsQuery.data?.listings;
  const listings = useMemo(() => rawListings ?? [], [rawListings]);

  const verifiedAvailable = useMemo(
    () => listings.some((listing) => Boolean(listing.seller?.verifiedAt)),
    [listings],
  );

  const filteredListings = useMemo(() => {
    return listings.filter(
      (listing) => !verifiedOnly || Boolean(listing.seller?.verifiedAt),
    );
  }, [listings, verifiedOnly]);

  const hasActiveFilters =
    Boolean(trimmedQuery) ||
    category !== 'all' ||
    condition !== 'all' ||
    sort !== 'recent' ||
    verifiedOnly ||
    hasPhotosOnly;

  const clearFilters = () => {
    setQuery('');
    setCategory('all');
    setCondition('all');
    setSort('recent');
    setVerifiedOnly(false);
    setHasPhotosOnly(false);
  };

  if (!primaryCommunityId) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section className="app-panel p-6">
          <h1 className="text-2xl font-semibold">Join a community first</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Marketplace browsing is scoped to verified local communities.
          </p>
          <Link
            href="/onboarding"
            className="app-action-primary mt-5 px-4 py-2 text-sm"
          >
            Join community
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-10 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--color-brand-contrast)]">
            Community marketplace
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
            Browse local listings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Verified-community items only. Browse furniture, books, dorm and
            apartment basics, electronics, and other local pickup finds.
          </p>
        </div>
        <Link
          href="/sell"
          className="app-action-primary w-full px-4 py-2.5 text-sm sm:w-auto"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Sell an item
        </Link>
      </header>

      <section
        aria-label="Filter listings"
        className="app-panel-soft mt-6 p-4 sm:p-5"
      >
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              Search
            </span>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title, details, or neighborhood"
                className="w-full rounded-2xl border border-black/10 bg-white/90 py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] shadow-xs outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              Category
            </span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white/90 px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-xs outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <FilterChipRow
          label="Sort"
          value={sort}
          options={SORT_OPTIONS}
          onChange={setSort}
        />

        <FilterChipRow
          label="Condition"
          value={condition}
          options={CONDITION_FILTERS}
          onChange={setCondition}
        />

        {verifiedAvailable || verifiedOnly ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setVerifiedOnly((current) => !current)}
              aria-pressed={verifiedOnly}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition"
              style={{
                borderColor: verifiedOnly
                  ? 'var(--color-brand-accent)'
                  : 'var(--border-default)',
                background: verifiedOnly
                  ? 'var(--color-brand-accent-soft)'
                  : 'var(--bg-elevated)',
                color: verifiedOnly
                  ? 'var(--color-brand-accent-strong)'
                  : 'var(--text-secondary)',
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z"
                  fill="currentColor"
                  opacity={verifiedOnly ? 0.2 : 0.1}
                />
                <path
                  d="M9 12l2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              Verified sellers only
            </button>
          </div>
        ) : null}

        <div className={verifiedAvailable ? 'mt-2' : 'mt-4'}>
          <button
            type="button"
            onClick={() => setHasPhotosOnly((current) => !current)}
            aria-pressed={hasPhotosOnly}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition"
            style={{
              borderColor: hasPhotosOnly
                ? 'var(--color-brand-contrast)'
                : 'var(--border-default)',
              background: hasPhotosOnly
                ? 'var(--color-brand-contrast-soft)'
                : 'var(--bg-elevated)',
              color: hasPhotosOnly
                ? 'var(--color-brand-contrast)'
                : 'var(--text-secondary)',
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="6" width="18" height="14" rx="2" />
              <circle cx="12" cy="13" r="3.5" />
              <path d="M8 6V4h8v2" />
            </svg>
            Has photos
          </button>
        </div>
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-[var(--text-secondary)]">
          {listingsQuery.isLoading ? (
            <span className="text-[var(--text-tertiary)]">Loading…</span>
          ) : (
            <>
              <span className="font-semibold text-[var(--text-primary)]">
                {filteredListings.length}
              </span>{' '}
              {hasActiveFilters ? 'matching ' : ''}
              {filteredListings.length === 1 ? 'listing' : 'listings'}
            </>
          )}
        </p>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--color-brand-primary-soft)]"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
            Clear filters
          </button>
        ) : null}
      </div>

      {listingsQuery.isLoading ? (
        <section
          aria-label="Loading listings"
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 shadow-[var(--shadow-app-card)]"
            >
              <div className="aspect-[4/3] bg-[var(--bg-tertiary)]" />
              <div className="space-y-3 p-4">
                <div className="h-5 w-3/4 rounded bg-[var(--bg-tertiary)]" />
                <div className="h-4 w-1/2 rounded bg-[var(--bg-tertiary)]" />
                <div className="h-4 w-full rounded bg-[var(--bg-tertiary)]" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 rounded-full bg-[var(--bg-tertiary)]" />
                  <div className="h-5 w-20 rounded-full bg-[var(--bg-tertiary)]" />
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {listingsQuery.isError ? (
        <section
          className="mt-4 rounded-3xl border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-6 text-[var(--color-brand-warm-strong)]"
          role="alert"
        >
          <h2 className="text-base font-semibold">Could not load listings</h2>
          <p className="mt-2 text-sm">
            {listingsQuery.error instanceof Error
              ? listingsQuery.error.message
              : 'Refresh and try again.'}
          </p>
          <button
            type="button"
            onClick={() => void listingsQuery.refetch()}
            className="mt-4 rounded-lg bg-[var(--color-brand-warm)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-warm-strong)]"
          >
            Retry
          </button>
        </section>
      ) : null}

      {!listingsQuery.isLoading &&
      !listingsQuery.isError &&
      listings.length === 0 &&
      !hasActiveFilters ? (
        <section className="mt-4 rounded-3xl border border-dashed border-[var(--border-strong)] bg-white/90 p-8 text-center shadow-[var(--shadow-app-card)]">
          <h2 className="text-xl font-semibold">No active listings yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            Your community marketplace is ready. Start with everyday items
            students actually need: furniture, kitchen gear, books, electronics,
            bikes, and free pickup items.
          </p>
          <Link
            href="/sell"
            className="app-action-primary mt-5 px-4 py-2 text-sm"
          >
            Create the first listing
          </Link>
        </section>
      ) : null}

      {!listingsQuery.isLoading &&
      !listingsQuery.isError &&
      hasActiveFilters &&
      filteredListings.length === 0 ? (
        <section className="app-panel mt-4 p-8 text-center">
          <h2 className="text-xl font-semibold">
            No listings match those filters
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            Try a broader search, a different category, or clearing the
            trust/photo filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="app-action-secondary mt-4 px-4 py-2 text-sm"
          >
            Clear filters
          </button>
        </section>
      ) : null}

      {filteredListings.length > 0 ? (
        <section
          aria-label="Listings"
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filteredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </section>
      ) : null}
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Filter chip row (used for sort + condition)                                 */
/* -------------------------------------------------------------------------- */

function FilterChipRow<TValue extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: TValue;
  options: ReadonlyArray<{ value: TValue; label: string }>;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="mt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
      </p>
      <div
        role="radiogroup"
        aria-label={label}
        className="mt-1.5 flex flex-wrap gap-1.5"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5"
              style={{
                borderColor: active
                  ? 'var(--color-brand-contrast)'
                  : 'var(--border-default)',
                background: active
                  ? 'var(--color-brand-contrast-soft)'
                  : 'var(--bg-elevated)',
                color: active
                  ? 'var(--color-brand-contrast)'
                  : 'var(--text-secondary)',
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
