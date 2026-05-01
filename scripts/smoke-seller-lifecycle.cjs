#!/usr/bin/env node

const {
  assert,
  createSmokeApiClient,
  signInWithLocalOtp,
} = require('./smoke-utils.cjs');

const DEFAULT_PHONE = '+10000000001';
const DEFAULT_CODE = '000000';
const DEFAULT_PHOTO_URL =
  'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=900&q=80';

const phoneE164 = process.env.SELLR_SMOKE_PHONE ?? DEFAULT_PHONE;
const otpCode = process.env.SELLR_SMOKE_OTP ?? DEFAULT_CODE;
const client = createSmokeApiClient();
let createdListingId = null;
let cleanedUp = false;

async function cleanupListing() {
  if (!createdListingId || cleanedUp) {
    return;
  }

  cleanedUp = true;
  try {
    await client.api(`/listings/${createdListingId}`, { method: 'DELETE' });
    console.log('[ok] deleted temporary listing');
  } catch (error) {
    console.warn(
      `[warn] temporary listing ${createdListingId} was not deleted: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

async function main() {
  console.log(`Sellr seller lifecycle smoke test`);
  console.log(`Base URL: ${client.apiBaseUrl}`);

  const { communityId } = await signInWithLocalOtp(client, {
    phoneE164,
    code: otpCode,
    deviceFingerprint: 'sellr-smoke-seller-lifecycle',
  });

  const created = await client.api('/listings', {
    method: 'POST',
    body: {
      communityId,
      title: 'Codex smoke listing',
      description:
        'Temporary local listing created during the seller lifecycle smoke test.',
      category: 'Furniture',
      subcategory: 'Desk',
      condition: 'good',
      conditionNote: 'Smoke test item',
      price: 12.5,
      negotiable: true,
      locationRadiusM: 1000,
      locationNeighborhood: 'North Campus',
      availabilityWindows: [{ dayOfWeek: 6, startHour: 10, endHour: 14 }],
      photoUrls: [DEFAULT_PHOTO_URL],
      aiGenerated: false,
    },
  });
  createdListingId = created.listing.id;
  assert(created.listing.status === 'draft', 'Created listing should be draft.');
  console.log(`[ok] created draft listing ${createdListingId}`);

  const published = await client.api(`/listings/${createdListingId}/publish`, {
    method: 'POST',
  });
  assert(
    published.listing.status === 'active',
    'Published listing should be active.',
  );
  console.log('[ok] published listing');

  const mine = await client.api(
    `/listings/mine?communityId=${communityId}&limit=5`,
  );
  assert(
    mine.listings.some((listing) => listing.id === createdListingId),
    'My listings should include the temporary listing.',
  );
  console.log('[ok] found listing in seller inventory');

  const updated = await client.api(`/listings/${createdListingId}`, {
    method: 'PUT',
    body: {
      title: 'Codex smoke listing updated',
      description:
        'Temporary local listing updated during the seller lifecycle smoke test.',
      category: 'Furniture',
      subcategory: 'Desk',
      condition: 'like_new',
      conditionNote: 'Updated smoke test item',
      price: 15,
      negotiable: false,
      locationRadiusM: 500,
      locationNeighborhood: 'East Quad',
      availabilityWindows: [{ dayOfWeek: 5, startHour: 12, endHour: 16 }],
      photoUrls: [DEFAULT_PHOTO_URL],
    },
  });
  assert(
    updated.listing.title === 'Codex smoke listing updated',
    'Updated listing title did not persist.',
  );
  console.log('[ok] updated listing details');

  const unpublished = await client.api(
    `/listings/${createdListingId}/unpublish`,
    {
      method: 'POST',
    },
  );
  assert(
    unpublished.listing.status === 'draft',
    'Unpublished listing should return to draft.',
  );
  console.log('[ok] unpublished listing');

  await cleanupListing();
  console.log('Smoke test passed.');
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await cleanupListing();
  process.exit(1);
});
