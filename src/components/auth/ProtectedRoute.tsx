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

    // Check specific permission if required
    if (requiredPermission && !hasPermission(requiredPermission)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
