import type { QueryClient } from '@tanstack/react-query';
import type { ApiListing, ApiNotification } from '@sellr/api-client';

export const ACTIVITY_REFETCH_INTERVAL_MS = 15_000;
export const MESSAGE_REFETCH_INTERVAL_MS = 10_000;

type ListingCollection = { listings: ApiListing[] };
type NotificationCollection = { notifications: ApiNotification[] };

function sortListingsByUpdate(listings: ApiListing[]): ApiListing[] {
  return [...listings].sort((left, right) => {
    return (
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  });
}

function updateListingCollectionCaches(
  queryClient: QueryClient,
  queryKey: string,
  listing: ApiListing,
  updater: (current: ListingCollection) => ListingCollection,
) {
  queryClient
    .getQueriesData<ListingCollection>({ queryKey: [queryKey] })
    .forEach(([cachedQueryKey, current]) => {
      if (!current || cachedQueryKey[1] !== listing.communityId) {
        return;
      }
      queryClient.setQueryData(cachedQueryKey, updater(current));
    });
}

export function writeListingToCaches(
  queryClient: QueryClient,
  listing: ApiListing,
) {
  queryClient.setQueryData(['listing', listing.id], { listing });

  updateListingCollectionCaches(
    queryClient,
    'my-listings',
    listing,
    (current) => {
      const exists = current.listings.some((item) => item.id === listing.id);
      const nextListings = exists
        ? current.listings.map((item) =>
            item.id === listing.id ? listing : item,
          )
        : [listing, ...current.listings];
      return { listings: sortListingsByUpdate(nextListings) };
    },
  );

  updateListingCollectionCaches(
    queryClient,
    'community-listings',
    listing,
    (current) => {
      const withoutListing = current.listings.filter(
        (item) => item.id !== listing.id,
      );
      if (listing.status !== 'active') {
        return { listings: withoutListing };
      }
      return {
        listings: sortListingsByUpdate([listing, ...withoutListing]),
      };
    },
  );
}

export function removeListingFromCaches(
  queryClient: QueryClient,
  listingId: string,
) {
  queryClient.removeQueries({ queryKey: ['listing', listingId] });

  queryClient.setQueriesData<ListingCollection>(
    { queryKey: ['my-listings'] },
    (current) =>
      current
        ? {
            listings: current.listings.filter(
              (listing) => listing.id !== listingId,
            ),
          }
        : current,
  );

  queryClient.setQueriesData<ListingCollection>(
    { queryKey: ['community-listings'] },
    (current) =>
      current
        ? {
            listings: current.listings.filter(
              (listing) => listing.id !== listingId,
            ),
          }
        : current,
  );
}

export async function invalidateListingActivity(
  queryClient: QueryClient,
  listingId?: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['my-listings'] }),
    queryClient.invalidateQueries({ queryKey: ['community-listings'] }),
    listingId
      ? queryClient.invalidateQueries({ queryKey: ['listing', listingId] })
      : queryClient.invalidateQueries({ queryKey: ['listing'] }),
    queryClient.invalidateQueries({ queryKey: ['conversations'] }),
    queryClient.invalidateQueries({ queryKey: ['conversation'] }),
    queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    queryClient.invalidateQueries({ queryKey: ['notifications-unread'] }),
  ]);
}

export async function invalidateConversationActivity(
  queryClient: QueryClient,
  conversationId?: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['conversations'] }),
    conversationId
      ? queryClient.invalidateQueries({
          queryKey: ['conversation', conversationId],
        })
      : queryClient.invalidateQueries({ queryKey: ['conversation'] }),
    conversationId
      ? queryClient.invalidateQueries({
          queryKey: ['conversation-messages', conversationId],
        })
      : queryClient.invalidateQueries({ queryKey: ['conversation-messages'] }),
    queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    queryClient.invalidateQueries({ queryKey: ['notifications-unread'] }),
  ]);
}

export function markNotificationReadInCaches(
  queryClient: QueryClient,
  notificationId: string,
) {
  queryClient.setQueryData<NotificationCollection>(
    ['notifications'],
    (current) =>
      current
        ? {
            notifications: current.notifications.map((notification) =>
              notification.id === notificationId
                ? {
                    ...notification,
                    readAt: notification.readAt ?? new Date().toISOString(),
                  }
                : notification,
            ),
          }
        : current,
  );

  queryClient.setQueryData<NotificationCollection>(
    ['notifications-unread'],
    (current) =>
      current
        ? {
            notifications: current.notifications.filter(
              (notification) => notification.id !== notificationId,
            ),
          }
        : current,
  );
}

export function markAllNotificationsReadInCaches(queryClient: QueryClient) {
  const readAt = new Date().toISOString();
  queryClient.setQueryData<NotificationCollection>(
    ['notifications'],
    (current) =>
      current
        ? {
            notifications: current.notifications.map((notification) => ({
              ...notification,
              readAt: notification.readAt ?? readAt,
            })),
          }
        : current,
  );

  queryClient.setQueryData<NotificationCollection>(
    ['notifications-unread'],
    (current) => (current ? { notifications: [] } : current),
  );
}

export async function invalidateNotificationActivity(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    queryClient.invalidateQueries({ queryKey: ['notifications-unread'] }),
  ]);
}
