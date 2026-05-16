'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createConversation,
  fetchListing,
  fetchMe,
  sendMessage,
  type ApiListing,
} from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';
import { PhotoGallery } from '@/components/photo-gallery';
import { ReportDialog } from '@/components/report-dialog';
import { profileInitials } from '@/components/seller-profile-card';
import {
  availabilityWindows,
  formatAvailabilityWindow,
  formatCondition,
  formatPrice,
  formatPostedDate,
  formatRadius,
  formatRelativeListedDate,
  photoUrls,
  type ListedFreshness,
} from '@/lib/listing-format';
import {
  ACTIVITY_REFETCH_INTERVAL_MS,
  invalidateConversationActivity,
} from '@/lib/query-refresh';
import {
  PROFILE_COMPLETION_COPY,
  profileCompletionIssues,
} from '@/lib/profile-readiness';
import {
  activeListingCountLabel,
  communityTrustLabel,
  publicContactVerificationLabel,
} from '@/lib/trust-signals';
import type { ProfileCompletionIssue } from '@sellr/shared';

const DEFAULT_MESSAGE =
  'Hi, is this still available? I can pick up locally this week.';

type QuickReply = {
  id: string;
  label: string;
  text: string;
  negotiableOnly?: boolean;
};

const QUICK_REPLIES: QuickReply[] = [
  {
    id: 'available',
    label: 'Is this still available?',
    text: 'Hi, is this still available? I can pick up locally this week.',
  },
  {
    id: 'weekend',
    label: 'Pickup this weekend?',
    text: 'Hi, is this still available? Could I pick up this Saturday or Sunday around your listed window?',
  },
  {
    id: 'offer',
    label: 'Make an offer',
    text: 'Hi, is this still available? Would you consider a slightly lower price? Happy to coordinate a quick local pickup.',
    negotiableOnly: true,
  },
  {
    id: 'question',
    label: 'I have a quick question',
    text: 'Hi, is this still available? I had a quick question before pickup: ',
  },
];

const STATUS_TONE: Record<
  string,
  { bg: string; fg: string; label: string }
> = {
  active: {
    bg: 'var(--color-brand-accent-soft)',
    fg: 'var(--color-brand-accent-strong)',
    label: 'Active',
  },
  draft: {
    bg: 'var(--color-brand-primary-soft)',
    fg: 'var(--color-brand-primary-strong)',
    label: 'Draft',
  },
  sold: {
    bg: 'var(--color-brand-contrast-soft)',
    fg: 'var(--color-brand-contrast)',
    label: 'Sold',
  },
  expired: {
    bg: 'var(--bg-tertiary)',
    fg: 'var(--text-secondary)',
    label: 'Expired',
  },
  pending_review: {
    bg: 'var(--color-brand-warm-soft)',
    fg: 'var(--color-brand-warm-strong)',
    label: 'In review',
  },
};

function statusDisplay(status: string) {
  return (
    STATUS_TONE[status] ?? {
      bg: 'var(--bg-tertiary)',
      fg: 'var(--text-secondary)',
      label: status.replaceAll('_', ' '),
    }
  );
}

function freshnessClasses(tone: ListedFreshness['tone']) {
  if (tone === 'fresh') {
    return 'border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)] text-[var(--color-brand-accent-strong)]';
  }
  if (tone === 'recent') {
    return 'border-[var(--color-brand-contrast-muted)] bg-[var(--color-brand-contrast-soft)] text-[var(--color-brand-contrast)]';
  }
  return 'border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]';
}

function photoCountLabel(count: number): string {
  if (count === 0) {
    return 'No photos';
  }
  return `${count} ${count === 1 ? 'photo' : 'photos'}`;
}

function sellerDisplayName(listing: ApiListing): string {
  return listing.seller?.displayName?.trim() || 'Community seller';
}

function SellerContactSummary({
  listing,
  isOwnListing,
}: {
  listing: ApiListing;
  isOwnListing: boolean;
}) {
  const sellerName = sellerDisplayName(listing);
  const sellerHref = listing.seller ? `/sellers/${listing.seller.id}` : null;
  const sellerListings = activeListingCountLabel(listing.seller?.listingCount);
  const contactSignal = publicContactVerificationLabel(listing.seller);
  const communitySignal = communityTrustLabel(listing.seller);

  return (
    <section aria-label="Seller confidence" className="mt-4">
      <div className="flex items-start gap-3">
        <div
          aria-label={`${sellerName} avatar`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-brand-primary-muted)] bg-[var(--color-brand-primary)] bg-cover bg-center text-xs font-bold text-[var(--text-primary)] ring-4 ring-[var(--color-brand-primary-soft)]"
          style={
            listing.seller?.avatarUrl
              ? { backgroundImage: `url("${listing.seller.avatarUrl}")` }
              : undefined
          }
        >
          {listing.seller?.avatarUrl ? null : profileInitials(sellerName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                {isOwnListing ? 'Your seller profile' : 'Seller confidence'}
              </p>
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {sellerName}
              </p>
            </div>
            {sellerHref ? (
              <Link
                href={sellerHref}
                className="shrink-0 text-xs font-semibold text-[var(--color-brand-contrast)] no-underline hover:underline"
              >
                View storefront
              </Link>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
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
            <span className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
              {sellerListings}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function PickupContactSummary({
  listing,
  windows,
}: {
  listing: ApiListing;
  windows: ReturnType<typeof availabilityWindows>;
}) {
  const firstWindow = windows[0];

  return (
    <section
      aria-label="Pickup confidence"
      className="mt-4 divide-y divide-[var(--border-default)] border-y border-[var(--border-default)]"
    >
      <div className="flex gap-3 py-3">
        <svg
          className="mt-0.5 shrink-0 text-[var(--color-brand-contrast)]"
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
          <path d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12Z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
            Pickup area
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {listing.locationNeighborhood}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">
            {formatRadius(listing.locationRadiusM)} radius. Exact spot is
            shared after both sides agree.
          </p>
        </div>
      </div>

      <div className="flex gap-3 py-3">
        <svg
          className="mt-0.5 shrink-0 text-[var(--color-brand-contrast)]"
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
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 2v4" />
          <path d="M16 2v4" />
        </svg>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
            Timing
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {firstWindow
              ? formatAvailabilityWindow(firstWindow)
              : 'Ask in your message'}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">
            {windows.length > 1
              ? `${windows.length - 1} more ${
                  windows.length === 2 ? 'window' : 'windows'
                } listed below.`
              : 'Confirm pickup timing before heading out.'}
          </p>
        </div>
      </div>
    </section>
  );
}

function ListingReportAction({ listingId }: { listingId: string }) {
  return (
    <div className="mt-4 border-t border-[var(--border-default)] pt-4">
      <p className="text-xs leading-5 text-[var(--text-tertiary)]">
        Something off? Report stays tied to this listing and goes to a
        moderator.
      </p>
      <div className="mt-2">
        <ReportDialog
          targetId={listingId}
          targetType="listing"
          subjectLabel="this listing"
          contextLabel="Listing reports stay tied to this item and its community."
          triggerLabel="Report listing"
          triggerClassName="inline-flex items-center justify-center rounded-full border border-[var(--color-brand-warm)] bg-[var(--bg-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-warm-strong)] hover:bg-[var(--color-brand-warm-soft)]"
        />
      </div>
    </div>
  );
}

function DetailStat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="border-l border-[var(--border-default)] pl-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </dd>
      {note ? (
        <dd className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">
          {note}
        </dd>
      ) : null}
    </div>
  );
}

function ListingAtAGlance({
  listing,
  photoCount,
  freshness,
}: {
  listing: ApiListing;
  photoCount: number;
  freshness: ListedFreshness | null;
}) {
  const status = statusDisplay(listing.status);
  const sellerName = sellerDisplayName(listing);

  return (
    <section aria-labelledby="listing-glance-heading" className="mt-6">
      <h2
        id="listing-glance-heading"
        className="text-sm font-semibold text-[var(--text-primary)]"
      >
        At a glance
      </h2>
      <dl className="mt-3 grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        <DetailStat
          label="Listed"
          value={freshness?.label ?? 'Recently listed'}
          note={formatPostedDate(listing.createdAt)}
        />
        <DetailStat
          label="Pickup"
          value={listing.locationNeighborhood}
          note={`Approx. ${formatRadius(listing.locationRadiusM)} radius`}
        />
        <DetailStat
          label="Photos"
          value={photoCountLabel(photoCount)}
          note={
            photoCount > 0 ? 'Review condition before messaging.' : undefined
          }
        />
        <DetailStat
          label="Seller"
          value={sellerName}
          note={`${status.label} listing · ${activeListingCountLabel(
            listing.seller?.listingCount,
          )}`}
        />
      </dl>
    </section>
  );
}

export default function ListingDetailPage() {
  const params = useParams<{ listingId: string }>();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const listingId = params.listingId;
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [activeQuickReply, setActiveQuickReply] =
    useState<string>('available');
  const [messageError, setMessageError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sentConversationId, setSentConversationId] = useState<string | null>(
    null,
  );

  const listingQuery = useQuery({
    queryKey: ['listing', listingId],
    queryFn: () => fetchListing(listingId),
    enabled: Boolean(listingId),
    refetchInterval: ACTIVITY_REFETCH_INTERVAL_MS,
  });
  const meQuery = useQuery({
    queryKey: ['me', userId],
    queryFn: fetchMe,
    enabled: Boolean(userId),
  });

  const contactMutation = useMutation({
    mutationFn: async (content: string) => {
      const { conversation } = await createConversation({ listingId });
      const { message: sentMessage } = await sendMessage(conversation.id, {
        content,
      });
      return { conversation, message: sentMessage };
    },
    onSuccess: async ({ conversation }) => {
      setSent(true);
      setSentConversationId(conversation.id);
      setMessage('');
      setMessageError(null);
      await invalidateConversationActivity(queryClient, conversation.id);
    },
  });

  const listing = listingQuery.data?.listing;
  const photos = photoUrls(listing?.photoUrls);
  const windows = availabilityWindows(listing?.availabilityWindows);
  const isOwnListing = listing ? listing.sellerId === userId : false;
  const isAvailable = listing?.status === 'active';
  const profileIssues = profileCompletionIssues(meQuery.data);
  const blockingProfileIssue = isOwnListing ? undefined : profileIssues[0];
  const status = listing ? statusDisplay(listing.status) : null;
  const freshness = useMemo(
    () => (listing ? formatRelativeListedDate(listing.createdAt) : null),
    [listing],
  );

  // Reset per-listing UI state when the user navigates to a different listing.
  // (React 19 "store info from previous renders" pattern, preferred over an
  //  effect that synchronously calls setState.)
  const [trackedListingId, setTrackedListingId] = useState<string | null>(null);
  if (listing?.id && listing.id !== trackedListingId) {
    setTrackedListingId(listing.id);
    setSelectedPhotoIndex(0);
    setMessage(DEFAULT_MESSAGE);
    setActiveQuickReply('available');
    setMessageError(null);
    setSent(false);
    setSentConversationId(null);
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessageError(null);

    const trimmed = message.trim();
    if (blockingProfileIssue) {
      setMessageError('Complete your profile before contacting a seller.');
      return;
    }
    if (trimmed.length < 10) {
      setMessageError('Write a little more so the seller knows what you need.');
      return;
    }
    if (trimmed.length > 8000) {
      setMessageError('Keep the message under 8000 characters.');
      return;
    }

    contactMutation.mutate(trimmed);
  };

  const applyQuickReply = (reply: QuickReply) => {
    setActiveQuickReply(reply.id);
    setMessage(reply.text);
    setMessageError(null);
  };

  if (listingQuery.isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="h-5 w-28 rounded bg-[var(--bg-tertiary)]" />
        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="app-panel overflow-hidden">
            <div className="aspect-[4/3] bg-[var(--bg-tertiary)]" />
            <div className="space-y-3 p-5">
              <div className="h-4 w-32 rounded bg-[var(--bg-tertiary)]" />
              <div className="h-7 w-3/4 rounded bg-[var(--bg-tertiary)]" />
              <div className="h-4 w-full rounded bg-[var(--bg-tertiary)]" />
              <div className="h-4 w-2/3 rounded bg-[var(--bg-tertiary)]" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="app-panel h-44" />
            <div className="app-panel h-64" />
          </div>
        </section>
      </main>
    );
  }

  if (listingQuery.isError || !listing) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section
          className="app-alert p-6"
          role="alert"
        >
          <h1 className="text-xl font-semibold">Could not load listing</h1>
          <p className="mt-2 text-sm leading-6">
            {listingQuery.error instanceof Error
              ? listingQuery.error.message
              : 'The listing may no longer be available.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void listingQuery.refetch()}
              className="w-full rounded-lg bg-[var(--color-brand-warm)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-warm-strong)] sm:w-auto"
            >
              Retry
            </button>
            <Link
              href="/marketplace"
              className="app-action-secondary w-full px-4 py-2 text-sm sm:w-auto"
            >
              Back to browse
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-10 sm:py-8">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-brand-contrast)] no-underline hover:underline"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to browse
      </Link>

      <section className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article className="app-panel overflow-hidden">
          <PhotoGallery
            photos={photos}
            selectedIndex={selectedPhotoIndex}
            onSelect={setSelectedPhotoIndex}
            title={listing.title}
            category={listing.category}
            subcategory={listing.subcategory}
          />

          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {freshness ? (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${freshnessClasses(freshness.tone)}`}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-current"
                        aria-hidden="true"
                      />
                      {freshness.label}
                    </span>
                  ) : null}
                  {!isAvailable && status ? (
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ background: status.bg, color: status.fg }}
                    >
                      {status.label}
                    </span>
                  ) : null}
                </div>
                <h1 className="mt-3 break-words text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
                  {listing.title}
                </h1>
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12Z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                  {listing.locationNeighborhood} ·{' '}
                  {formatRadius(listing.locationRadiusM)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
                  {formatPrice(listing.price)}
                </p>
                {listing.negotiable ? (
                  <p className="mt-1 text-xs font-medium text-[var(--color-brand-primary-strong)]">
                    Open to offers
                  </p>
                ) : (
                  <p className="mt-1 text-xs font-medium text-[var(--text-tertiary)]">
                    Firm price
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                {formatCondition(listing.condition)}
              </span>
              <span className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                {listing.category}
              </span>
              {listing.subcategory ? (
                <span className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                  {listing.subcategory}
                </span>
              ) : null}
            </div>

            <ListingAtAGlance
              listing={listing}
              photoCount={photos.length}
              freshness={freshness}
            />

            <div className="mt-6 border-t border-[var(--border-default)] pt-6">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Description
              </h2>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-secondary)]">
                {listing.description}
              </p>
            </div>

            {listing.conditionNote ? (
              <div className="mt-5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v4" />
                    <path d="M12 16h.01" />
                  </svg>
                  Condition note from the seller
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
                  {listing.conditionNote}
                </p>
              </div>
            ) : null}

            <section className="mt-6 border-t border-[var(--border-default)] pt-6">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Pickup and timing
              </h2>
              <div className="mt-3 grid gap-5 sm:grid-cols-2">
                <div className="border-l border-[var(--color-brand-contrast-muted)] pl-4">
                  <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12Z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                    Approximate area
                  </h3>
                  <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                    {listing.locationNeighborhood}
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-[var(--text-tertiary)]">
                    {formatRadius(listing.locationRadiusM)} radius. Precise
                    spot is shared once both sides agree.
                  </p>
                </div>

                <div className="border-l border-[var(--color-brand-contrast-muted)] pl-4">
                  <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="3" y="4" width="18" height="17" rx="2" />
                      <path d="M3 10h18" />
                      <path d="M8 2v4" />
                      <path d="M16 2v4" />
                    </svg>
                    Best pickup windows
                  </h3>
                  {windows.length > 0 ? (
                    <ul className="mt-1.5 space-y-1 text-sm text-[var(--text-primary)]">
                      {windows.map((window, index) => (
                        <li key={index} className="flex items-baseline gap-2">
                          <span className="h-1 w-1 rounded-full bg-[var(--color-brand-contrast)]" />
                          {formatAvailabilityWindow(window)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                      Ask the seller about timing in your message.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <ContactCard
            listing={listing}
            windows={windows}
            isOwnListing={isOwnListing}
            isAvailable={isAvailable}
            sent={sent}
            sentConversationId={sentConversationId}
            profileIssue={blockingProfileIssue}
            profileLoading={!isOwnListing && meQuery.isLoading}
            message={message}
            messageError={messageError}
            activeQuickReply={activeQuickReply}
            quickReplies={QUICK_REPLIES.filter(
              (reply) => !reply.negotiableOnly || listing.negotiable,
            )}
            isPending={contactMutation.isPending}
            isError={contactMutation.isError}
            errorMessage={
              contactMutation.error instanceof Error
                ? contactMutation.error.message
                : null
            }
            onApplyQuickReply={applyQuickReply}
            onMessageChange={(value) => {
              setMessage(value);
              setMessageError(null);
              setActiveQuickReply('');
            }}
            onSubmit={onSubmit}
          />

          <SafePickupCard />
        </aside>
      </section>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Contact card                                                                */
/* -------------------------------------------------------------------------- */

function ContactCard({
  listing,
  windows,
  isOwnListing,
  isAvailable,
  sent,
  sentConversationId,
  profileIssue,
  profileLoading,
  message,
  messageError,
  activeQuickReply,
  quickReplies,
  isPending,
  isError,
  errorMessage,
  onApplyQuickReply,
  onMessageChange,
  onSubmit,
}: {
  listing: ApiListing;
  windows: ReturnType<typeof availabilityWindows>;
  isOwnListing: boolean;
  isAvailable: boolean;
  sent: boolean;
  sentConversationId: string | null;
  profileIssue: ProfileCompletionIssue | undefined;
  profileLoading: boolean;
  message: string;
  messageError: string | null;
  activeQuickReply: string;
  quickReplies: QuickReply[];
  isPending: boolean;
  isError: boolean;
  errorMessage: string | null;
  onApplyQuickReply: (reply: QuickReply) => void;
  onMessageChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="app-panel p-5">
      <h2 className="text-base font-semibold text-[var(--text-primary)]">
        {isOwnListing ? 'Your listing' : 'Contact seller'}
      </h2>

      {!isOwnListing ? (
        <>
          <SellerContactSummary
            listing={listing}
            isOwnListing={isOwnListing}
          />
          <PickupContactSummary listing={listing} windows={windows} />
        </>
      ) : null}

      {isOwnListing ? (
        <div className="mt-4 border-y border-[var(--color-brand-primary-muted)] bg-[var(--color-brand-primary-soft)] py-4">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            This is your listing.
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            Buyers contact you from this page once it is active. You will see
            inbound messages in your inbox.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link
              href={`/listings/${listing.id}/edit`}
              className="app-action-primary justify-center px-4 py-2 text-sm"
            >
              Edit listing
            </Link>
            <Link
              href="/listings"
              className="app-action-secondary justify-center px-4 py-2 text-sm"
            >
              My listings
            </Link>
          </div>
        </div>
      ) : !isAvailable ? (
        <div className="app-alert mt-3 p-4">
          <p className="text-sm font-medium text-[var(--color-brand-warm-strong)]">
            This listing is not currently available.
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--color-brand-warm-strong)] opacity-90">
            The seller may have marked it sold or paused it. Check the seller
            storefront for similar items.
          </p>
          {listing.seller ? (
            <Link
              href={`/sellers/${listing.seller.id}`}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-brand-warm-strong)] no-underline underline-offset-2 hover:underline"
            >
              View seller storefront
            </Link>
          ) : null}
        </div>
      ) : profileLoading ? (
        <div className="mt-4 border-y border-[var(--border-default)] py-4">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Checking your profile
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            Sellr verifies your profile before opening seller contact.
          </p>
        </div>
      ) : profileIssue ? (
        <div className="mt-4 border-y border-[var(--color-brand-primary-muted)] bg-[var(--color-brand-primary-soft)] py-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {PROFILE_COMPLETION_COPY[profileIssue].title}
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            {PROFILE_COMPLETION_COPY[profileIssue].body}
          </p>
          <Link
            href={
              profileIssue === 'community_membership'
                ? '/onboarding'
                : '/profile'
            }
            className="app-action-primary mt-4 px-4 py-2 text-sm"
          >
            {PROFILE_COMPLETION_COPY[profileIssue].action}
          </Link>
        </div>
      ) : sent ? (
        <div className="mt-4 border-y border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)] py-4">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand-accent-strong)]">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m5 12 5 5L20 7" />
            </svg>
            Message sent
          </p>
          <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
            Your conversation is now open with the seller. Continue
            coordinating pickup from your inbox so the listing context stays
            attached.
          </p>
          <Link
            href={
              sentConversationId
                ? `/inbox/${sentConversationId}`
                : '/inbox'
            }
            className="app-action-primary mt-3 w-full px-4 py-2 text-sm sm:w-auto"
          >
            Open conversation
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              Quick start
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {quickReplies.map((reply) => {
                const active = activeQuickReply === reply.id;
                return (
                  <button
                    key={reply.id}
                    type="button"
                    onClick={() => onApplyQuickReply(reply)}
                    aria-pressed={active}
                    className="app-chip px-3 py-1.5 transition"
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
                    {reply.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="mt-4 block text-sm font-medium text-[var(--text-primary)]">
            Message
            <textarea
              value={message}
              onChange={(event) => onMessageChange(event.target.value)}
              rows={5}
              maxLength={8000}
              placeholder="Be specific about timing and pickup preferences."
              className="app-field mt-2 resize-y px-3 py-2.5 text-sm leading-6"
            />
          </label>

          {messageError ? (
            <p className="app-alert mt-2 p-3 text-sm" role="alert">
              {messageError}
            </p>
          ) : null}

          {isError ? (
            <p
              className="app-alert mt-2 p-3 text-sm"
              role="alert"
            >
              {errorMessage ?? 'Could not send your message. Try again.'}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="app-action-primary mt-3 w-full px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Sending...' : 'Send message'}
          </button>

          <p className="mt-3 text-xs leading-5 text-[var(--text-tertiary)]">
            Your message creates an item-anchored conversation. The seller
            sees your verified-community profile alongside it.
          </p>
        </form>
      )}

      {!isOwnListing ? <ListingReportAction listingId={listing.id} /> : null}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Sellr Safe Pickup card                                                      */
/* -------------------------------------------------------------------------- */

function SafePickupCard() {
  const steps = [
    'Meet in a busy local spot you both already know.',
    'Inspect the item before any money changes hands.',
    'Keep the conversation in your Sellr inbox so it stays reportable.',
    'Share your precise pickup spot only after both sides agree.',
  ];

  return (
    <section
      className="app-panel-soft p-5"
      aria-labelledby="safe-pickup-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          id="safe-pickup-heading"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand-accent-strong)]"
        >
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
            <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          Sellr Safe Pickup
        </h2>
      </div>

      <ol className="mt-3 space-y-2">
        {steps.map((step, index) => (
          <li key={step} className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-[10px] font-bold text-[var(--color-brand-accent-strong)] ring-1 ring-[var(--color-brand-accent-muted)]"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <p className="text-sm leading-6 text-[var(--text-primary)]">
              {step}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
