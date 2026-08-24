import { ReactNode } from "react";
import { useAuthStore } from "@/store/authStore";

interface GateProps {
    permission: string | string[];
    children: ReactNode;
    fallback?: ReactNode;
}

export function Gate({ permission, children, fallback = null }: GateProps) {
    const hasPermission = useAuthStore((state) => state.hasPermission);

    if (!hasPermission(permission)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}