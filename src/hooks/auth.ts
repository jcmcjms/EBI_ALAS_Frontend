import { useNavigate } from "react-router-dom";
import {useAuthStore} from "@/store/authStore.ts";
import {useMutation} from "@tanstack/react-query";
import {apiClient} from "@/lib/apiClient.ts";

interface LoginCredentials {
    username: string;
    password: string;
}

export function useLogin(){
    const navigate = useNavigate();
    const setAccessToken = useAuthStore((state) => state.setAccessToken);

    return useMutation({
        mutationFn: (credentials: LoginCredentials) => apiClient.post("/api/auth/login", credentials),
        onSuccess: (response) => {
            // store access token in memory
            setAccessToken(response.data.accessToken);
            // navigate to dashboard
            navigate("/dashboard", {replace: true});
        }, onError: (error) => {
            console.error("Login failed", error);
        }
    });
}