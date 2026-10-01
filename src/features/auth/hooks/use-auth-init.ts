import { useEffect } from "react";
import { useAuthStore } from "@/src/store/authStore";
import { apiClient } from "@/src/lib/apiClient";
import { extractUserFromToken } from "@/src/shared/lib/jwt";
import { toastError } from "@/src/components/ui/toast";


export function useAuthInit(): void {
    const setSession = useAuthStore((state) => state.setSession);
    const setInitializing = useAuthStore((state) => state.setInitializing);

    useEffect(() => {
        let cancelled = false;

        
        
        
        
        setInitializing(true);

        const initAuth = async () => {
            try {
                
                
                const { data: apiResponse } = await apiClient.post("/api/auth/refresh");

                if (!cancelled && apiResponse?.success && apiResponse.data?.accessToken) {
                    const token = apiResponse.data.accessToken;
                    const user = extractUserFromToken(token);

                    if (user) {
                        setSession(token, user);
                    }
                }
                
                
            } catch (error) {
                
                
                
                
                const axiosError = error as { response?: { status?: number } };
                const status = axiosError?.response?.status;
                if (status === 502) {
                    toastError("Server is temporarily unavailable. Please try again later.");
                } else if (status === 401 || status === 403) {
                    
                } else if (!axiosError?.response) {
                    toastError("Unable to connect to the server. Please check your network connection.");
                } else {
                    toastError("Failed to restore session. Please log in again.");
                }
            } finally {
                if (!cancelled) {
                    setInitializing(false);
                }
            }
        };

        initAuth();

        return () => {
            cancelled = true;
        };
    }, [setSession, setInitializing]);
}
