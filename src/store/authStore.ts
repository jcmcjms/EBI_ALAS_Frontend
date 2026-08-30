import { create } from "zustand/react";

interface UserSession {
    userId: string;
    firstName: string;
    middleName: string;
    lastName: string;
    branchId: string;
    role: string;
    permissions: string[];
    mustChangePassword: boolean;
}

interface AuthState {
    accessToken: string | null;
    user: UserSession | null;
    /**
     * True while the silent refresh-token bootstrap is running on app boot.
     * Routes must NOT redirect to /login while this is true — they should
     * render a spinner until either the session is restored (`isInitializing`
     * becomes false AND `user` is set) or the refresh definitively fails
     * (`isInitializing` becomes false AND `user` is still null).
     *
     * Lifted from `useAuthInit` into the global store so `ProtectedRoute`
     * can read it without depending on the hook's local state.
     */
    isInitializing: boolean;
    setAccessToken: (token: string) => void;
    setSession: (token: string, user: UserSession) => void;
    clearSession: () => void;
    setInitializing: (value: boolean) => void;
    hasPermission: (permission: string | string[]) => boolean;
}
// store token in memory instead of localstorage to prevent XSS theft

export const useAuthStore = create<AuthState>((set, get) => ({
    accessToken: null,
    user: null,
    isInitializing: true,

    setAccessToken: (token) => set({ accessToken: token }),

    setSession: (token, user) => set({ accessToken: token, user }),

    clearSession: () => set({ accessToken: null, user: null }),

    setInitializing: (value) => set({ isInitializing: value }),

    hasPermission: (required) => {
        const { user } = get();
        if (!user) return false;

        // Super admin bypass
        if (user.permissions.includes("*")) return true;

        const requiredArray = Array.isArray(required) ? required : [required];
        return requiredArray.every((p) => user.permissions.includes(p));
    },
}));