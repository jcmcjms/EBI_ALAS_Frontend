import { create } from "zustand/react";

import type { AppNotification } from "@/src/lib/notifications";

interface NotificationState {
    notifications: AppNotification[];
    /**
     * Replace the entire inbox. Called by `useNotifications` after each
     * successful poll. Treat the array as the source of truth — the
     * individual `markRead` / `markAllRead` actions are pure local
     * optimists; the next poll will reconcile them with the server.
     */
    setNotifications: (rows: AppNotification[]) => void;
    /**
     * Prepend a single real-time notification pushed via SignalR.
     * Deduplicates by ID in case a 30s poll overlaps with a push.
     */
    addNotification: (notification: AppNotification) => void;
    markRead: (id: string) => void;
    markAllRead: () => void;
}

/**
 * In-memory like authStore (no localStorage — shared branch terminals).
 *
 * Hydration model:
 *   - Initial state is an empty array. The UI renders an empty-state
 *     skeleton until the first successful poll from `useNotifications`.
 *   - Once a user is authenticated, `useNotifications` runs the query
 *     which calls `setNotifications(...)`. After that point the store is
 *     the live inbox.
 */
export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],

    setNotifications: (rows) => set({ notifications: rows }),

    addNotification: (notification) =>
        set((state) => ({
            // Prepend so it appears at the top of the bell dropdown.
            // Deduplicate by ID in case a 30s poll overlaps with a push.
            notifications: [
                notification,
                ...state.notifications.filter((n) => n.id !== notification.id),
            ],
        })),

    markRead: (id) =>
        set((state) => ({
            notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),

    markAllRead: () =>
        set((state) => ({
            notifications: state.notifications.map((n) => (n.read ? n : { ...n, read: true })),
        })),
}));
