import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/src/store/authStore";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredPermission?: string | string[];
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
    const location = useLocation();
    const accessToken = useAuthStore((state) => state.accessToken);
    const user = useAuthStore((state) => state.user);
    const hasPermission = useAuthStore((state) => state.hasPermission);

    // Not logged in — redirect to login
    if (!accessToken) {
        return <Navigate to="/login" replace />;
    }

    // Intercept: If user must change password, block access to all other routes
    if (user?.mustChangePassword && location.pathname !== "/change-password") {
        return <Navigate to="/change-password" replace />;
    }

    // Logged in but lacks the required permission — send to /forbidden
    // instead of silently redirecting to /dashboard (which causes UX
    // confusion and hides unauthorized access attempts from auditing).
    if (requiredPermission && !hasPermission(requiredPermission)) {
        // TODO: Log this unauthorized access attempt to your SIEM system
        // Example: siem.log({ event: "unauthorized_access", userId, path, requiredPermission });
        console.warn(
            "[Security] Unauthorized access attempt:",
            { requiredPermission, path: window.location.pathname }
        );
        return <Navigate to="/forbidden" replace />;
    }

    return <>{children}</>;
}
