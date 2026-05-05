'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchCommunityListings,
  type ApiListing,
} from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';
import { ListingCard } from '@/components/listing-card';
import {
  CONDITION_LABELS,
} from '@/lib/listing-format';
import { ACTIVITY_REFETCH_INTERVAL_MS } from '@/lib/query-refresh';

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

export default function MarketplacePage() {
  const { primaryCommunityId } = useAuth();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [condition, setCondition] = useState('all');

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

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      return (
        listingMatchesQuery(listing, query.trim()) &&
        (category === 'all' || listing.category === category) &&
        (condition === 'all' || listing.condition === condition)
      );
    });
  }, [category, condition, listings, query]);

  const clearFilters = () => {
    setQuery('');
    setCategory('all');
    setCondition('all');
  };

  if (!primaryCommunityId) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section className="rounded-lg border border-[var(--border-default)] bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">
            Join a community first
          </h1>
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
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-brand-contrast)]">
            Community marketplace
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-[var(--text-primary)]">
            Browse local listings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Active listings from your verified community, organized for quick
            scanning and clear buyer intent.
          </p>
        </div>
        <div className="w-full rounded-lg border border-[var(--border-default)] bg-white px-4 py-3 text-sm shadow-sm sm:w-auto">
          <span className="font-semibold text-[var(--text-primary)]">
            {listings.length}
          </span>{' '}
          <span className="text-[var(--text-secondary)]">active listings</span>
        </div>
        <Link
          href="/sell"
          className="inline-flex w-full justify-center rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)] sm:w-auto"
        >
          Sell an item
        </Link>
      </div>

      <section className="mt-6 rounded-lg border border-[var(--border-default)] bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Search
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search titles, details, or neighborhoods"
              className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
            />
          </label>

          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Condition
            <select
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
            >
              <option value="all">Any condition</option>
              {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {listingsQuery.isLoading ? (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-lg border border-[var(--border-default)] bg-white shadow-sm"
            >
              <div className="h-44 bg-[var(--bg-tertiary)]" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-20 rounded bg-[var(--bg-tertiary)]" />
                <div className="h-5 w-3/4 rounded bg-[var(--bg-tertiary)]" />
                <div className="h-4 w-full rounded bg-[var(--bg-tertiary)]" />
                <div className="h-4 w-1/2 rounded bg-[var(--bg-tertiary)]" />
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {listingsQuery.isError ? (
        <section
          className="mt-6 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-6 text-[var(--color-brand-warm-strong)]"
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
        <section className="mt-6 rounded-lg border border-dashed border-[var(--border-strong)] bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">
            No active listings yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            Your community marketplace is ready. Published listings will appear
            here as members add items for sale.
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
        <section className="mt-6 rounded-lg border border-[var(--border-default)] bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold">
            No listings match those filters
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            Try a broader search, a different category, or any condition.
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
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </section>
      ) : null}
    </main>
  );
}
