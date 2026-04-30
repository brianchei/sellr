'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchMe } from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';

export default function DashboardPage() {
  const router = useRouter();
  const { communityIds, logout, userId } = useAuth();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['me', userId],
    queryFn: fetchMe,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-brand-contrast)]">
            Account home
          </p>
          <h1 className="mt-1 text-2xl font-semibold">
            Seller dashboard
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Manage your Sellr profile and community access.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-lg border border-[var(--border-strong)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-tertiary)]"
          >
            Home
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="rounded-lg bg-[var(--color-brand-contrast)] px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--color-brand-contrast-hover)]"
          >
            Sign out
          </button>
        </div>
      </div>

      <section className="mt-8 rounded-lg border border-[var(--border-default)] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-[var(--text-tertiary)]">Account</h2>
        {isLoading ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Loading profile…</p>
        ) : null}
        {isError ? (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {error instanceof Error ? error.message : 'Could not load profile'}
          </p>
        ) : null}
        {data ? (
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--text-tertiary)]">Display name</dt>
              <dd className="font-medium text-[var(--text-primary)]">
                {data.user.displayName}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-tertiary)]">Phone</dt>
              <dd className="font-mono text-[var(--text-primary)]">{data.user.phoneE164}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[var(--text-tertiary)]">Communities</dt>
              <dd className="text-[var(--text-primary)]">
                {data.communityIds.length === 0
                  ? 'None yet. Join a community to unlock marketplace flows.'
                  : `${data.communityIds.length} joined`}
              </dd>
            </div>
          </dl>
        ) : null}
      </section>

      {communityIds?.length === 0 ? (
        <section className="mt-6 rounded-lg border border-[var(--color-brand-primary-muted)] bg-[var(--color-brand-primary-soft)] p-6">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Join a community to start
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Sellr keeps browsing and selling scoped to trusted local groups.
            Add an invite code or community email before creating or viewing
            listings.
          </p>
          <Link
            href="/onboarding"
            className="mt-4 inline-flex rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
          >
            Join community
          </Link>
        </section>
      ) : (
        <section className="mt-6 rounded-lg border border-[var(--border-default)] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Marketplace setup
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Community access is ready. Browse active listings, create items,
            and keep your seller inventory current.
          </p>
          <Link
            href="/marketplace"
            className="mt-4 inline-flex rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
          >
            Browse marketplace
          </Link>
          <Link
            href="/listings"
            className="ml-2 mt-4 inline-flex rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-tertiary)]"
          >
            Manage listings
          </Link>
          <Link
            href="/sell"
            className="ml-2 mt-4 inline-flex rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-tertiary)]"
          >
            Create listing
          </Link>
        </section>
      )}
    </main>
  );
}
