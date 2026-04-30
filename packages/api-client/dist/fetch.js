"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
exports.setAccessToken = setAccessToken;
exports.apiFetch = apiFetch;
const useSameOriginApi = process.env.NEXT_PUBLIC_USE_SAME_ORIGIN_API === '1';
function getApiBaseUrl() {
    if (typeof window !== 'undefined' && useSameOriginApi) {
        return '';
    }
    if (useSameOriginApi && typeof window === 'undefined') {
        return process.env.INTERNAL_API_URL ?? 'http://127.0.0.1:3001';
    }
    return (process.env.EXPO_PUBLIC_API_URL ??
        process.env.NEXT_PUBLIC_API_URL ??
        'http://localhost:3001');
}
class ApiError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
}
exports.ApiError = ApiError;
let accessToken = null;
function setAccessToken(token) {
    accessToken = token;
}
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
async function apiFetch(path, options = {}) {
    const base = getApiBaseUrl();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
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
        const body = (await res.json().catch(() => null));
        const fallback = res.status >= 500
            ? 'Sellr API is unavailable. Make sure the API server is running and try again.'
            : res.statusText || 'Request failed';
        throw new ApiError(res.status, body?.error ?? fallback);
    }
    const json = await res.json();
    if (isRecord(json) && 'data' in json) {
        return json.data;
    }
    return json;
}
