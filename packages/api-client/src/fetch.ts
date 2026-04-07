const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
  error?: string;
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
    credentials: 'include', // For web httpOnly cookie refresh
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(res.status, body.error ?? 'Request failed');
  }

  const json: ApiResponse<T> = await res.json();
  return json.data;
}
