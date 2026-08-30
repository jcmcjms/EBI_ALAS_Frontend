import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/src/lib/queryKeys";
import {
    getAccountProfile,
    getAccountSessions,
    getAccountActivity,
    getAccountLoans,
    getAccountClients,
    updateAccountProfile,
    revokeAccountSession,
    type PagedSessionsResponse,
} from "@/src/lib/api/account";

export function useAccountProfile() {
    return useQuery({
        queryKey: queryKeys.account.profile,
        queryFn: getAccountProfile,
        staleTime: 5 * 60 * 1000, // 5 minutes — own profile rarely changes
    });
}

export function useAccountSessions(pageNumber = 1, pageSize = 10) {
    return useQuery<PagedSessionsResponse>({
        queryKey: queryKeys.account.sessions(pageNumber, pageSize),
        queryFn: () => getAccountSessions(pageNumber, pageSize),
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
}

export function useAccountActivity(limit = 10) {
    return useQuery({
        queryKey: queryKeys.account.activity(limit),
        queryFn: () => getAccountActivity(limit),
        staleTime: 2 * 60 * 1000,
    });
}

export function useAccountLoans(limit = 10) {
    return useQuery({
        queryKey: queryKeys.account.loans(limit),
        queryFn: () => getAccountLoans(limit),
        staleTime: 2 * 60 * 1000,
    });
}

export function useAccountClients(limit = 5) {
    return useQuery({
        queryKey: queryKeys.account.clients(limit),
        queryFn: () => getAccountClients(limit),
        staleTime: 5 * 60 * 1000,
    });
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateAccountProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.account.profile });
            toast.success("Profile updated successfully");
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || "Failed to update profile");
        },
    });
}

export function useRevokeSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: revokeAccountSession,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["account-sessions"] });
            toast.success("Session revoked successfully");
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || "Failed to revoke session");
        },
    });
}