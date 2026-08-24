import {create} from "zustand/react";

interface UserSession{
    userId: string;
    fullName: string;
    branchId: string;
    permissions: string[];
}

interface AuthState{
    accessToken: string | null;
    user: UserSession | null;
    setAccessToken: (token: string) => void;
    setSession: (token: string, user: UserSession) => void;
    clearSession: () => void;
    hasPermission: (permission: string | string[]) => boolean;
}
// store token in memory instead of localstorage to prevent XSS theft

export const useAuthStore = create<AuthState>((set, get) => ({
    accessToken: null,
    user: null,

    setAccessToken: (token) => set({ accessToken: token }),

    setSession: (token, user) => set({ accessToken: token, user }),

    clearSession: () => set({ accessToken: null, user: null }),

    hasPermission: (required) => {
        const { user } = get();
        if (!user) return false;

        // Super admin bypass
        if (user.permissions.includes("*")) return true;

        const requiredArray = Array.isArray(required) ? required : [required];
        return requiredArray.every(p => user.permissions.includes(p));
    },
}));