import Link from 'next/link';
import type { ApiUserTrustProfile } from '@sellr/api-client';
import {
  activeListingCountLabel,
  communityTrustLabel,
  profileSignalSummary,
  publicContactVerificationLabel,
} from '@/lib/trust-signals';

type SellerProfileCardProps = {
  profile?: ApiUserTrustProfile | null;
  heading?: string;
  contextLabel?: string;
  profileHref?: string;
  profileLabel?: string;
  editableHref?: string;
  editableLabel?: string;
  className?: string;
};

export function profileInitials(name: string): string {
  const parts = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    parts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'M'
  );
}

export function formatMemberSince(value?: string | null): string {
  if (!value) {
    return 'Recently';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function SellerProfileCard({
  profile,
  heading = 'Seller',
  contextLabel = 'Profile signals are visible inside your community.',
  profileHref,
  profileLabel = 'View profile',
  editableHref,
  editableLabel = 'Edit profile',
  className = '',
}: SellerProfileCardProps) {
  const displayName = profile?.displayName ?? 'Community member';
  const memberSince = profile?.memberSince ?? profile?.createdAt ?? null;
  const contactSignal = publicContactVerificationLabel(profile);
  const communitySignal = communityTrustLabel(profile);
  const signalSummary = profileSignalSummary(profile);

  return (
    <section
      className={`app-panel p-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold">{heading}</h2>
        <div className="flex flex-wrap justify-end gap-3">
          {profileHref ? (
            <Link
              href={profileHref}
              className="text-sm font-medium text-[var(--color-brand-contrast)] no-underline hover:underline"
            >
              {profileLabel}
            </Link>
          ) : null}
          {editableHref ? (
            <Link
              href={editableHref}
              className="text-sm font-medium text-[var(--color-brand-contrast)] no-underline hover:underline"
            >
              {editableLabel}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div
          aria-label={`${displayName} avatar`}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--color-brand-primary-muted)] bg-[var(--color-brand-primary)] bg-cover bg-center text-sm font-bold text-[var(--text-primary)] shadow-md ring-4 ring-[var(--color-brand-primary-soft)]"
          style={
            profile?.avatarUrl
              ? { backgroundImage: `url("${profile.avatarUrl}")` }
              : undefined
          }
        >
          {profile?.avatarUrl ? null : profileInitials(displayName)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-[var(--text-primary)]">
            {displayName}
          </p>
          <p className="text-sm text-[var(--text-secondary)]">{contextLabel}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {communitySignal ? (
          <span className="rounded-full bg-[var(--color-brand-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-brand-accent-strong)]">
            {communitySignal}
          </span>
        ) : null}
        {contactSignal ? (
          <span className="rounded-full bg-[var(--color-brand-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-brand-primary-strong)]">
            {contactSignal}
          </span>
        ) : null}
      </div>

      {signalSummary ? (
        <p className="mt-3 rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]">
          {signalSummary}
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-black/10 pt-4 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
            Member since
          </dt>
          <dd className="mt-1 font-medium text-[var(--text-primary)]">
            {formatMemberSince(memberSince)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
            Listings
          </dt>
          <dd className="mt-1 font-medium text-[var(--text-primary)]">
            {activeListingCountLabel(profile?.listingCount)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
