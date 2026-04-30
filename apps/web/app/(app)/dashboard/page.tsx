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
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Seller dashboard
          </h1>
          <p className="mt-2 text-zinc-600">
            Manage your Sellr profile and community access.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Home
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800"
          >
            Sign out
          </button>
        </div>
      </div>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-zinc-500">Account</h2>
        {isLoading ? (
          <p className="mt-2 text-sm text-zinc-600">Loading profile…</p>
        ) : null}
        {isError ? (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {error instanceof Error ? error.message : 'Could not load profile'}
          </p>
        ) : null}
        {data ? (
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Display name</dt>
              <dd className="font-medium text-zinc-900">
                {data.user.displayName}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Phone</dt>
              <dd className="font-mono text-zinc-900">{data.user.phoneE164}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Communities</dt>
              <dd className="text-zinc-900">
                {data.communityIds.length === 0
                  ? 'None yet. Join a community to unlock marketplace flows.'
                  : `${data.communityIds.length} joined`}
              </dd>
            </div>
          </dl>
        ) : null}
      </section>

      {communityIds?.length === 0 ? (
        <section className="mt-6 rounded-xl border border-teal-200 bg-teal-50 p-6">
          <h2 className="text-base font-semibold text-teal-950">
            Join a community to start
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-teal-900">
            Sellr keeps browsing and selling scoped to trusted local groups.
            Add an invite code or community email before creating or viewing
            listings.
          </p>
          <Link
            href="/onboarding"
            className="mt-4 inline-flex rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            Join community
          </Link>
        </section>
      ) : (
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">
            Marketplace setup
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Community access is ready. Browse active listings from members in
            your verified local marketplace.
          </p>
          <Link
            href="/marketplace"
            className="mt-4 inline-flex rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            Browse marketplace
          </Link>
        </section>
      )}
    </main>
  );
}
