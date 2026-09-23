import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    getNotifications,
    getNotificationInbox,
    markNotificationRead,
    markAllNotificationsRead,
    type InboxQuery,
} from "@/src/lib/api/notifications";
import { queryKeys } from "@/src/lib/queryKeys";
import { useNotificationStore } from "@/src/store/notificationStore";
import { mapApiNotifications } from "@/src/lib/notifications";
import { toastError } from "@/src/components/ui/toast";
import { getErrorMessage } from "@/src/lib/apiClient";

/**
 * Header-bell query for the current user's notifications.
 *
 * Behavior:
 *   - When SignalR is connected: polling is DISABLED (refetchInterval
 *     is `false`). Real-time events from the WebSocket push new
 *     notifications into the Zustand store instantly. This eliminates
 *     the 30s poll entirely for connected clients.
 *   - When SignalR is disconnected: falls back to 30s polling so the
 *     bell stays accurate even if the WebSocket drops.
 *   - Stops polling while the tab is hidden — the user isn't going to
 *     look at the bell during that time, and pausing avoids hammering
 *     the server when 50 officers all minimize their windows.
 *   - Pipes the API result through `mapApiNotifications` to the
 *     Zustand store so every component reading
 *     `useNotificationStore((s) => s.notifications)` stays in sync.
 *
 * @param enabled Pass `false` while the user is unauthenticated or the
 *                auth bootstrap hasn't completed. Defaults to `true` so
 *                existing call sites that don't pass the flag keep
 *                working (the bell always polls once mounted).
 * @param isSignalRConnected Pass the `isConnected` state from
 *                `useSignalR()` so the hook can gate polling on
 *                WebSocket availability. Defaults to `false` (poll
 *                always) for backward compatibility.
 *
 * Returns the TanStack Query handle so callers can also force a refresh
 * (e.g. after a workflow mutation completes). Components that only need
 * the bell count should read the store directly — they don't need to
 * re-subscribe to the query.
 */
export function useNotifications(enabled: boolean = true, isSignalRConnected: boolean = false) {
    const setNotifications = useNotificationStore((s) => s.setNotifications);

    const query = useQuery({
        queryKey: queryKeys.notifications,
        queryFn: getNotifications,
        // When SignalR is connected, disable polling entirely — the
        // WebSocket pushes new notifications in real-time. When
        // disconnected, fall back to 30s polling so the bell stays
        // accurate.
        refetchInterval: isSignalRConnected ? false : 30_000,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        // Don't fire the network call until the user is authenticated
        // — the unauthenticated path would 401 (and trigger a refresh
        // attempt) every 30s, polluting dev tools + wasting cycles.
        enabled,
        // Show the previous list while the next poll is in flight so
        // the bell doesn't flash an empty state every 30s.
        placeholderData: (prev) => prev,
    });

    // Pipe API data → Zustand store. Map happens inside an effect so
    // a single new notification array doesn't trigger two re-renders
    // (the query already re-renders on success; the store update is a
    // side effect).
    useEffect(() => {
        if (query.data) {
            setNotifications(mapApiNotifications(query.data));
        }
    }, [query.data, setNotifications]);

    return query;
}

/**
 * Server-driven inbox query for the notifications page.
 * Supports status/type/search filtering and pagination.
 * Returns items, totalCount, and unreadCount in one round-trip.
 */
export function useNotificationInbox(params: InboxQuery, enabled = true) {
    return useQuery({
        queryKey: [...queryKeys.notifications, "inbox", params],
        queryFn: () => getNotificationInbox(params),
        // Keep previous data while fetching next page to prevent
        // skeleton flash during pagination.
        placeholderData: (prev) => prev,
        enabled,
    });
}

/**
 * Mutation hook to mark a single notification as read.
 * Uses optimistic update: flips the store immediately, then
 * invalidates on success. On error, shows a toast — the next
 * poll reconciles the rollback.
 */
export function useMarkNotificationRead() {
    const queryClient = useQueryClient();
    const markRead = useNotificationStore((s) => s.markRead);

    return useMutation({
        mutationFn: (id: string) => markNotificationRead(Number(id)),
        onMutate: async (id) => {
            // Optimistic: bell + row flip instantly
            await queryClient.cancelQueries({ queryKey: queryKeys.notifications });
            markRead(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
        },
        onError: (error) => {
            toastError(getErrorMessage(error));
        },
    });
}

/**
 * Mutation hook to mark all unread notifications as read.
 * Uses optimistic update: flips the store immediately, then
 * invalidates on success. On error, shows a toast.
 */
export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient();
    const markAllRead = useNotificationStore((s) => s.markAllRead);

    return useMutation({
        mutationFn: markAllNotificationsRead,
        onMutate: async () => {
            // Optimistic: flip all in store immediately
            await queryClient.cancelQueries({ queryKey: queryKeys.notifications });
            markAllRead();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
        },
        onError: (error) => {
            toastError(getErrorMessage(error));
        },
    });
}
