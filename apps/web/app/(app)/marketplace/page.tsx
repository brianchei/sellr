'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCommunityListings, type ApiListing } from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';
import { ListingCard } from '@/components/listing-card';
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

function listingMatchesQuery(listing: ApiListing, query: string): boolean {
  if (!query) {
    return true;
  }
  const haystack = [
    listing.title,
    listing.description,
    listing.category,
    listing.subcategory ?? '',
    listing.conditionNote ?? '',
    listing.locationNeighborhood,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function priceNumber(price: ApiListing['price']): number {
  const value =
    typeof price === 'number' ? price : Number.parseFloat(String(price));
  return Number.isFinite(value) ? value : 0;
}

function sortListings(listings: ApiListing[], sort: SortOption): ApiListing[] {
  const copy = [...listings];
  if (sort === 'price-asc') {
    return copy.sort(
      (left, right) => priceNumber(left.price) - priceNumber(right.price),
    );
  }
  if (sort === 'price-desc') {
    return copy.sort(
      (left, right) => priceNumber(right.price) - priceNumber(left.price),
    );
  }
  return copy.sort((left, right) => {
    return (
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  });
}

export default function MarketplacePage() {
  const { primaryCommunityId } = useAuth();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [condition, setCondition] = useState<ConditionOption>('all');
  const [sort, setSort] = useState<SortOption>('recent');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const listingsQuery = useQuery({
    queryKey: ['community-listings', primaryCommunityId],
    queryFn: () => {
      if (!primaryCommunityId) {
        throw new Error('Join a community before browsing listings.');
      }
      return fetchCommunityListings({
        communityId: primaryCommunityId,
        limit: 50,
      });
    },
    enabled: Boolean(primaryCommunityId),
    refetchInterval: ACTIVITY_REFETCH_INTERVAL_MS,
  });

  const rawListings = listingsQuery.data?.listings;
  const listings = useMemo(() => rawListings ?? [], [rawListings]);

  const categories = useMemo(() => {
    return Array.from(new Set(listings.map((listing) => listing.category)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [listings]);

  const verifiedAvailable = useMemo(
    () => listings.some((listing) => Boolean(listing.seller?.verifiedAt)),
    [listings],
  );

  const filteredListings = useMemo(() => {
    const trimmed = query.trim();
    const filtered = listings.filter((listing) => {
      const matchesQuery = listingMatchesQuery(listing, trimmed);
      const matchesCategory =
        category === 'all' || listing.category === category;
      const matchesCondition =
        condition === 'all' || listing.condition === condition;
      const matchesVerified =
        !verifiedOnly || Boolean(listing.seller?.verifiedAt);
      return (
        matchesQuery && matchesCategory && matchesCondition && matchesVerified
      );
    });
    return sortListings(filtered, sort);
  }, [category, condition, listings, query, sort, verifiedOnly]);

  const hasActiveFilters =
    Boolean(query.trim()) ||
    category !== 'all' ||
    condition !== 'all' ||
    sort !== 'recent' ||
    verifiedOnly;

  const clearFilters = () => {
    setQuery('');
    setCategory('all');
    setCondition('all');
    setSort('recent');
    setVerifiedOnly(false);
  };

  if (!primaryCommunityId) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section className="rounded-lg border border-[var(--border-default)] bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Join a community first</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Marketplace browsing is scoped to verified local communities.
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
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
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
          className="inline-flex w-full justify-center gap-1.5 rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] no-underline shadow-sm transition hover:-translate-y-px hover:bg-[var(--color-brand-primary-hover)] hover:shadow-md sm:w-auto"
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
        className="mt-6 rounded-lg border border-[var(--border-default)] bg-white p-4 shadow-sm sm:p-5"
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
                className="w-full rounded-lg border border-[var(--border-default)] bg-white py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
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
              className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
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

        {verifiedAvailable ? (
          <div className="mt-4">
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
              {filteredListings.length === 1 ? 'listing' : 'listings'}
              {hasActiveFilters && filteredListings.length !== listings.length
                ? ` of ${listings.length}`
                : ''}
            </>
          )}
        </p>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--color-brand-contrast)] transition hover:bg-[var(--color-brand-contrast-soft)]"
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
              className="overflow-hidden rounded-lg border border-[var(--border-default)] bg-white shadow-sm"
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
          className="mt-4 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-6 text-[var(--color-brand-warm-strong)]"
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
      listings.length === 0 ? (
        <section className="mt-4 rounded-lg border border-dashed border-[var(--border-strong)] bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">No active listings yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            Your community marketplace is ready. Start with everyday items
            students actually need: furniture, kitchen gear, books, electronics,
            bikes, and free pickup items.
          </p>
          <Link
            href="/sell"
            className="mt-5 inline-flex rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
          >
            Create the first listing
          </Link>
        </section>
      ) : null}

      {!listingsQuery.isLoading &&
      !listingsQuery.isError &&
      listings.length > 0 &&
      filteredListings.length === 0 ? (
        <section className="mt-4 rounded-lg border border-[var(--border-default)] bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold">
            No listings match those filters
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            Try a broader search, a different category, or clearing the
            verified-only filter.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-4 rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
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
              className="rounded-full border px-3 py-1.5 text-xs font-medium transition"
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
