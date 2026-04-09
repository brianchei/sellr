"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAccessToken = setAccessToken;
exports.apiFetch = apiFetch;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3001';
class ApiError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
}
let accessToken = null;
function setAccessToken(token) {
    accessToken = token;
}
async function apiFetch(path, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
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
        })));
        throw new ApiError(res.status, body.error ?? 'Request failed');
    }
    const json = (await res.json());
    return json.data;
}
