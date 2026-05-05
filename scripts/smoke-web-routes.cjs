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
const explicitWebBaseUrl = process.env.SELLR_SMOKE_WEB_BASE_URL;

function inferWebBaseUrl(apiBaseUrl) {
  if (explicitWebBaseUrl) {
    return explicitWebBaseUrl.replace(/\/$/, '');
  }

  if (apiBaseUrl.endsWith('/api/v1')) {
    return apiBaseUrl.slice(0, -'/api/v1'.length);
  }

  return 'http://localhost:3000';
}

function routeLabel(route) {
  return route === '/' ? 'home' : route;
}

async function assertHtmlRoute(client, webBaseUrl, route) {
  const response = await client.fetchWithCookies(`${webBaseUrl}${route}`, {
    headers: {
      Accept: 'text/html',
    },
  });
  const body = await response.text();
  const contentType = response.headers.get('content-type') ?? '';

  assert(
    response.ok,
    `${route} returned HTTP ${response.status}. Is the web dev server running?`,
  );
  assert(
    contentType.includes('text/html'),
    `${route} returned ${contentType || 'no content type'} instead of HTML.`,
  );
  assert(
    !body.includes('Internal Server Error') &&
      !body.includes('Application error'),
    `${route} rendered a generic app/server error.`,
  );

  console.log(`[ok] ${routeLabel(route)} route returned HTML`);
}

function findActiveListing(listings, sellerId) {
  return (
    listings.find((listing) => {
      return listing.title === 'Walnut study desk' && listing.status === 'active';
    }) ??
    listings.find((listing) => {
      return listing.status === 'active' && listing.sellerId === sellerId;
    }) ??
    listings.find((listing) => listing.status === 'active') ??
    null
  );
}

function findEditableListing(listings) {
  return (
    listings.find((listing) => listing.title === 'Brass desk lamp') ??
    listings.find((listing) => listing.status === 'draft') ??
    listings[0] ??
    null
  );
}

async function main() {
  const sellerClient = createSmokeApiClient();
  const buyerClient = createSmokeApiClient();
  const webBaseUrl = inferWebBaseUrl(buyerClient.apiBaseUrl);

  console.log('Sellr authenticated web route smoke test');
  console.log(`API base URL: ${buyerClient.apiBaseUrl}`);
  console.log(`Web base URL: ${webBaseUrl}`);

  const { communityId: sellerCommunityId, me: sellerMe } =
    await signInWithLocalOtp(sellerClient, {
      phoneE164: sellerPhoneE164,
      code: otpCode,
      deviceFingerprint: 'sellr-smoke-web-routes-seller',
    });

  const sellerListings = await sellerClient.api(
    `/listings/mine?communityId=${sellerCommunityId}&limit=50`,
  );
  const activeListing = findActiveListing(
    sellerListings.listings,
    sellerMe.user.id,
  );
  const editableListing = findEditableListing(sellerListings.listings);
  assert(
    activeListing,
    'No active seller listing found. Run `pnpm --filter @sellr/api exec prisma db seed` first.',
  );
  assert(
    editableListing,
    'No seller listing found for edit route smoke. Run the seed first.',
  );

  const { communityId: buyerCommunityId, me: buyerMe } =
    await signInWithLocalOtp(buyerClient, {
      phoneE164: buyerPhoneE164,
      code: otpCode,
      deviceFingerprint: 'sellr-smoke-web-routes-buyer',
    });
  assert(
    buyerCommunityId === activeListing.communityId,
    'Buyer and seller smoke accounts are not in the same community.',
  );
  assert(
    buyerMe.user.id !== activeListing.sellerId,
    'Buyer route smoke account must not own the active listing.',
  );

  const conversation = await buyerClient.api('/conversations', {
    method: 'POST',
    body: { listingId: activeListing.id },
  });
  const conversationId = conversation.conversation.id;
  assert(conversationId, 'Conversation route smoke did not return an id.');

  await assertHtmlRoute(buyerClient, webBaseUrl, '/marketplace');
  await assertHtmlRoute(
    buyerClient,
    webBaseUrl,
    `/marketplace/${activeListing.id}`,
  );
  await assertHtmlRoute(buyerClient, webBaseUrl, '/inbox');
  await assertHtmlRoute(buyerClient, webBaseUrl, `/inbox/${conversationId}`);
  await assertHtmlRoute(buyerClient, webBaseUrl, '/notifications');

  await assertHtmlRoute(sellerClient, webBaseUrl, '/sell');
  await assertHtmlRoute(sellerClient, webBaseUrl, '/listings');
  await assertHtmlRoute(
    sellerClient,
    webBaseUrl,
    `/listings/${editableListing.id}/edit`,
  );

  console.log('Smoke test passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
