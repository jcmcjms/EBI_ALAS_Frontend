import { Navigate, useLocation } from "react-router-dom";
import { Spinner } from "@/src/components/ui/spinner";
import { useAuthStore } from "@/src/store/authStore";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredPermission?: string | string[];
}

/**
 * Auth guard. Three states, in this exact order:
 *
 *  1. `isInitializing === true` → render a centered spinner. DO NOT redirect.
 *     This is the silent bootstrap window; we must not flash /login for users
 *     with a valid refresh cookie.
 *
 *  2. `isInitializing === false && !user` → redirect to /login (preserving the
 *     intended destination so post-login navigation returns here).
 *
 *  3. `isInitializing === false && user` → also enforce:
 *       - `mustChangePassword` → force /change-password.
 *       - `requiredPermission` (if provided) → /forbidden when missing.
 *       - else → render children.
 */
export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
    const location = useLocation();
    const isInitializing = useAuthStore((state) => state.isInitializing);
    const accessToken = useAuthStore((state) => state.accessToken);
    const user = useAuthStore((state) => state.user);
    const hasPermission = useAuthStore((state) => state.hasPermission);

    // (1) Bootstrap in progress — wait silently. The matching spinner is also
    // shown at the app level via <AuthInitProvider />, but rendering it here
    // too keeps each <ProtectedRoute> self-contained if it's ever used
    // outside the AuthInitProvider tree.
    if (isInitializing) {
        return (
            <div className="flex h-screen items-center justify-center" role="status" aria-live="polite">
                <Spinner className="size-8" />
            </div>
        );
    }

    // (2) Bootstrap complete and no session — go to /login.
    if (!accessToken || !user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // (3a) Force a password change before allowing anything else.
    if (user.mustChangePassword && location.pathname !== "/change-password") {
        return <Navigate to="/change-password" replace />;
    }

    // (3b) Permission gate.
    if (requiredPermission && !hasPermission(requiredPermission)) {
        // TODO: Log this unauthorized access attempt to your SIEM system
        // Example: siem.log({ event: "unauthorized_access", userId, path, requiredPermission });
        console.warn(
            "[Security] Unauthorized access attempt:",
            { requiredPermission, path: window.location.pathname }
        );
        return <Navigate to="/forbidden" replace />;
    }

    // (3c) All clear.
    return <>{children}</>;
}