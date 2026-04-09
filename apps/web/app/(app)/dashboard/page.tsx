'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchMe } from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';

export default function DashboardPage() {
  const router = useRouter();
  const { logout, userId } = useAuth();
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
            Signed in with the same phone OTP flow as the mobile app.
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
                  ? 'None yet — join a community from the mobile app.'
                  : `${data.communityIds.length} joined`}
              </dd>
            </div>
          </dl>
        ) : null}
      </section>
    </main>
  );
}
