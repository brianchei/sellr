#!/usr/bin/env node

const DEFAULT_BASE_URL = 'http://localhost:3000/api/v1';
const DEFAULT_PHONE = '+10000000001';
const DEFAULT_CODE = '000000';
const DEFAULT_PHOTO_URL =
  'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=900&q=80';

const apiBaseUrl = (
  process.env.SELLR_SMOKE_API_BASE_URL ?? DEFAULT_BASE_URL
).replace(/\/$/, '');
const phoneE164 = process.env.SELLR_SMOKE_PHONE ?? DEFAULT_PHONE;
const otpCode = process.env.SELLR_SMOKE_OTP ?? DEFAULT_CODE;
const cookieJar = new Map();
let createdListingId = null;
let cleanedUp = false;

class ApiRequestError extends Error {
  constructor(method, path, status, message) {
    super(`${method} ${path}: ${message}`);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

function splitSetCookieHeader(value) {
  if (!value) {
    return [];
  }

  return value.split(/,(?=[^;,]+=)/);
}

function rememberCookies(headers) {
  const setCookies =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : splitSetCookieHeader(headers.get('set-cookie'));

  for (const setCookie of setCookies) {
    const [cookiePair, ...attributes] = setCookie.split(';');
    const [name, ...valueParts] = cookiePair.split('=');
    const value = valueParts.join('=');
    if (!name || !value) {
      continue;
    }

    const isExpired = attributes.some((attribute) => {
      return attribute.trim().toLowerCase() === 'max-age=0';
    });
    if (isExpired) {
      cookieJar.delete(name.trim());
    } else {
      cookieJar.set(name.trim(), value.trim());
    }
  }
}

function cookieHeader() {
  return Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

async function api(path, options = {}) {
  const headers = {
    'X-Sellr-Client': 'web',
    ...(options.headers ?? {}),
  };

  if (options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const cookies = cookieHeader();
  if (cookies) {
    headers.Cookie = cookies;
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
    body:
      options.body !== undefined && typeof options.body !== 'string'
        ? JSON.stringify(options.body)
        : options.body,
  });
  rememberCookies(response.headers);

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const method = options.method ?? 'GET';
    const message =
      body && typeof body.error === 'string'
        ? body.error
        : `Request failed with ${response.status}`;
    throw new ApiRequestError(method, path, response.status, message);
  }

  return body?.data ?? body;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function cleanupListing() {
  if (!createdListingId || cleanedUp) {
    return;
  }

  cleanedUp = true;
  try {
    await api(`/listings/${createdListingId}`, { method: 'DELETE' });
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
  console.log(`Base URL: ${apiBaseUrl}`);

  try {
    await api('/auth/otp/send', {
      method: 'POST',
      body: { phoneE164 },
    });
    console.log('[ok] sent local OTP');
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 429) {
      console.warn('[warn] OTP send rate-limited; continuing with local OTP');
    } else {
      throw error;
    }
  }

  await api('/auth/otp/verify', {
    method: 'POST',
    body: {
      phoneE164,
      code: otpCode,
      deviceFingerprint: 'sellr-smoke-seller-lifecycle',
    },
  });
  console.log('[ok] verified OTP and stored web cookies');

  const me = await api('/auth/me');
  const communityId = me.communityIds?.[0];
  assert(
    communityId,
    'Authenticated user has no community. Run `pnpm --filter @sellr/api exec prisma db seed` or join DEV2026 first.',
  );
  console.log(`[ok] authenticated as ${me.user.displayName} in ${communityId}`);

  const created = await api('/listings', {
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

  const published = await api(`/listings/${createdListingId}/publish`, {
    method: 'POST',
  });
  assert(
    published.listing.status === 'active',
    'Published listing should be active.',
  );
  console.log('[ok] published listing');

  const mine = await api(`/listings/mine?communityId=${communityId}&limit=5`);
  assert(
    mine.listings.some((listing) => listing.id === createdListingId),
    'My listings should include the temporary listing.',
  );
  console.log('[ok] found listing in seller inventory');

  const updated = await api(`/listings/${createdListingId}`, {
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

  const unpublished = await api(`/listings/${createdListingId}/unpublish`, {
    method: 'POST',
  });
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
