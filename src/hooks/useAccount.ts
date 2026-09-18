import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toastSuccess, toastError } from "@/src/components/ui/toast";
import { queryKeys } from "@/src/lib/queryKeys";
import {
    getAccountProfile,
    getAccountSessions,
    getAccountActivity,
    getAccountLoans,
    getAccountClients,
    updateAccountProfile,
    revokeAccountSession,
    revokeOtherSessions,
    type PagedSessionsResponse,
    type UpdateProfilePayload,
} from "@/src/lib/api/account";
import { getErrorMessage } from "@/src/lib/apiClient";

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
        mutationFn: (data: UpdateProfilePayload) => updateAccountProfile(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.account.profile });
            toastSuccess("Profile updated successfully");
        },
        onError: (error) => {
            toastError(getErrorMessage(error) || "Failed to update profile");
        },
    });
}

export function useRevokeSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: revokeAccountSession,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.account.sessionsAll });
            toastSuccess("Session revoked.");
        },
        onError: (error) => {
            toastError(getErrorMessage(error) || "Failed to revoke session");
        },
    });
}

export function useRevokeOtherSessions() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: revokeOtherSessions,
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.account.sessionsAll });
            toastSuccess(`Signed out ${count} other session${count === 1 ? "" : "s"}.`);
        },
        onError: (error) => {
            toastError(getErrorMessage(error) || "Failed to sign out other sessions");
        },
    });
}