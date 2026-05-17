'use client';

import Link from 'next/link';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchMe,
  updateProfile,
  uploadProfileAvatar,
  type UpdateProfileInput,
} from '@sellr/api-client';
import {
  hasRealDisplayName,
  PROFILE_AVATAR_MAX_BYTES,
  PROFILE_AVATAR_MIME_TYPES,
  type ProfileCompletionIssue,
} from '@sellr/shared';
import { useAuth } from '@/components/auth-provider';
import {
  formatMemberSince,
  profileInitials,
} from '@/components/seller-profile-card';
import {
  PROFILE_COMPLETION_COPY,
  profileCompletionIssues,
} from '@/lib/profile-readiness';
import { contactVerificationLabel } from '@/lib/trust-signals';

type MeData = Awaited<ReturnType<typeof fetchMe>>;

function fieldClassName(hasError: boolean): string {
  return `mt-1.5 w-full rounded-[var(--radius-lg)] border bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:ring-2 ${
    hasError
      ? 'border-[var(--color-brand-warm)] focus:border-[var(--color-brand-warm)] focus:ring-[var(--color-brand-warm-soft)]'
      : 'border-black/10 focus:border-[var(--color-brand-contrast)] focus:ring-[var(--color-brand-contrast-muted)]'
  }`;
}

function contactLabel(me: MeData): string {
  return me.user.email ?? me.user.phoneE164 ?? 'Not set';
}

function issueHref(issue: ProfileCompletionIssue): string {
  return issue === 'community_membership' ? '/onboarding' : '#profile-details';
}

export default function ProfilePage() {
  const { userId } = useAuth();
  const meQuery = useQuery({
    queryKey: ['me', userId],
    queryFn: fetchMe,
    enabled: Boolean(userId),
  });

  if (meQuery.isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="app-panel p-5">
          <p className="text-sm text-[var(--text-secondary)]">
            Loading profile...
          </p>
        </section>
      </main>
    );
  }

  if (meQuery.isError || !meQuery.data) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="app-alert p-5">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            Could not load profile
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Refresh the page or return to your dashboard.
          </p>
          <Link
            href="/dashboard"
            className="app-action-secondary mt-4 px-4 py-2 text-sm"
          >
            Back to dashboard
          </Link>
        </section>
      </main>
    );
  }

  return <ProfileContent me={meQuery.data} userId={userId} />;
}

function ProfileContent({ me, userId }: { me: MeData; userId: string | null }) {
  const issues = profileCompletionIssues(me);
  const ready = issues.length === 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-10 sm:py-8">
      <header className="mb-6 border-b border-[var(--border-default)] pb-5 sm:pb-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)]">
              Profile
            </span>
            <h1 className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
              How you appear to buyers and sellers
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Buyers and sellers see these backed signals next to listings,
              conversations, and pickup coordination.
            </p>
          </div>
          <div className="grid gap-2 text-xs sm:min-w-[230px]">
            <span className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 font-semibold text-[var(--text-primary)]">
              Visible in messages
            </span>
            <span className="rounded-[var(--radius-lg)] border border-[var(--color-brand-contrast-muted)] bg-[var(--color-brand-contrast-soft)] px-3 py-2 font-semibold text-[var(--color-brand-contrast-strong)]">
              Listing/contact readiness
            </span>
          </div>
        </div>
        {userId ? (
          <Link
            href={`/sellers/${userId}`}
            className="app-action-secondary mt-5 px-4 py-2 text-sm"
          >
            View public storefront
          </Link>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <ProfileSummary me={me} ready={ready} issues={issues} />
          <ProfileEditor me={me} userId={userId} />
        </div>
        <ProfileReadinessPanel me={me} issues={issues} ready={ready} />
      </div>
    </main>
  );
}

function ProfileSummary({
  me,
  ready,
  issues,
}: {
  me: MeData;
  ready: boolean;
  issues: ProfileCompletionIssue[];
}) {
  return (
    <section className="app-panel p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          aria-label={`${me.user.displayName} avatar`}
          className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-[var(--color-brand-primary-muted)] bg-[var(--color-brand-primary)] bg-cover bg-center text-2xl font-bold text-[var(--text-primary)] shadow-sm"
          style={
            me.user.avatarUrl
              ? { backgroundImage: `url("${me.user.avatarUrl}")` }
              : undefined
          }
        >
          {me.user.avatarUrl ? null : profileInitials(me.user.displayName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)]">
            Public trust preview
          </p>
          <h2 className="break-words text-xl font-semibold text-[var(--text-primary)]">
            {me.user.displayName}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            This is the name, contact status, and community context buyers and
            sellers see before pickup.
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {contactVerificationLabel(me.user)} | Member since{' '}
            {formatMemberSince(me.user.memberSince ?? me.user.createdAt)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--color-brand-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-brand-accent-strong)]">
              {me.communityIds.length === 0
                ? 'No community yet'
                : `${me.communityIds.length} joined`}
            </span>
            <span className="rounded-full bg-[var(--color-brand-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-brand-primary-strong)]">
              {ready
                ? 'Visible with backed trust signals'
                : `${issues.length} ${issues.length === 1 ? 'step' : 'steps'} left`}
            </span>
          </div>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 border-t border-black/10 pt-5 text-sm sm:grid-cols-3">
        <ProfileFact
          label="Contact method"
          value={`${contactVerificationLabel(me.user)} · ${contactLabel(me)}`}
          tone="accent"
        />
        <ProfileFact
          label="Communities"
          value={
            me.communityIds.length === 0
              ? 'None yet'
              : `${me.communityIds.length} joined`
          }
          tone="primary"
        />
        <ProfileFact
          label="Active listings"
          value={String(me.user.listingCount ?? 0)}
          tone="contrast"
        />
      </dl>
    </section>
  );
}

function ProfileFact({
  label,
  value,
  tone = 'plain',
}: {
  label: string;
  value: string;
  tone?: 'plain' | 'primary' | 'contrast' | 'accent';
}) {
  const toneClass =
    tone === 'primary'
      ? 'text-[var(--color-brand-primary-strong)]'
      : tone === 'contrast'
        ? 'text-[var(--color-brand-contrast)]'
        : tone === 'accent'
          ? 'text-[var(--color-brand-accent-strong)]'
          : 'text-[var(--text-primary)]';

  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
      </dt>
      <dd className={`mt-1 break-words font-medium ${toneClass}`}>
        {value}
      </dd>
    </div>
  );
}

function ProfileEditor({ me, userId }: { me: MeData; userId: string | null }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [displayName, setDisplayName] = useState(me.user.displayName);
  const [avatarUrl, setAvatarUrl] = useState(me.user.avatarUrl);
  const [formError, setFormError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const syncProfile = async (updated: MeData) => {
    queryClient.setQueryData(['me', userId], updated);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['me', userId] }),
      queryClient.invalidateQueries({ queryKey: ['conversations'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-conversations'] }),
      queryClient.invalidateQueries({ queryKey: ['listing'] }),
      queryClient.invalidateQueries({ queryKey: ['community-listings'] }),
      queryClient.invalidateQueries({ queryKey: ['my-listings'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-listings'] }),
      queryClient.invalidateQueries({ queryKey: ['seller-storefront'] }),
    ]);
  };

  const profileMutation = useMutation({
    mutationFn: (body: UpdateProfileInput) => updateProfile(body),
    onSuccess: async (updated) => {
      setDisplayName(updated.user.displayName);
      setAvatarUrl(updated.user.avatarUrl);
      setFormError(null);
      await syncProfile(updated);
    },
  });

  const avatarMutation = useMutation({
    mutationFn: async (file: File | null) => {
      const uploaded = file ? await uploadProfileAvatar(file) : { url: null };
      return updateProfile({
        displayName: me.user.displayName,
        avatarUrl: uploaded.url,
      });
    },
    onSuccess: async (updated) => {
      setAvatarUrl(updated.user.avatarUrl);
      setAvatarError(null);
      await syncProfile(updated);
    },
    onError: (error) => {
      setAvatarError(
        error instanceof Error
          ? error.message
          : 'Could not update this profile photo. Try again.',
      );
    },
  });

  const trimmedName = displayName.trim();
  const dirty = trimmedName !== me.user.displayName;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!hasRealDisplayName(trimmedName)) {
      setFormError('Use your real name or a recognizable display name.');
      return;
    }

    profileMutation.mutate({
      displayName: trimmedName,
      avatarUrl,
    });
  };

  const handleAvatarFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setAvatarError(null);

    if (!file) return;

    if (
      !PROFILE_AVATAR_MIME_TYPES.includes(
        file.type as (typeof PROFILE_AVATAR_MIME_TYPES)[number],
      )
    ) {
      setAvatarError('Upload a JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > PROFILE_AVATAR_MAX_BYTES) {
      setAvatarError('Keep this image under 3 MB.');
      return;
    }

    avatarMutation.mutate(file);
  };

  return (
    <section id="profile-details" className="app-panel scroll-mt-24 p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Profile details
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            Your display name and photo anchor the trust cues that appear near
            listings and messages.
          </p>
        </div>
        <span className="rounded-full bg-[var(--color-brand-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-brand-primary-strong)]">
          Editable
        </span>
      </header>

      <div className="mt-4 flex flex-col gap-4 border-t border-[var(--border-default)] pt-4 sm:flex-row sm:items-center">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[var(--color-brand-primary-muted)] bg-[var(--color-brand-primary)] bg-cover bg-center text-base font-bold text-[var(--text-primary)] shadow-sm"
          style={
            avatarUrl ? { backgroundImage: `url("${avatarUrl}")` } : undefined
          }
          aria-hidden="true"
        >
          {avatarUrl ? null : profileInitials(me.user.displayName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Profile photo
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            Use a recognizable image so buyers and sellers know who they are
            coordinating with. JPG, PNG, or WebP under 3 MB.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={PROFILE_AVATAR_MIME_TYPES.join(',')}
              className="sr-only"
              onChange={handleAvatarFile}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarMutation.isPending}
              className="app-action-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              {avatarMutation.isPending ? 'Uploading...' : 'Upload photo'}
            </button>
            {avatarUrl ? (
              <button
                type="button"
                onClick={() => avatarMutation.mutate(null)}
                disabled={avatarMutation.isPending}
                className="app-action-secondary border-[var(--color-brand-warm)] px-3 py-1.5 text-xs text-[var(--color-brand-warm-strong)] hover:bg-[var(--color-brand-warm-soft)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove
              </button>
            ) : null}
          </div>
          {avatarError ? (
            <p className="mt-2 text-xs font-medium text-[var(--color-brand-warm-strong)]">
              {avatarError}
            </p>
          ) : null}
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-[var(--text-primary)]">
          Display name
          <input
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setFormError(null);
            }}
            maxLength={60}
            autoComplete="name"
            className={fieldClassName(Boolean(formError))}
          />
        </label>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <ProfileFact
            label="Contact method"
            value={`${contactVerificationLabel(me.user)} · ${contactLabel(me)}`}
          />
          <ProfileFact
            label="Communities"
            value={
              me.communityIds.length === 0
                ? 'None yet'
                : `${me.communityIds.length} joined`
            }
          />
        </dl>

        {formError || profileMutation.isError ? (
          <p
            className="app-alert p-3 text-sm md:col-span-2"
            role="alert"
          >
            {formError ??
              (profileMutation.error instanceof Error
                ? profileMutation.error.message
                : 'Could not update your profile. Try again.')}
          </p>
        ) : null}

        {profileMutation.isSuccess && !dirty ? (
          <p className="app-list-row border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)] p-3 text-sm font-medium text-[var(--color-brand-accent-strong)] md:col-span-2">
            Profile updated.
          </p>
        ) : null}

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={profileMutation.isPending || !dirty}
            className="app-action-primary px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {profileMutation.isPending ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      </form>
    </section>
  );
}

function ProfileReadinessPanel({
  me,
  issues,
  ready,
}: {
  me: MeData;
  issues: ProfileCompletionIssue[];
  ready: boolean;
}) {
  const checks: Array<{
    issue: ProfileCompletionIssue;
    complete: boolean;
    completeLabel: string;
  }> = [
    {
      issue: 'display_name',
      complete: !issues.includes('display_name'),
      completeLabel: 'Real display name added',
    },
    {
      issue: 'verified_contact',
      complete: !issues.includes('verified_contact'),
      completeLabel: contactVerificationLabel(me.user),
    },
    {
      issue: 'community_membership',
      complete: !issues.includes('community_membership'),
      completeLabel:
        me.communityIds.length === 0
          ? 'Community needed'
          : 'Active community membership',
    },
  ];

  return (
    <aside className="space-y-5">
      <section className="app-panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Profile readiness
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Complete these so marketplace actions can show backed identity
              instead of blank profile context.
            </p>
          </div>
          <span className="rounded-full border border-[var(--color-brand-primary-muted)] bg-[var(--color-brand-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-brand-primary-strong)]">
            {ready ? 'Ready' : `${issues.length} left`}
          </span>
        </div>

        <div className="mt-5 divide-y divide-[var(--border-default)] border-y border-[var(--border-default)]">
          {checks.map((check) => {
            const copy = PROFILE_COMPLETION_COPY[check.issue];
            return (
              <div
                key={check.issue}
                className="py-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                      check.complete
                        ? 'border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)] text-[var(--color-brand-accent-strong)]'
                        : 'border-[var(--color-brand-primary-muted)] bg-[var(--color-brand-primary-soft)] text-[var(--color-brand-primary-strong)]'
                    }`}
                    aria-hidden="true"
                  >
                    {check.complete ? (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m5 12 5 5L20 7" />
                      </svg>
                    ) : (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 7v6" />
                        <path d="M12 17h.01" />
                      </svg>
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {check.complete ? check.completeLabel : copy.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                      {check.complete
                        ? 'Shown as a backed profile signal.'
                        : copy.body}
                    </p>
                    {!check.complete ? (
                      <Link
                        href={issueHref(check.issue)}
                        className="mt-2 inline-flex text-xs font-semibold text-[var(--color-brand-contrast)] no-underline hover:underline"
                      >
                        {copy.action}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="app-panel-soft p-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-contrast)] text-xs font-bold text-white"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5" />
              <path d="M12 8h.01" />
            </svg>
          </span>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Trust tips
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              A recognizable name, verified contact, and active community
              membership help people decide whether to message, sell, or meet
              locally.
            </p>
          </div>
        </div>
      </section>
    </aside>
  );
}
