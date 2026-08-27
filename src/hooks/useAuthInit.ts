import { useEffect, useState } from "react";
import { useAuthStore } from "@/src/store/authStore";
import { apiClient } from "@/src/lib/apiClient";
import { extractUserFromToken } from "@/src/lib/jwt";

/**
 * Silently restores the user session from an HttpOnly refresh cookie on
 * initial app load. The backend reads the cookie, validates it, and
 * returns a fresh access token — no user interaction required.
 *
 * Wrap the <App /> root with this hook and show a global spinner while
 * `isInitializing` is true to prevent a flash of the login page.
 *
 * Requires the backend to expose: POST /api/auth/refresh
 *   Response: { success: boolean, data: { accessToken: string } }
 */
export function useAuthInit() {
  const [isInitializing, setIsInitializing] = useState(true);
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    let cancelled = false;

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
        // User will be redirected to /login by ProtectedRoute.
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    };

    initAuth();

    return () => {
      cancelled = true;
    };
  }, [setSession]);

  return isInitializing;
}
