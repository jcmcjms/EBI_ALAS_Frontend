import {create} from "zustand/react";

interface AuthState {
    accessToken: string | null;
    setAccessToken: (token: string | null) => void;
}
// store token in memory instead of localstorage to prevent XSS theft
export const useAuthStore = create<AuthState>((set) => ({
    accessToken: null,
    setAccessToken: (token) => set({accessToken: token})
}))