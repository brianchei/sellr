import Link from 'next/link';
import type { ApiUserTrustProfile } from '@sellr/api-client';

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

function listingCountLabel(count: number | undefined): string {
  const safeCount = count ?? 0;
  return `${safeCount} active ${safeCount === 1 ? 'listing' : 'listings'}`;
}

export function SellerProfileCard({
  profile,
  heading = 'Seller',
  contextLabel = 'This member is in your community.',
  profileHref,
  profileLabel = 'View profile',
  editableHref,
  editableLabel = 'Edit profile',
  className = '',
}: SellerProfileCardProps) {
  const displayName = profile?.displayName ?? 'Community member';
  const memberSince = profile?.memberSince ?? profile?.createdAt ?? null;

  return (
    <section
      className={`rounded-lg border border-[var(--border-default)] bg-white p-5 shadow-sm ${className}`}
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
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--color-brand-primary-muted)] bg-[var(--color-brand-primary)] bg-cover bg-center text-sm font-bold text-[var(--text-primary)] shadow-sm"
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
        {profile?.communityMember !== false ? (
          <span className="rounded-full bg-[var(--color-brand-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-accent-strong)]">
            Community member
          </span>
        ) : null}
        {profile?.verifiedAt ? (
          <span className="rounded-full bg-[var(--color-brand-contrast-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-contrast)]">
            Verified sign-in
          </span>
        ) : null}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--border-default)] pt-4 text-sm">
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
            {listingCountLabel(profile?.listingCount)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
