/**
 * Notification feature hooks — TanStack Query wrappers.
 */

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toastError } from "@/src/components/ui/toast";
import { getErrorMessage } from "@/src/lib/apiClient";
import { queryKeys } from "@/src/shared/lib/query/queryKeys";
import {
    getNotifications,
    getNotificationInbox,
    markNotificationRead,
    markAllNotificationsRead,
    type InboxQuery,
} from "../api/notifications";
import { useNotificationStore } from "../store/notification-store";
import { mapApiNotifications } from "../types";

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Header-bell query. When SignalR is connected, polling is disabled.
 * Falls back to 30s polling when disconnected.
 */
export function useNotifications(
    enabled = true,
    isSignalRConnected = false,
) {
    const setNotifications = useNotificationStore((s) => s.setNotifications);

    const query = useQuery({
        queryKey: queryKeys.notifications,
        queryFn: getNotifications,
        refetchInterval: isSignalRConnected ? false : 30_000,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        enabled,
        placeholderData: (prev) => prev,
    });

    useEffect(() => {
        if (query.data) {
            setNotifications(mapApiNotifications(query.data));
        }
    }, [query.data, setNotifications]);

    return query;
}

/**
 * Server-driven inbox query for the notifications page.
 */
export function useNotificationInbox(params: InboxQuery, enabled = true) {
    return useQuery({
        queryKey: [...queryKeys.notifications, "inbox", params],
        queryFn: () => getNotificationInbox(params),
        placeholderData: (prev) => prev,
        enabled,
    });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export function useMarkNotificationRead() {
    const queryClient = useQueryClient();
    const markRead = useNotificationStore((s) => s.markRead);

    return useMutation({
        mutationFn: (id: string) => markNotificationRead(Number(id)),
        onMutate: async (id) => {
            await queryClient.cancelQueries({
                queryKey: queryKeys.notifications,
            });
            markRead(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.notifications,
            });
        },
        onError: (error) => {
            toastError(getErrorMessage(error));
        },
    });
}

export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient();
    const markAllRead = useNotificationStore((s) => s.markAllRead);

    return useMutation({
        mutationFn: markAllNotificationsRead,
        onMutate: async () => {
            await queryClient.cancelQueries({
                queryKey: queryKeys.notifications,
            });
            markAllRead();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.notifications,
            });
        },
        onError: (error) => {
            toastError(getErrorMessage(error));
        },
    });
}
