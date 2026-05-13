declare class ApiError extends Error {
    status: number;
    constructor(status: number, message: string);
}
export declare function setAccessToken(token: string | null): void;
export declare function apiFetch<T>(path: string, options?: RequestInit, retryAfterRefresh?: boolean): Promise<T>;
export { ApiError };
//# sourceMappingURL=fetch.d.ts.map