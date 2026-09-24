/**
 * Notification Zustand store — in-memory bell state.
 */

import { create } from "zustand/react";
import type { AppNotification } from "../types";

interface NotificationState {
    notifications: AppNotification[];
    setNotifications: (rows: AppNotification[]) => void;
    addNotification: (notification: AppNotification) => void;
    markRead: (id: string) => void;
    markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],

    setNotifications: (rows) => set({ notifications: rows }),

    addNotification: (notification) =>
        set((state) => ({
            notifications: [
                notification,
                ...state.notifications.filter((n) => n.id !== notification.id),
            ],
        })),

    markRead: (id) =>
        set((state) => ({
            notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, read: true } : n,
            ),
        })),

    markAllRead: () =>
        set((state) => ({
            notifications: state.notifications.map((n) =>
                n.read ? n : { ...n, read: true },
            ),
        })),
}));
