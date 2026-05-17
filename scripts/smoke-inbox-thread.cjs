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

function includesConversation(conversations, conversationId) {
  return conversations.some((conversation) => conversation.id === conversationId);
}

async function main() {
  console.log('Sellr populated inbox thread smoke test');
  console.log(`Base URL: ${buyerClient.apiBaseUrl}`);

  const { communityId: sellerCommunityId, me: sellerMe } =
    await signInWithLocalOtp(sellerClient, {
      phoneE164: sellerPhoneE164,
      code: otpCode,
      deviceFingerprint: 'sellr-smoke-inbox-thread-seller',
    });

  const sellerListings = await sellerClient.api(
    `/listings/mine?communityId=${sellerCommunityId}&limit=50`,
  );
  const listing = findSellerListing(sellerListings.listings, sellerMe.user.id);
  assert(
    listing,
    'Seller has no active listing. Run `pnpm --filter @sellr/api exec prisma db seed` before the inbox thread smoke test.',
  );
  console.log(`[ok] selected listing "${listing.title}"`);

  const { me: buyerMe } = await signInWithLocalOtp(buyerClient, {
    phoneE164: buyerPhoneE164,
    code: otpCode,
    deviceFingerprint: 'sellr-smoke-inbox-thread-buyer',
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

  const buyerMessage = `[smoke] Inbox buyer message ${new Date().toISOString()}`;
  const buyerSent = await buyerClient.api(
    `/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: { content: buyerMessage },
    },
  );
  assert(
    buyerSent.message.senderId === buyerMe.user.id,
    'Buyer message sender mismatch.',
  );
  console.log('[ok] buyer sent populated thread message');

  const sellerThread = await sellerClient.api(
    `/conversations/${conversationId}/messages`,
  );
  assert(
    sellerThread.messages.some((message) => message.content === buyerMessage),
    'Seller thread is missing the buyer message.',
  );

  const sellerInbox = await sellerClient.api('/conversations?limit=20');
  const sellerConversation = sellerInbox.conversations.find(
    (conversation) => conversation.id === conversationId,
  );
  assert(sellerConversation, 'Seller active inbox is missing the conversation.');
  assert(
    sellerConversation.latestMessage?.content === buyerMessage,
    'Seller inbox latest message does not match the buyer message.',
  );
  assert(
    sellerConversation.latestMessage.senderId === buyerMe.user.id,
    'Seller inbox latest message should be from the buyer.',
  );
  assert(
    sellerConversation.listing?.id === listing.id,
    'Seller conversation summary is missing listing context.',
  );
  assert(
    sellerConversation.peer?.id === buyerMe.user.id,
    'Seller conversation summary should show the buyer as peer.',
  );
  console.log('[ok] seller inbox shows populated thread needing reply');

  const sellerReply = `[smoke] Inbox seller reply ${new Date().toISOString()}`;
  const sellerSent = await sellerClient.api(
    `/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: { content: sellerReply },
    },
  );
  assert(
    sellerSent.message.senderId === sellerMe.user.id,
    'Seller reply sender mismatch.',
  );
  console.log('[ok] seller sent reply');

  const buyerThread = await buyerClient.api(
    `/conversations/${conversationId}/messages`,
  );
  assert(
    buyerThread.messages.some((message) => message.content === sellerReply),
    'Buyer thread is missing the seller reply.',
  );

  const buyerInbox = await buyerClient.api('/conversations?limit=20');
  const buyerConversation = buyerInbox.conversations.find(
    (conversation) => conversation.id === conversationId,
  );
  assert(buyerConversation, 'Buyer active inbox is missing the replied thread.');
  assert(
    buyerConversation.latestMessage?.content === sellerReply,
    'Buyer inbox latest message does not match the seller reply.',
  );
  assert(
    buyerConversation.latestMessage.senderId === sellerMe.user.id,
    'Buyer inbox latest message should be from the seller.',
  );
  assert(
    buyerConversation.peer?.id === sellerMe.user.id,
    'Buyer conversation summary should show the seller as peer.',
  );
  console.log('[ok] buyer inbox shows seller reply');

  const archived = await buyerClient.api(
    `/conversations/${conversationId}/archive`,
    {
      method: 'PATCH',
      body: { archived: true },
    },
  );
  assert(
    archived.conversation.archivedAt,
    'Archiving the conversation did not return archivedAt.',
  );
  console.log('[ok] buyer archived thread');

  const buyerActiveAfterArchive = await buyerClient.api(
    '/conversations?status=active&limit=20',
  );
  assert(
    !includesConversation(buyerActiveAfterArchive.conversations, conversationId),
    'Archived conversation still appears in buyer active inbox.',
  );

  const buyerArchived = await buyerClient.api(
    '/conversations?status=archived&limit=20',
  );
  assert(
    includesConversation(buyerArchived.conversations, conversationId),
    'Archived conversation is missing from buyer archived inbox.',
  );
  console.log('[ok] buyer archive filter includes thread');

  const sellerFollowUp = `[smoke] Inbox unarchive follow-up ${new Date().toISOString()}`;
  await sellerClient.api(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: { content: sellerFollowUp },
  });

  const buyerActiveAfterReply = await buyerClient.api(
    '/conversations?status=active&limit=20',
  );
  const restoredConversation = buyerActiveAfterReply.conversations.find(
    (conversation) => conversation.id === conversationId,
  );
  assert(
    restoredConversation,
    'New message did not return archived buyer thread to active inbox.',
  );
  assert(
    restoredConversation.archivedAt == null,
    'Restored buyer thread still has archivedAt set.',
  );
  assert(
    restoredConversation.latestMessage?.content === sellerFollowUp,
    'Restored buyer thread latest message does not match the seller follow-up.',
  );
  console.log('[ok] seller follow-up restores buyer active inbox thread');

  console.log('Smoke test passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
