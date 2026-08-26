import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/src/store/authStore";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredPermission?: string | string[];
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
    const accessToken = useAuthStore((state) => state.accessToken);
    const hasPermission = useAuthStore((state) => state.hasPermission);

    // Not logged in — redirect to login
    if (!accessToken) {
        return <Navigate to="/login" replace />;
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
