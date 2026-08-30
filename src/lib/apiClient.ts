import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import { useAuthStore } from "../store/authStore.ts";
import { decodeJwtPayload } from "./jwt.ts";

// In development, Vite proxy forwards /api/* to the backend.
// In production, use the explicit base URL.
const baseURL = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL;

/**
 * Backend CSRF contract (CsrfValidationMiddleware):
 *  - All non-GET/HEAD/OPTIONS requests must carry `X-XSRF-TOKEN: <value>`.
 *  - Expected value is the `xsrfToken` claim in the access JWT.
 *  - The token lives in the access JWT only — never in a cookie — to prevent
 *    CSRF from a leaked refresh cookie.
 *
 * See backend docs: CsrfValidationMiddleware + JwtXsrfTokenIssuer.
 */
const CSRF_HEADER = "X-XSRF-TOKEN";

/** Methods that must carry the CSRF header (RFC 7231 §4.2.1 unsafe methods). */
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Parse the access JWT and return the `xsrfToken` claim, or null when:
 *  - token is null/empty
 *  - token is not a 3-part JWT (e.g. malformed, legacy, or absent)
 *  - payload cannot be decoded
 *  - claim is missing or non-string
 *
 * Never throws — a parse failure should *skip* the header (the backend will
 * respond with a structured 403), not crash the request.
 */
function extractXsrfToken(jwt: string | null): string | null {
    if (!jwt) return null;
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    try {
        const payload = decodeJwtPayload(jwt) as { xsrfToken?: unknown } | null;
        return typeof payload?.xsrfToken === "string" ? payload.xsrfToken : null;
    } catch {
        return null;
    }
}

/** Check whether the backend rejected a request as a CSRF failure. */
function isCsrfFailure(error: AxiosError): boolean {
    if (error.response?.status !== 403) return false;
    const data = error.response.data;
    if (!data || typeof data !== "object") return false;
    // Backend envelope: { success, message, data, errors, timestamp, code? }
    const code = (data as { code?: unknown }).code;
    if (typeof code === "string" && code.toUpperCase() === "CSRF_VALIDATION_FAILED") {
        return true;
    }
    // Fallback: structured message contains the marker phrase.
    const message = (data as { message?: unknown }).message;
    return typeof message === "string" && /csrf/i.test(message);
}

export const apiClient = axios.create({
    baseURL,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
});

// ── Refresh token mutex ──────────────────────────────────────────────────────
// Prevents multiple concurrent 401s from firing duplicate refresh requests.
// All pending requests share the same refresh promise, then retry with the new token.
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error || !token) {
            reject(error);
        } else {
            resolve(token);
        }
    });
    failedQueue = [];
}

// ── Request interceptor ──────────────────────────────────────────────────────
// 1. Attach the in-memory Bearer token (access token stays in Zustand — never
//    in a cookie or localStorage — to prevent XSS theft).
// 2. On unsafe methods, attach `X-XSRF-TOKEN` from the JWT's `xsrfToken` claim.
//    This satisfies CsrfValidationMiddleware. We skip silently when the claim
//    is missing or the JWT is malformed — the backend will reject the request
//    with a structured 403 which we handle in the response interceptor.
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();

    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }

    const method = config.method?.toUpperCase();
    if (method && UNSAFE_METHODS.has(method)) {
        const xsrfToken = extractXsrfToken(accessToken);
        if (xsrfToken) {
            config.headers[CSRF_HEADER] = xsrfToken;
        } else if (accessToken) {
            // User is authenticated but the JWT doesn't carry a fresh xsrfToken.
            // Don't crash the request; just log. The response interceptor will
            // surface a CSRF failure if the backend rejects it.
            console.warn(
                "[CSRF] Authenticated request without xsrfToken claim — backend will reject.",
                { method, url: config.url }
            );
        }
    }

    return config;
});

// ── Response interceptor ─────────────────────────────────────────────────────
// Two distinct failure paths:
//
//   (a) 401: silent refresh-then-retry (existing flow, preserved).
//
//   (b) 403 with `code === "CSRF_VALIDATION_FAILED"`: this is a configuration
//       bug, not a transient failure — the access JWT we sent does not match
//       the XSRF token the backend expected. Possible causes:
//         - access token refreshed but the in-flight mutation still holds
//           the old xsrfToken claim (rare race),
//         - user signed in on another device and the JWT signature/claim
//           changed silently,
//         - backend was redeployed with a rotated signing key.
//       We do NOT retry; we log and surface a toast so the user knows to
//       re-authenticate.
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

        // ── CSRF failure: log + toast, do not retry ─────────────────────────
        if (isCsrfFailure(error)) {
            const url = originalRequest?.url ?? "(unknown)";
            const method = (originalRequest?.method ?? "?").toUpperCase();
            console.error(
                `[CSRF] Backend rejected ${method} ${url} as CSRF_VALIDATION_FAILED. ` +
                "User must sign in again to refresh the xsrfToken claim."
            );
            toast.error("Session security token expired — please log in again.");
            return Promise.reject(error);
        }

        // ── Non-401 (and not CSRF): reject as-is ────────────────────────────
        if (
            error.response?.status !== 401 ||
            !originalRequest ||
            originalRequest._retry ||
            originalRequest.url === "/api/auth/refresh"
        ) {
            return Promise.reject(error);
        }

        // ── 401 path: silent refresh + queue + retry ────────────────────────
        if (isRefreshing) {
            return new Promise<string>((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then((newToken) => {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                // Re-extract XSRF from the *new* token so the retry carries a
                // matching claim pair (Bearer + X-XSRF-TOKEN).
                const newXsrf = extractXsrfToken(newToken);
                if (newXsrf) {
                    originalRequest.headers[CSRF_HEADER] = newXsrf;
                }
                return apiClient(originalRequest);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            // POST /api/auth/refresh — browser sends the HttpOnly cookie automatically.
            // Skip the CSRF header for refresh itself (server exempts /auth/*).
            const { data: apiResponse } = await axios.post(
                `${originalRequest.baseURL || ""}/api/auth/refresh`,
                null,
                { withCredentials: true, headers: { "Content-Type": "application/json" } }
            );

            if (apiResponse?.success && apiResponse.data?.accessToken) {
                const newToken: string = apiResponse.data.accessToken;
                useAuthStore.getState().setAccessToken(newToken);

                // Update the original request with the new token AND its
                // fresh xsrfToken claim, then retry.
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                const newXsrf = extractXsrfToken(newToken);
                if (newXsrf) {
                    originalRequest.headers[CSRF_HEADER] = newXsrf;
                }

                processQueue(null, newToken);

                return apiClient(originalRequest);
            }

            // Refresh returned no token — session is dead
            processQueue(new Error("Refresh failed"), null);
            useAuthStore.getState().clearSession();
            window.location.href = "/login";
            return Promise.reject(error);
        } catch (refreshError) {
            // Refresh cookie expired or backend unreachable — force logout
            processQueue(refreshError, null);
            useAuthStore.getState().clearSession();
            window.location.href = "/login";
            return Promise.reject(error);
        } finally {
            isRefreshing = false;
        }
    }
);

/**
 * Extracts a user-friendly error message from an Axios error.
 */
export function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        // Server responded with an error status
        if (error.response) {
            const data = error.response.data;
            // Try common error message shapes from the API
            if (typeof data === "string") return data;
            if (data?.message) return data.message;
            if (data?.error) return data.error;
            if (data?.detail) return data.detail;
        }
        // Request was made but no response received (network error)
        if (error.request) {
            return "Network error. Please check your connection and try again.";
        }
    }
    return "An unexpected error occurred. Please try again.";
}