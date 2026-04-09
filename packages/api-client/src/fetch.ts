const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/v1${path}`, {
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
