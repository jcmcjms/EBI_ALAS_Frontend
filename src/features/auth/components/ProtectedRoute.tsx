import { Navigate, useLocation } from "react-router-dom";
import { Spinner } from "@/src/components/ui/spinner";
import { useAuthStore } from "@/src/store/authStore";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredPermission?: string | string[];
}


export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
    const location = useLocation();
    const isInitializing = useAuthStore((state) => state.isInitializing);
    const accessToken = useAuthStore((state) => state.accessToken);
    const user = useAuthStore((state) => state.user);
    const hasPermission = useAuthStore((state) => state.hasPermission);

    
    
    
    
    if (isInitializing) {
        return (
            <div className="flex h-screen items-center justify-center" role="status" aria-live="polite">
                <Spinner className="size-8" />
            </div>
        );
    }

    
    if (!accessToken || !user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    
    if (user.mustChangePassword && location.pathname !== "/change-password") {
        return <Navigate to="/change-password" replace />;
    }

    
    if (requiredPermission && !hasPermission(requiredPermission)) {
        if (import.meta.env.DEV) {
            console.warn(
                "[Security] Unauthorized access attempt:",
                { requiredPermission, path: window.location.pathname }
            );
        }
        return <Navigate to="/forbidden" replace />;
    }

    
    return <>{children}</>;
}
