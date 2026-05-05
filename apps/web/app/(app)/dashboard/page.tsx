'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMe, updateProfile } from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';
import {
  SellerProfileCard,
  profileInitials,
} from '@/components/seller-profile-card';

type MeData = Awaited<ReturnType<typeof fetchMe>>;

function ProfileEditor({
  data,
  userId,
}: {
  data: MeData;
  userId: string | null;
}) {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(data.user.displayName);
  const [formError, setFormError] = useState<string | null>(null);

  const profileMutation = useMutation({
    mutationFn: (name: string) => updateProfile({ displayName: name }),
    onSuccess: async (updated) => {
      setDisplayName(updated.user.displayName);
      setFormError(null);
      queryClient.setQueryData(['me', userId], updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me', userId] }),
        queryClient.invalidateQueries({ queryKey: ['conversations'] }),
      ]);
    },
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = displayName.trim();

    if (trimmed.length < 2) {
      setFormError('Use at least 2 characters for your display name.');
      return;
    }
    if (trimmed.length > 60) {
      setFormError('Keep your display name under 60 characters.');
      return;
    }

    profileMutation.mutate(trimmed);
  };

  return (
    <div className="mt-4 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <SellerProfileCard
        profile={data.user}
        heading="Profile preview"
        contextLabel="This is how buyers and sellers see you."
        className="shadow-none"
      />

      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4"
      >
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-[var(--border-strong)] bg-white p-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-sm font-bold text-[var(--text-primary)]">
            {profileInitials(displayName)}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Avatar placeholder
            </p>
            <p className="text-xs leading-5 text-[var(--text-secondary)]">
              Sellr uses your initials until profile photo upload is added.
            </p>
          </div>
        </div>

        <label className="mt-4 block text-sm font-medium text-[var(--text-primary)]">
          Display name
          <input
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setFormError(null);
            }}
            maxLength={60}
            autoComplete="name"
            className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
          />
        </label>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--text-tertiary)]">Phone</dt>
            <dd className="font-mono text-[var(--text-primary)]">
              {data.user.phoneE164}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--text-tertiary)]">Communities</dt>
            <dd className="text-[var(--text-primary)]">
              {data.communityIds.length === 0
                ? 'None yet'
                : `${data.communityIds.length} joined`}
            </dd>
          </div>
        </dl>

        {formError || profileMutation.isError ? (
          <p
            className="mt-4 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-3 text-sm text-[var(--color-brand-warm-strong)]"
            role="alert"
          >
            {formError ??
              (profileMutation.error instanceof Error
                ? profileMutation.error.message
                : 'Could not update your profile. Try again.')}
          </p>
        ) : null}

        {profileMutation.isSuccess ? (
          <p className="mt-4 rounded-lg border border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)] p-3 text-sm font-medium text-[var(--color-brand-accent-strong)]">
            Profile updated.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={
            profileMutation.isPending ||
            displayName.trim() === data.user.displayName
          }
          className="mt-4 rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {profileMutation.isPending ? 'Saving...' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}

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
        <div className="flex flex-wrap gap-2">
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
          <ProfileEditor data={data} userId={userId} />
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
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/marketplace"
              className="inline-flex rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
            >
              Browse marketplace
            </Link>
            <Link
              href="/listings"
              className="inline-flex rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-tertiary)]"
            >
              Manage listings
            </Link>
            <Link
              href="/sell"
              className="inline-flex rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-tertiary)]"
            >
              Create listing
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
