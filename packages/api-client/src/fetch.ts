const useSameOriginApi = process.env.NEXT_PUBLIC_USE_SAME_ORIGIN_API === '1';

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && useSameOriginApi) {
    return '';
  }
  if (useSameOriginApi && typeof window === 'undefined') {
    return process.env.INTERNAL_API_URL ?? 'http://127.0.0.1:3001';
  }
  return (
    process.env.EXPO_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3001'
  );
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const base = getApiBaseUrl();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (typeof window !== 'undefined' && useSameOriginApi) {
    headers['X-Sellr-Client'] = 'web';
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${base}/api/v1${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({
      error: 'Unknown error',
    }))) as { error?: string };
    throw new ApiError(res.status, body.error ?? 'Request failed');
  }

  const json: unknown = await res.json();
  if (isRecord(json) && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

export { ApiError };
