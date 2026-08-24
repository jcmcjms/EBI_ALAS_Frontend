interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredPermission?: string | string[];
}

// Auth bypassed for now — always render children
export function ProtectedRoute({ children }: ProtectedRouteProps) {
    return <>{children}</>;
}
