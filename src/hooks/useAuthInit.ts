import { useEffect } from "react";
import { useAuthStore } from "@/src/store/authStore";
import { apiClient } from "@/src/lib/apiClient";
import { extractUserFromToken } from "@/src/lib/jwt";

/**
 * Silently restores the user session from an HttpOnly refresh cookie on
 * initial app load. The backend reads the cookie, validates it, and
 * returns a fresh access token — no user interaction required.
 *
 * `isInitializing` is published to the auth store (not held in local state)
 * so `ProtectedRoute` can read the same flag. While `isInitializing === true`
 * the rest of the app shows a centered spinner and ProtectedRoute does NOT
 * redirect to /login (which would flash the login page for users who have
 * a valid refresh cookie).
 *
 * Requires the backend to expose: POST /api/auth/refresh
 *   Response: { success: boolean, data: { accessToken: string } }
 *
 * Side effects on the auth store:
 *  - setInitializing(true) on mount — already true by default; asserted here
 *    defensively in case the hook is remounted.
 *  - setSession(token, user) on successful refresh.
 *  - setInitializing(false) in the `finally` block (runs on both success
 *    AND error paths) so the app always resolves from the bootstrap state.
 */
export function useAuthInit(): void {
    const setSession = useAuthStore((state) => state.setSession);
    const setInitializing = useAuthStore((state) => state.setInitializing);

    useEffect(() => {
        let cancelled = false;

        // Defensive: ensure bootstrap state is set BEFORE the network call.
        // Without this, a StrictMode double-mount could flip the flag false
        // on the first cleanup before the second mount sees the network
        // call succeed.
        setInitializing(true);

        const initAuth = async () => {
            try {
                // The browser automatically sends the HttpOnly refresh cookie
                // because withCredentials: true is set on apiClient.
                const { data: apiResponse } = await apiClient.post("/api/auth/refresh");

                if (!cancelled && apiResponse?.success && apiResponse.data?.accessToken) {
                    const token = apiResponse.data.accessToken;
                    const user = extractUserFromToken(token);

                    if (user) {
                        setSession(token, user);
                    }
                }
                // If refresh fails or token is invalid, user stays logged out —
                // they'll see the login page naturally.
            } catch {
                // Refresh cookie expired or backend unreachable — silent fail.
                // User will be redirected to /login by ProtectedRoute once
                // isInitializing becomes false.
            } finally {
                if (!cancelled) {
                    setInitializing(false);
                }
            }
        };

        initAuth();

        return () => {
            cancelled = true;
        };
    }, [setSession, setInitializing]);
}