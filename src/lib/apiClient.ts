import * as axios from "axios";
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
    // The backend must set this cookie (SameSite=Lax, NOT HttpOnly) and
    // validate the X-XSRF-TOKEN header on state-changing requests.
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
// 401 handling: If the backend returns 401, the access token is expired or
// revoked. Clear the entire session and redirect to login. This also covers
// the case where the refresh token cookie has expired.
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // 401 means the token is expired or revoked — drop the whole session.
            useAuthStore.getState().clearSession();
            window.location.href = "/login";
        }
        return Promise.reject(error);
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
