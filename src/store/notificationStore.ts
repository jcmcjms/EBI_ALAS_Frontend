import { create } from "zustand/react";

import { DUMMY_NOTIFICATIONS, type AppNotification } from "@/src/lib/notifications";

interface NotificationState {
    notifications: AppNotification[];
    /**
     * Replace the entire inbox. Called by `useNotifications` after each
     * successful poll. Treat the array as the source of truth — the
     * individual `markRead` / `markAllRead` actions are pure local
     * optimists; the next poll will reconcile them with the server.
     */
    setNotifications: (rows: AppNotification[]) => void;
    markRead: (id: string) => void;
    markAllRead: () => void;
    resolveNotification: (id: string, resolution: "approved" | "declined") => void;
}

/**
 * In-memory like authStore (no localStorage — shared branch terminals).
 *
 * Hydration model:
 *   - Initial state is the dummy list (so the UI renders something
 *     before the first poll lands). Real backend data is pushed by
 *     `useNotifications` on the AppShell, and overrides the dummy list
 *     immediately on the first successful poll.
 *   - Once a user is authenticated, `useNotifications` runs the query
 *     which calls `setNotifications(...)`. After that point the store is
 *     the live inbox.
 */
export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: DUMMY_NOTIFICATIONS,

    setNotifications: (rows) => set({ notifications: rows }),

    markRead: (id) =>
        set((state) => ({
            notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),

    markAllRead: () =>
        set((state) => ({
            notifications: state.notifications.map((n) => (n.read ? n : { ...n, read: true })),
        })),

    resolveNotification: (id, resolution) =>
        set((state) => ({
            notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, read: true, pendingAction: undefined, resolved: resolution } : n
            ),
        })),
}));