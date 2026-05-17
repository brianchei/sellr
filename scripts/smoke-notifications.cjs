#!/usr/bin/env node

const {
  assert,
  createSmokeApiClient,
  signInWithLocalOtp,
} = require('./smoke-utils.cjs');

const DEFAULT_BUYER_PHONE = '+15550000002';
const DEFAULT_SELLER_PHONE = '+15550000001';
const DEFAULT_CODE = '000000';

const buyerPhoneE164 =
  process.env.SELLR_SMOKE_BUYER_PHONE ?? DEFAULT_BUYER_PHONE;
const sellerPhoneE164 =
  process.env.SELLR_SMOKE_SELLER_PHONE ?? DEFAULT_SELLER_PHONE;
const otpCode = process.env.SELLR_SMOKE_OTP ?? DEFAULT_CODE;

const buyerClient = createSmokeApiClient();
const sellerClient = createSmokeApiClient();

function findSellerListing(listings, sellerId) {
  return (
    listings.find((listing) => {
      return listing.title === 'Walnut study desk' && listing.status === 'active';
    }) ??
    listings.find((listing) => {
      return listing.status === 'active' && listing.sellerId === sellerId;
    }) ??
    null
  );
}

async function findActiveSellerListing(client, sellerMe) {
  for (const communityId of sellerMe.communityIds ?? []) {
    const result = await client.api(
      `/listings/mine?communityId=${communityId}&limit=50`,
    );
    const listing = findSellerListing(result.listings, sellerMe.user.id);
    if (listing) {
      return listing;
    }
  }
  return null;
}

async function sendBuyerMessage(conversationId, content) {
  const sent = await buyerClient.api(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: { content },
  });
  assert(sent.message?.id, 'Message send did not return an id.');
  assert(sent.message.content === content, 'Sent message content mismatch.');
  return sent.message;
}

async function findUnreadNotification(notificationId) {
  const unread = await sellerClient.api('/notifications?limit=50&unreadOnly=true');
  return unread.notifications.find(
    (notification) => notification.id === notificationId,
  );
}

async function main() {
  console.log('Sellr notifications smoke test');
  console.log(`Base URL: ${buyerClient.apiBaseUrl}`);

  const { me: sellerMe } = await signInWithLocalOtp(sellerClient, {
    phoneE164: sellerPhoneE164,
    code: otpCode,
    deviceFingerprint: 'sellr-smoke-notifications-seller',
  });

  const listing = await findActiveSellerListing(sellerClient, sellerMe);
  assert(
    listing,
    'Seller has no active listing. Run `pnpm --filter @sellr/api exec prisma db seed` before the notifications smoke test.',
  );
  console.log(`[ok] selected listing "${listing.title}"`);

  const { me: buyerMe } = await signInWithLocalOtp(buyerClient, {
    phoneE164: buyerPhoneE164,
    code: otpCode,
    deviceFingerprint: 'sellr-smoke-notifications-buyer',
  });
  assert(
    buyerMe.communityIds?.includes(listing.communityId),
    'Buyer and seller are not in the same community.',
  );
  assert(
    buyerMe.user.id !== listing.sellerId,
    'Buyer smoke account must not own the selected listing.',
  );

  const created = await buyerClient.api('/conversations', {
    method: 'POST',
    body: { listingId: listing.id },
  });
  const conversationId = created.conversation.id;
  assert(conversationId, 'Conversation was not created or returned.');
  console.log(`[ok] opened conversation ${conversationId}`);

  const firstContent = `[smoke] Notification first message ${new Date().toISOString()}`;
  const firstMessage = await sendBuyerMessage(conversationId, firstContent);
  const unreadAfterFirst = await sellerClient.api(
    '/notifications?limit=50&unreadOnly=true',
  );
  const firstNotification = unreadAfterFirst.notifications.find(
    (notification) => {
      return (
        notification.type === 'new_message' &&
        notification.payload?.conversationId === conversationId &&
        notification.payload?.messageId === firstMessage.id
      );
    },
  );
  assert(
    firstNotification,
    'Seller unread notifications are missing the first buyer message.',
  );
  assert(
    firstNotification.payload?.preview === firstContent.slice(0, 120),
    'First notification preview does not match the sent message.',
  );
  assert(firstNotification.readAt == null, 'First notification should be unread.');
  console.log('[ok] unread message notification appears');

  const marked = await sellerClient.api(
    `/notifications/${firstNotification.id}/read`,
    { method: 'POST' },
  );
  assert(
    marked.notification?.id === firstNotification.id,
    'Mark-read response returned the wrong notification.',
  );
  assert(marked.notification.readAt, 'Mark-read response is missing readAt.');
  assert(
    !(await findUnreadNotification(firstNotification.id)),
    'Marked notification still appears in unread notifications.',
  );
  console.log('[ok] individual mark-read clears unread state');

  const allNotifications = await sellerClient.api('/notifications?limit=50');
  const readNotification = allNotifications.notifications.find(
    (notification) => notification.id === firstNotification.id,
  );
  assert(readNotification, 'All notifications list is missing the marked item.');
  assert(readNotification.readAt, 'All notifications list did not retain readAt.');

  const secondContent = `[smoke] Notification second message ${new Date().toISOString()}`;
  const secondMessage = await sendBuyerMessage(conversationId, secondContent);
  const unreadAfterSecond = await sellerClient.api(
    '/notifications?limit=50&unreadOnly=true',
  );
  const secondNotification = unreadAfterSecond.notifications.find(
    (notification) => {
      return (
        notification.type === 'new_message' &&
        notification.payload?.conversationId === conversationId &&
        notification.payload?.messageId === secondMessage.id
      );
    },
  );
  assert(
    secondNotification,
    'Seller unread notifications are missing the second buyer message.',
  );
  console.log('[ok] second unread notification appears');

  const readAll = await sellerClient.api('/notifications/read-all', {
    method: 'POST',
  });
  assert(
    readAll.updatedCount >= 1,
    'Mark-all-read did not update any unread notifications.',
  );
  assert(
    !(await findUnreadNotification(secondNotification.id)),
    'Mark-all-read did not clear the second notification.',
  );
  console.log('[ok] mark-all-read clears unread notification state');

  console.log('Smoke test passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
