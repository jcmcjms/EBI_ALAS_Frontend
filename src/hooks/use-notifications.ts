import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { getNotifications } from "@/src/lib/api/notifications";
import { queryKeys } from "@/src/lib/queryKeys";
import { useNotificationStore } from "@/src/store/notificationStore";
import { mapApiNotifications } from "@/src/lib/notifications";

/**
 * Header-bell query for the current user's notifications.
 *
 * Behavior:
 *   - Polls every 30 seconds (`refetchInterval`) so a long-running
 *     tab keeps the bell accurate without needing a websocket.
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
 *
 * Returns the TanStack Query handle so callers can also force a refresh
 * (e.g. after a workflow mutation completes). Components that only need
 * the bell count should read the store directly — they don't need to
 * re-subscribe to the query.
 */
export function useNotifications(enabled: boolean = true) {
    const setNotifications = useNotificationStore((s) => s.setNotifications);

    const query = useQuery({
        queryKey: queryKeys.notifications,
        queryFn: getNotifications,
        // 30s poll. Slightly slower than the typical "real-time" feel
        // but the polling cost is one lightweight query per active
        // session. refetchOnWindowFocus stays on for instant updates
        // when the user returns to the tab.
        refetchInterval: 30_000,
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