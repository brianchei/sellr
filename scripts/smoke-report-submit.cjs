#!/usr/bin/env node

const {
  assert,
  createSmokeApiClient,
  signInWithLocalOtp,
} = require('./smoke-utils.cjs');

const DEFAULT_BUYER_PHONE = '+15550000002';
const DEFAULT_SELLER_PHONE = '+15550000001';
const DEFAULT_ADMIN_PHONE = '+15550000003';
const DEFAULT_CODE = '000000';

const buyerPhoneE164 =
  process.env.SELLR_SMOKE_BUYER_PHONE ?? DEFAULT_BUYER_PHONE;
const sellerPhoneE164 =
  process.env.SELLR_SMOKE_SELLER_PHONE ?? DEFAULT_SELLER_PHONE;
const adminPhoneE164 =
  process.env.SELLR_SMOKE_ADMIN_PHONE ?? DEFAULT_ADMIN_PHONE;
const otpCode = process.env.SELLR_SMOKE_OTP ?? DEFAULT_CODE;

function findReportableListing(listings, sellerId) {
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

async function findSellerListing(client, sellerMe) {
  for (const communityId of sellerMe.communityIds ?? []) {
    const candidateListings = await client.api(
      `/listings/mine?communityId=${communityId}&limit=50`,
    );
    const listing = findReportableListing(
      candidateListings.listings,
      sellerMe.user.id,
    );
    if (listing) {
      return listing;
    }
  }
  return null;
}

async function main() {
  const sellerClient = createSmokeApiClient();
  const buyerClient = createSmokeApiClient();
  const adminClient = createSmokeApiClient();

  console.log('Sellr report submit smoke test');
  console.log(`Base URL: ${buyerClient.apiBaseUrl}`);

  const { me: sellerMe } = await signInWithLocalOtp(sellerClient, {
    phoneE164: sellerPhoneE164,
    code: otpCode,
    deviceFingerprint: 'sellr-smoke-report-submit-seller',
  });

  const listing = await findSellerListing(sellerClient, sellerMe);
  assert(
    listing,
    'Seller has no active listing. Run `pnpm --filter @sellr/api exec prisma db seed` before the report smoke test.',
  );
  assert(
    listing.sellerId === sellerMe.user.id,
    'Selected report target does not belong to the smoke seller.',
  );
  console.log(`[ok] selected listing "${listing.title}"`);

  const { me: buyerMe } = await signInWithLocalOtp(buyerClient, {
    phoneE164: buyerPhoneE164,
    code: otpCode,
    deviceFingerprint: 'sellr-smoke-report-submit-buyer',
  });
  assert(
    buyerMe.communityIds?.includes(listing.communityId),
    'Buyer and selected listing are not in the same community.',
  );
  assert(
    buyerMe.user.id !== listing.sellerId,
    'Buyer smoke account must not own the reported listing.',
  );

  const reason = `[smoke] Listing report submit ${new Date().toISOString()} for ${listing.title}`;
  const created = await buyerClient.api('/reports', {
    method: 'POST',
    body: {
      targetId: listing.id,
      targetType: 'listing',
      reason,
      severity: 'quality',
    },
  });
  assert(created.report?.id, 'Report submit did not return an id.');
  assert(
    created.report.reporterId === buyerMe.user.id,
    'Created report reporter should be the buyer.',
  );
  assert(
    created.report.targetId === listing.id,
    'Created report target should be the listing.',
  );
  assert(
    created.report.targetType === 'listing',
    'Created report target type should be listing.',
  );
  assert(
    created.report.reason === reason,
    'Created report reason mismatch.',
  );
  assert(
    created.report.severity === 'quality',
    'Created report severity mismatch.',
  );
  assert(
    created.report.status === 'open',
    'Created report should start open.',
  );
  console.log(`[ok] submitted report ${created.report.id}`);

  const { me: adminMe } = await signInWithLocalOtp(adminClient, {
    phoneE164: adminPhoneE164,
    code: otpCode,
    deviceFingerprint: 'sellr-smoke-report-submit-admin',
  });
  assert(
    adminMe.communityIds?.includes(listing.communityId),
    'Admin smoke account is not in the reported listing community.',
  );

  const reports = await adminClient.api(
    '/reports?status=all&targetType=listing&limit=50',
  );
  const adminReport = reports.reports.find(
    (report) => report.id === created.report.id,
  );
  assert(adminReport, 'Admin reports list is missing the created report.');
  assert(
    adminReport.target?.href === `/marketplace/${listing.id}`,
    'Admin report target should link back to the listing.',
  );
  assert(
    adminReport.target?.label?.includes(listing.title),
    'Admin report target label should include the listing title.',
  );
  console.log('[ok] admin can review submitted listing report');

  console.log('Smoke test passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
