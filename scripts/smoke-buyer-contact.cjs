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
const sellerClient = createSmokeApiClient();
const buyerClient = createSmokeApiClient();

function findSellerListing(listings) {
  return (
    listings.find((listing) => listing.title === 'Walnut study desk') ??
    listings.find((listing) => listing.status === 'active') ??
    null
  );
}

async function main() {
  console.log('Sellr buyer contact smoke test');
  console.log(`Base URL: ${buyerClient.apiBaseUrl}`);

  const { communityId: sellerCommunityId, me: sellerMe } =
    await signInWithLocalOtp(sellerClient, {
      phoneE164: sellerPhoneE164,
      code: otpCode,
      deviceFingerprint: 'sellr-smoke-buyer-contact-seller',
    });

  const sellerListings = await sellerClient.api(
    `/listings/mine?communityId=${sellerCommunityId}&limit=20`,
  );
  const listing = findSellerListing(sellerListings.listings);
  assert(
    listing,
    'Seller has no active listing. Run `pnpm --filter @sellr/api exec prisma db seed` before the buyer smoke test.',
  );
  assert(
    listing.sellerId === sellerMe.user.id,
    'Selected listing does not belong to the smoke seller.',
  );
  console.log(`[ok] selected listing "${listing.title}"`);

  const { communityId: buyerCommunityId, me: buyerMe } =
    await signInWithLocalOtp(buyerClient, {
      phoneE164: buyerPhoneE164,
      code: otpCode,
      deviceFingerprint: 'sellr-smoke-buyer-contact-buyer',
    });
  assert(
    buyerCommunityId === listing.communityId,
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
  assert(
    created.conversation.participantIds.includes(buyerMe.user.id),
    'Conversation does not include the buyer.',
  );
  assert(
    created.conversation.participantIds.includes(sellerMe.user.id),
    'Conversation does not include the seller.',
  );
  console.log(`[ok] opened conversation ${conversationId}`);

  const content = `[smoke] Buyer contact test ${new Date().toISOString()}`;
  const sent = await buyerClient.api(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: { content },
  });
  assert(sent.message.content === content, 'Sent message content mismatch.');
  assert(
    sent.message.senderId === buyerMe.user.id,
    'Sent message sender should be the buyer.',
  );
  console.log('[ok] sent buyer message');

  const buyerConversation = await buyerClient.api(
    `/conversations/${conversationId}`,
  );
  assert(
    buyerConversation.conversation.listing?.id === listing.id,
    'Buyer conversation summary is missing listing context.',
  );
  assert(
    buyerConversation.conversation.peer?.id === sellerMe.user.id,
    'Buyer conversation summary should show the seller as peer.',
  );
  console.log('[ok] buyer can fetch conversation summary');

  const buyerMessages = await buyerClient.api(
    `/conversations/${conversationId}/messages`,
  );
  assert(
    buyerMessages.messages.some((message) => message.content === content),
    'Buyer message thread is missing the sent message.',
  );
  console.log('[ok] buyer can fetch message thread');

  const buyerInbox = await buyerClient.api('/conversations?limit=20');
  assert(
    buyerInbox.conversations.some(
      (conversation) => conversation.id === conversationId,
    ),
    'Buyer inbox is missing the conversation.',
  );
  console.log('[ok] buyer inbox includes conversation');

  const sellerInbox = await sellerClient.api('/conversations?limit=20');
  assert(
    sellerInbox.conversations.some(
      (conversation) => conversation.id === conversationId,
    ),
    'Seller inbox is missing the buyer conversation.',
  );
  console.log('[ok] seller inbox includes conversation');

  const sellerMessages = await sellerClient.api(
    `/conversations/${conversationId}/messages`,
  );
  assert(
    sellerMessages.messages.some((message) => message.content === content),
    'Seller message thread is missing the buyer message.',
  );
  console.log('[ok] seller can fetch buyer message');

  const sellerNotifications = await sellerClient.api(
    '/notifications?limit=20&unreadOnly=true',
  );
  assert(
    sellerNotifications.notifications.some((notification) => {
      return (
        notification.type === 'new_message' &&
        notification.payload?.conversationId === conversationId
      );
    }),
    'Seller unread notifications are missing the buyer message.',
  );
  console.log('[ok] seller notification badge has buyer message');

  console.log('Smoke test passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
