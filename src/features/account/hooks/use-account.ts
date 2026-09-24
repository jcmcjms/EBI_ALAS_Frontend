/**
 * Account feature hooks — TanStack Query wrappers.
 *
 * Each hook owns one query/mutation. Toast notifications live here so
 * components stay presentation-only.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toastError, toastSuccess } from "@/src/components/ui/toast";
import { queryKeys } from "@/src/lib/queryKeys";
import { getErrorMessage } from "@/src/lib/apiClient";
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
} from "../api/account";

// ─── Queries ────────────────────────────────────────────────────────────────

export function useAccountProfile() {
    return useQuery({
        queryKey: queryKeys.account.profile,
        queryFn: getAccountProfile,
        staleTime: 5 * 60_000, // own profile rarely changes
    });
}

export function useAccountSessions(pageNumber = 1, pageSize = 10) {
    return useQuery<PagedSessionsResponse>({
        queryKey: queryKeys.account.sessions(pageNumber, pageSize),
        queryFn: () => getAccountSessions(pageNumber, pageSize),
        staleTime: 2 * 60_000,
    });
}

export function useAccountActivity(limit = 10) {
    return useQuery({
        queryKey: queryKeys.account.activity(limit),
        queryFn: () => getAccountActivity(limit),
        staleTime: 2 * 60_000,
    });
}

export function useAccountLoans(limit = 10) {
    return useQuery({
        queryKey: queryKeys.account.loans(limit),
        queryFn: () => getAccountLoans(limit),
        staleTime: 2 * 60_000,
    });
}

export function useAccountClients(limit = 5) {
    return useQuery({
        queryKey: queryKeys.account.clients(limit),
        queryFn: () => getAccountClients(limit),
        staleTime: 5 * 60_000,
    });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateAccountProfile,
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
            queryClient.invalidateQueries({ queryKey: queryKeys.account.all });
            toastSuccess("Session revoked successfully");
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
        onSuccess: (revokedCount) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.account.all });
            toastSuccess(
                `${revokedCount} other session${revokedCount === 1 ? "" : "s"} revoked`,
            );
        },
        onError: (error) => {
            toastError(getErrorMessage(error) || "Failed to revoke other sessions");
        },
    });
}
