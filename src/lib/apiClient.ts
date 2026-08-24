import * as axios from "axios";
import {useAuthStore} from "../store/authStore.ts";

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
})

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().setAccessToken(null);
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
)

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