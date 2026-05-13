'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createConversation,
  fetchListing,
  sendMessage,
  type ApiListing,
} from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';
import { PhotoGallery } from '@/components/photo-gallery';
import { ReportDialog } from '@/components/report-dialog';
import { SellerProfileCard } from '@/components/seller-profile-card';
import {
  availabilityWindows,
  formatAvailabilityWindow,
  formatCondition,
  formatPrice,
  formatRadius,
  formatRelativeListedDate,
  photoUrls,
  type ListedFreshness,
} from '@/lib/listing-format';
import {
  ACTIVITY_REFETCH_INTERVAL_MS,
  invalidateConversationActivity,
} from '@/lib/query-refresh';

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
    text: 'Hi, is this still available? I had a quick question before pickup — ',
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
  const status = listing ? statusDisplay(listing.status) : null;
  const freshness = useMemo(
    () => (listing ? formatRelativeListedDate(listing.createdAt) : null),
    [listing],
  );

  // Reset per-listing UI state when the user navigates to a different listing.
  // (React 19 "store info from previous renders" pattern — preferred over an
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
          <div className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 shadow-[var(--shadow-app-card)]">
            <div className="aspect-[4/3] bg-[var(--bg-tertiary)]" />
            <div className="space-y-3 p-5">
              <div className="h-4 w-32 rounded bg-[var(--bg-tertiary)]" />
              <div className="h-7 w-3/4 rounded bg-[var(--bg-tertiary)]" />
              <div className="h-4 w-full rounded bg-[var(--bg-tertiary)]" />
              <div className="h-4 w-2/3 rounded bg-[var(--bg-tertiary)]" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-44 rounded-3xl border border-black/10 bg-white/90 shadow-[var(--shadow-app-card)]" />
            <div className="h-64 rounded-3xl border border-black/10 bg-white/90 shadow-[var(--shadow-app-card)]" />
          </div>
        </section>
      </main>
    );
  }

  if (listingQuery.isError || !listing) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section
          className="rounded-3xl border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-6 text-[var(--color-brand-warm-strong)]"
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
        <article className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 shadow-[var(--shadow-app-card)] backdrop-blur">
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

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <section className="rounded-2xl border border-black/10 bg-white/80 p-4">
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
                    <path d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12Z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                  Pickup area
                </h2>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {listing.locationNeighborhood}
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                  Approximate radius {formatRadius(listing.locationRadiusM)}.
                  Precise spot is shared once both sides agree.
                </p>
              </section>

              <section className="rounded-2xl border border-black/10 bg-white/80 p-4">
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
                    <rect x="3" y="4" width="18" height="17" rx="2" />
                    <path d="M3 10h18" />
                    <path d="M8 2v4" />
                    <path d="M16 2v4" />
                  </svg>
                  Pickup window
                </h2>
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
              </section>
            </div>
          </div>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <SellerProfileCard
            profile={listing.seller}
            heading="Seller of this item"
            contextLabel={
              listing.seller?.verifiedAt
                ? 'Verified member of your community.'
                : 'Member of your community.'
            }
            profileHref={
              listing.seller ? `/sellers/${listing.seller.id}` : undefined
            }
            profileLabel="View storefront"
            editableHref={
              isOwnListing ? `/listings/${listing.id}/edit` : undefined
            }
            editableLabel="Edit listing"
          />

          <ContactCard
            listing={listing}
            isOwnListing={isOwnListing}
            isAvailable={isAvailable}
            sent={sent}
            sentConversationId={sentConversationId}
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

          <SafePickupCard listingId={listing.id} isOwnListing={isOwnListing} />
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
  isOwnListing,
  isAvailable,
  sent,
  sentConversationId,
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
  isOwnListing: boolean;
  isAvailable: boolean;
  sent: boolean;
  sentConversationId: string | null;
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

      {isOwnListing ? (
        <div className="mt-3 rounded-2xl border border-[var(--color-brand-primary-muted)] bg-[var(--color-brand-primary-soft)] p-4">
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
        <div className="mt-3 rounded-2xl border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-4">
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
              View seller storefront →
            </Link>
          ) : null}
        </div>
      ) : sent ? (
        <div className="mt-3 rounded-2xl border border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)] p-4">
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
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5"
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
              className="mt-2 w-full resize-y rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
            />
          </label>

          {messageError ? (
            <p className="mt-2 rounded-2xl border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-3 text-sm text-[var(--color-brand-warm-strong)]">
              {messageError}
            </p>
          ) : null}

          {isError ? (
            <p
              className="mt-2 rounded-2xl border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-3 text-sm text-[var(--color-brand-warm-strong)]"
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
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Sellr Safe Pickup card                                                      */
/* -------------------------------------------------------------------------- */

function SafePickupCard({
  listingId,
  isOwnListing,
}: {
  listingId: string;
  isOwnListing: boolean;
}) {
  const steps = [
    'Meet in a busy local spot you both already know.',
    'Inspect the item before any money changes hands.',
    'Keep the conversation in your Sellr inbox so it stays reportable.',
    'Share your precise pickup spot only after both sides agree.',
  ];

  return (
    <section
      className="rounded-3xl border border-[var(--color-brand-accent-muted)] p-5 shadow-[var(--shadow-app-card)]"
      style={{
        background:
          'linear-gradient(180deg, var(--color-brand-accent-soft) 0%, var(--bg-elevated) 70%)',
      }}
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

      <ul className="mt-3 space-y-2">
        {steps.map((step, index) => (
          <li key={step} className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[var(--color-brand-accent-strong)] ring-1 ring-[var(--color-brand-accent-muted)]"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <p className="text-sm leading-6 text-[var(--text-primary)]">
              {step}
            </p>
          </li>
        ))}
      </ul>

      {!isOwnListing ? (
        <div className="mt-4 border-t border-[var(--color-brand-accent-muted)] pt-4">
          <p className="text-xs leading-5 text-[var(--text-secondary)]">
            See something off? Reports go to a real moderator and stay tied to
            this specific listing.
          </p>
          <div className="mt-2">
            <ReportDialog
              targetId={listingId}
              targetType="listing"
              subjectLabel="this listing"
              triggerLabel="Report this listing"
              triggerClassName="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-brand-warm)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-warm-strong)] hover:bg-[var(--color-brand-warm-soft)]"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
