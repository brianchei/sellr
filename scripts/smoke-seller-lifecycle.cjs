#!/usr/bin/env node

const {
  assert,
  createSmokeApiClient,
  signInWithLocalOtp,
} = require('./smoke-utils.cjs');

const DEFAULT_PHONE = '+15550000001';
const DEFAULT_CODE = '000000';
const ONE_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

const phoneE164 = process.env.SELLR_SMOKE_PHONE ?? DEFAULT_PHONE;
const otpCode = process.env.SELLR_SMOKE_OTP ?? DEFAULT_CODE;
const client = createSmokeApiClient();
let createdListingId = null;
let cleanedUp = false;

function webBaseUrl() {
  return client.apiBaseUrl.endsWith('/api/v1')
    ? client.apiBaseUrl.slice(0, -'/api/v1'.length)
    : client.apiBaseUrl;
}

async function uploadSmokeListingImage() {
  const formData = new FormData();
  const image = new Blob([Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64')], {
    type: 'image/png',
  });
  formData.append('file', image, 'sellr-smoke-listing.png');

  const uploaded = await client.api('/uploads/listing-images', {
    method: 'POST',
    body: formData,
  });
  assert(
    typeof uploaded.url === 'string' && uploaded.url.includes('/uploads/'),
    'Image upload did not return a listing image URL.',
  );

  const imageResponse = await client.fetchWithCookies(
    `${webBaseUrl()}${uploaded.url}`,
  );
  assert(imageResponse.ok, 'Uploaded listing image could not be fetched.');
  assert(
    imageResponse.headers.get('content-type')?.includes('image/png'),
    'Uploaded listing image did not return image/png.',
  );
  await imageResponse.arrayBuffer();
  console.log('[ok] uploaded and fetched listing image');

  return uploaded.url;
}

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
  const photoUrl = await uploadSmokeListingImage();

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
      photoUrls: [photoUrl],
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
      photoUrls: [photoUrl],
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
