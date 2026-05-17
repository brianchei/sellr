#!/usr/bin/env node

const {
  ApiRequestError,
  assert,
  createSmokeApiClient,
} = require('./smoke-utils.cjs');

const DEFAULT_EMAIL = 'sellr-smoke-onboarding@wisc.edu';
const DEFAULT_CODE = '000000';

const onboardingEmail = (
  process.env.SELLR_SMOKE_ONBOARDING_EMAIL ?? DEFAULT_EMAIL
)
  .trim()
  .toLowerCase();
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

async function assertLoggedOut(client) {
  try {
    await client.api('/auth/me');
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      console.log('[ok] logged-out auth check returns Unauthorized');
      return;
    }
    throw error;
  }

  throw new Error('/auth/me unexpectedly returned a logged-in session.');
}

async function signInWithEmail(client) {
  try {
    await client.api('/auth/email/send', {
      method: 'POST',
      body: { email: onboardingEmail },
    });
    console.log(`[ok] sent local email OTP for ${onboardingEmail}`);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 429) {
      console.warn(
        `[warn] email OTP send rate-limited for ${onboardingEmail}; continuing with local OTP`,
      );
    } else {
      throw error;
    }
  }

  await client.api('/auth/email/verify', {
    method: 'POST',
    body: {
      email: onboardingEmail,
      code: otpCode,
      deviceFingerprint: 'sellr-smoke-auth-onboarding',
    },
  });
  console.log(`[ok] verified email OTP for ${onboardingEmail}`);

  const me = await client.api('/auth/me');
  assert(
    me.user.email === onboardingEmail,
    `Expected authenticated email ${onboardingEmail}, received ${me.user.email ?? 'none'}.`,
  );
  assert(me.user.emailVerifiedAt, 'Authenticated email is missing verification time.');
  return me;
}

async function resetCommunityMemberships(client, me) {
  const communityIds = me.communityIds ?? [];
  for (const communityId of communityIds) {
    const left = await client.api(`/communities/${communityId}/leave`, {
      method: 'POST',
      body: { removeListings: true },
    });
    assert(
      left.communityId === communityId,
      `Leave-community response returned ${left.communityId ?? 'no community id'} instead of ${communityId}.`,
    );
  }

  if (communityIds.length > 0) {
    console.log(
      `[ok] reset ${communityIds.length} existing community membership${communityIds.length === 1 ? '' : 's'}`,
    );
  }

  const nextMe = await client.api('/auth/me');
  assert(
    (nextMe.communityIds ?? []).length === 0,
    'Onboarding smoke user still has a community before the join step.',
  );
  return nextMe;
}

async function main() {
  const client = createSmokeApiClient();
  const webBaseUrl = inferWebBaseUrl(client.apiBaseUrl);

  console.log('Sellr logged-out auth and onboarding smoke test');
  console.log(`API base URL: ${client.apiBaseUrl}`);
  console.log(`Web base URL: ${webBaseUrl}`);
  console.log(`Onboarding email: ${onboardingEmail}`);

  await assertLoggedOut(client);
  await assertHtmlRoute(client, webBaseUrl, '/login');
  await assertHtmlRoute(client, webBaseUrl, '/onboarding');

  const me = await signInWithEmail(client);
  await resetCommunityMemberships(client, me);
  await assertHtmlRoute(client, webBaseUrl, '/onboarding');

  const joined = await client.api('/communities/join', {
    method: 'POST',
    body: { institutionalEmail: onboardingEmail },
  });
  assert(joined.communityId, 'Email-domain join did not return a community id.');
  console.log('[ok] joined community by verified email domain');

  const joinedMe = await client.api('/auth/me');
  assert(
    joinedMe.communityIds?.includes(joined.communityId),
    'Authenticated session did not include the joined community.',
  );
  await assertHtmlRoute(client, webBaseUrl, '/dashboard');

  console.log('Smoke test passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
