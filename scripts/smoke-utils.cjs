const DEFAULT_BASE_URL = 'http://localhost:3000/api/v1';
const DEFAULT_CODE = '000000';

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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createSmokeApiClient(baseUrl = process.env.SELLR_SMOKE_API_BASE_URL) {
  const apiBaseUrl = (baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const cookieJar = new Map();

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
    const isFormData =
      typeof FormData !== 'undefined' && options.body instanceof FormData;

    if (options.body !== undefined && !headers['Content-Type'] && !isFormData) {
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
        options.body !== undefined &&
        typeof options.body !== 'string' &&
        !isFormData
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

  async function fetchWithCookies(url, options = {}) {
    const headers = {
      ...(options.headers ?? {}),
    };

    const cookies = cookieHeader();
    if (cookies) {
      headers.Cookie = cookies;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });
    rememberCookies(response.headers);
    return response;
  }

  return {
    api,
    apiBaseUrl,
    fetchWithCookies,
  };
}

async function signInWithLocalOtp(client, options) {
  const phoneE164 = options.phoneE164;
  const code = options.code ?? DEFAULT_CODE;

  try {
    await client.api('/auth/otp/send', {
      method: 'POST',
      body: { phoneE164 },
    });
    console.log(`[ok] sent local OTP for ${phoneE164}`);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 429) {
      console.warn(
        `[warn] OTP send rate-limited for ${phoneE164}; continuing with local OTP`,
      );
    } else {
      throw error;
    }
  }

  await client.api('/auth/otp/verify', {
    method: 'POST',
    body: {
      phoneE164,
      code,
      deviceFingerprint: options.deviceFingerprint,
    },
  });
  console.log(`[ok] verified OTP for ${phoneE164}`);

  const me = await client.api('/auth/me');
  const communityId = me.communityIds?.[0];
  assert(
    communityId,
    'Authenticated user has no community. Run `pnpm --filter @sellr/api exec prisma db seed` or join DEV2026 first.',
  );

  console.log(`[ok] authenticated as ${me.user.displayName} in ${communityId}`);
  return { me, communityId };
}

module.exports = {
  ApiRequestError,
  assert,
  createSmokeApiClient,
  signInWithLocalOtp,
};
