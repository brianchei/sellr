'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createConversation,
  fetchListing,
  sendMessage,
} from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';
import { ReportDialog } from '@/components/report-dialog';
import { SellerProfileCard } from '@/components/seller-profile-card';
import {
  availabilityWindows,
  formatAvailabilityWindow,
  formatCondition,
  formatPostedDate,
  formatPrice,
  formatRadius,
  photoUrls,
} from '@/lib/listing-format';
import {
  ACTIVITY_REFETCH_INTERVAL_MS,
  invalidateConversationActivity,
} from '@/lib/query-refresh';

const DEFAULT_MESSAGE =
  'Hi, is this still available? I can pick up locally.';

export default function ListingDetailPage() {
  const params = useParams<{ listingId: string }>();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const listingId = params.listingId;
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
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
  const primaryPhoto = photos[selectedPhotoIndex] ?? photos[0];
  const windows = availabilityWindows(listing?.availabilityWindows);
  const isOwnListing = listing ? listing.sellerId === userId : false;
  const isAvailable = listing?.status === 'active';

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

  if (listingQuery.isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="h-5 w-28 rounded bg-[var(--bg-tertiary)]" />
        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-lg border border-[var(--border-default)] bg-white shadow-sm">
            <div className="h-[360px] bg-[var(--bg-tertiary)]" />
            <div className="space-y-3 p-5">
              <div className="h-7 w-3/4 rounded bg-[var(--bg-tertiary)]" />
              <div className="h-4 w-full rounded bg-[var(--bg-tertiary)]" />
              <div className="h-4 w-2/3 rounded bg-[var(--bg-tertiary)]" />
            </div>
          </div>
          <div className="h-80 rounded-lg border border-[var(--border-default)] bg-white shadow-sm" />
        </section>
      </main>
    );
  }

  if (listingQuery.isError || !listing) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section
          className="rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-6 text-[var(--color-brand-warm-strong)]"
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
              className="inline-flex w-full justify-center rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] no-underline shadow-sm hover:bg-[var(--bg-tertiary)] sm:w-auto"
            >
              Back to browse
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href="/marketplace"
        className="text-sm font-medium text-[var(--color-brand-contrast)] no-underline hover:underline"
      >
        Back to browse
      </Link>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article className="overflow-hidden rounded-lg border border-[var(--border-default)] bg-white shadow-sm">
          <div
            className="flex min-h-[320px] items-end bg-[var(--bg-tertiary)] bg-cover bg-center sm:min-h-[420px]"
            style={
              primaryPhoto ? { backgroundImage: `url("${primaryPhoto}")` } : undefined
            }
          >
            {!primaryPhoto ? (
              <div className="flex min-h-[320px] w-full items-center justify-center text-sm text-[var(--text-tertiary)] sm:min-h-[420px]">
                No photo
              </div>
            ) : null}
            <div className="m-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-[var(--color-brand-contrast)] shadow-sm">
                {listing.category}
              </span>
              {listing.subcategory ? (
                <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm">
                  {listing.subcategory}
                </span>
              ) : null}
            </div>
          </div>

          {photos.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto border-b border-[var(--border-default)] p-3">
              {photos.map((photo, index) => (
                <button
                  key={photo}
                  type="button"
                  onClick={() => setSelectedPhotoIndex(index)}
                  className="h-16 w-20 shrink-0 rounded-md border bg-cover bg-center"
                  style={{
                    backgroundImage: `url("${photo}")`,
                    borderColor:
                      index === selectedPhotoIndex
                        ? 'var(--color-brand-contrast)'
                        : 'var(--border-default)',
                  }}
                  aria-label={`View listing photo ${index + 1}`}
                />
              ))}
            </div>
          ) : null}

          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--color-brand-contrast)]">
                  {formatCondition(listing.condition)}
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
                  {listing.title}
                </h1>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Listed {formatPostedDate(listing.createdAt)}
                </p>
              </div>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">
                {formatPrice(listing.price)}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                {formatCondition(listing.condition)}
              </span>
              {listing.negotiable ? (
                <span className="rounded-full bg-[var(--color-brand-primary-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-primary-strong)]">
                  Negotiable
                </span>
              ) : null}
              <span className="rounded-full bg-[var(--color-brand-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-accent-strong)]">
                Community member
              </span>
              {!isAvailable ? (
                <span className="rounded-full bg-[var(--color-brand-warm-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-warm-strong)]">
                  {listing.status.replaceAll('_', ' ')}
                </span>
              ) : null}
            </div>

            <div className="mt-6 border-t border-[var(--border-default)] pt-6">
              <h2 className="text-base font-semibold">Description</h2>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-secondary)]">
                {listing.description}
              </p>
            </div>

            {listing.conditionNote ? (
              <div className="mt-6 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                <h2 className="text-sm font-semibold">Condition note</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {listing.conditionNote}
                </p>
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <section className="rounded-lg border border-[var(--border-default)] p-4">
                <h2 className="text-sm font-semibold">Pickup area</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {listing.locationNeighborhood}
                </p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Approximate radius: {formatRadius(listing.locationRadiusM)}
                </p>
              </section>

              <section className="rounded-lg border border-[var(--border-default)] p-4">
                <h2 className="text-sm font-semibold">Availability</h2>
                {windows.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
                    {windows.map((window, index) => (
                      <li key={index}>{formatAvailabilityWindow(window)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Ask the seller about timing.
                  </p>
                )}
              </section>
            </div>
          </div>
        </article>

        <aside className="space-y-5">
          <SellerProfileCard
            profile={listing.seller}
            heading="Seller"
            contextLabel="This seller is in your community."
            editableHref={
              isOwnListing ? `/listings/${listing.id}/edit` : undefined
            }
            editableLabel="Edit listing"
          />

          <section className="rounded-lg border border-[var(--border-default)] bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold">Contact seller</h2>
            {isOwnListing ? (
              <div className="mt-3 rounded-lg border border-[var(--color-brand-primary-muted)] bg-[var(--color-brand-primary-soft)] p-4">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  This is your listing.
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  Buyers can contact you from this page once the listing is
                  active in the marketplace.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Link
                    href={`/listings/${listing.id}/edit`}
                    className="inline-flex justify-center rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] no-underline shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
                  >
                    Edit listing
                  </Link>
                  <Link
                    href="/listings"
                    className="inline-flex justify-center rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] no-underline shadow-sm hover:bg-[var(--bg-tertiary)]"
                  >
                    My listings
                  </Link>
                </div>
              </div>
            ) : !isAvailable ? (
              <div className="mt-3 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-4">
                <p className="text-sm font-medium text-[var(--color-brand-warm-strong)]">
                  This listing is not available.
                </p>
              </div>
            ) : sent ? (
              <div className="mt-3 rounded-lg border border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)] p-4">
                <p className="text-sm font-semibold text-[var(--color-brand-accent-strong)]">
                  Message sent
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  Your buyer intent is saved as a pre-offer conversation. The
                  seller will see your message.
                </p>
                <Link
                  href={
                    sentConversationId
                      ? `/inbox/${sentConversationId}`
                      : '/inbox'
                  }
                  className="mt-4 inline-flex w-full justify-center rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] no-underline shadow-sm hover:bg-[var(--bg-tertiary)] sm:w-auto"
                >
                  Open inbox
                </Link>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-4">
                <label className="block text-sm font-medium text-[var(--text-primary)]">
                  Message
                  <textarea
                    value={message}
                    onChange={(event) => {
                      setMessage(event.target.value);
                      setMessageError(null);
                    }}
                    rows={5}
                    maxLength={8000}
                    className="mt-2 w-full resize-y rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
                  />
                </label>

                {messageError ? (
                  <p className="mt-3 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-3 text-sm text-[var(--color-brand-warm-strong)]">
                    {messageError}
                  </p>
                ) : null}

                {contactMutation.isError ? (
                  <p
                    className="mt-3 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-3 text-sm text-[var(--color-brand-warm-strong)]"
                    role="alert"
                  >
                    {contactMutation.error instanceof Error
                      ? contactMutation.error.message
                      : 'Could not send your message. Try again.'}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={contactMutation.isPending}
                  className="mt-4 w-full rounded-lg bg-[var(--color-brand-primary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {contactMutation.isPending ? 'Sending...' : 'Send message'}
                </button>
              </form>
            )}
          </section>

          <section className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold">Safety note</h2>
              {!isOwnListing ? (
                <ReportDialog
                  targetId={listing.id}
                  targetType="listing"
                  subjectLabel="this listing"
                  triggerLabel="Report listing"
                />
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Keep the conversation focused on the item, pickup timing, and a
              public local handoff. Do not share payment or sensitive details
              before you trust the transaction.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
