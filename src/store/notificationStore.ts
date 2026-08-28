import { create } from "zustand/react";

import { DUMMY_NOTIFICATIONS, type AppNotification } from "@/src/lib/notifications";

interface NotificationState {
    notifications: AppNotification[];
    markRead: (id: string) => void;
    markAllRead: () => void;
    resolveNotification: (id: string, resolution: "approved" | "declined") => void;
}

// In-memory like authStore (no localStorage \u2014 shared branch terminals).
// TODO(api): back with React Query mutations; keep these as optimistic updates.
export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: DUMMY_NOTIFICATIONS,

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