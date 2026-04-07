export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export function ok<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
  return { data, meta };
}

export function paginated<T>(
  data: T[],
  page: number,
  total: number,
  perPage: number,
): ApiResponse<T[]> {
  return {
    data,
    meta: { page, total, perPage, totalPages: Math.ceil(total / perPage) },
  };
}
