import axios from "axios";
import {useAuthStore} from "../store/authStore.ts";

// In development, Vite proxy forwards /api/* to the backend.
// In production, use the explicit base URL.
const baseURL = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL;

/**
 * Read a cookie value by name. Used to extract the XSRF-TOKEN
 * that the backend sets as a regular (non-HttpOnly) cookie.
 */
function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
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
// 2. On mutating methods (POST, PUT, PATCH, DELETE), attach the CSRF token
//    from the XSRF-TOKEN cookie. This is required when the backend uses
//    cookie-based authentication (HttpOnly refresh token) and is vulnerable
//    to CSRF without this header.
apiClient.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // CSRF protection: read XSRF-TOKEN cookie and send as header.
    const method = config.method?.toUpperCase();
    if (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") {
        const xsrfToken = getCookie("XSRF-TOKEN");
        if (xsrfToken) {
            config.headers["X-XSRF-TOKEN"] = xsrfToken;
        }
    }

    return config;
});

// ── Response interceptor ─────────────────────────────────────────────────────
// 401 handling: Instead of immediately logging out, attempt a silent refresh.
// The browser automatically sends the HttpOnly refreshToken cookie with the
// POST /api/auth/refresh request. If it succeeds, update Zustand and retry
// the original request. If it fails, THEN clear the session.
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If not a 401, or if this is the refresh call itself, or already retried — reject immediately
        if (
            error.response?.status !== 401 ||
            originalRequest._retry ||
            originalRequest.url === "/api/auth/refresh"
        ) {
            return Promise.reject(error);
        }

        // If a refresh is already in progress, queue this request
        if (isRefreshing) {
            return new Promise<string>((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then((newToken) => {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return apiClient(originalRequest);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            // POST /api/auth/refresh — browser sends the HttpOnly cookie automatically
            const { data: apiResponse } = await axios.post(
                `${originalRequest.baseURL || ""}/api/auth/refresh`,
                null,
                { withCredentials: true, headers: { "Content-Type": "application/json" } }
            );

            if (apiResponse?.success && apiResponse.data?.accessToken) {
                const newToken = apiResponse.data.accessToken;
                useAuthStore.getState().setAccessToken(newToken);

                // Update the original request with the new token and retry
                originalRequest.headers.Authorization = `Bearer ${newToken}`;

                // Process any queued requests that were waiting for the refresh
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
