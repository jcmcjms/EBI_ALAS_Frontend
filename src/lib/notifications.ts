// Domain types + mapper for notifications.

import type { NotificationResponse } from "@/src/lib/api/notifications";

export type NotificationType = "application" | "action" | "message" | "system";

export interface AppNotification {
    id: string;
    type: NotificationType;
    title: string;
    description: string;
    /** ISO timestamp */
    createdAt: string;
    read: boolean;
    /** Person-originated notifications render an avatar instead of a type icon. */
    actor?: string;
    /** Route to navigate to when the notification is opened. */
    link?: string;
}

export function formatRelativeTime(iso: string): string {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
    return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export function initialsOf(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]!.toUpperCase())
        .join("");
}

/**
 * Classify a backend notification title into the UI's `NotificationType`
 * bucket. Backend titles are free-form English ("Ready for Evaluation",
 * "Application Returned", "New Loan Application Submitted") — these
 * matches map them to the icon family the UI renders in the bell dropdown.
 *
 * Used as a fallback when the server doesn't provide a type (legacy rows
 * written before the Type column was added).
 */
export function classifyNotification(title: string): NotificationType {
    const t = title.toLowerCase();
    if (t.includes("ready for") || t.includes("recommendation") || t.includes("approval")) {
        return "action";
    }
    if (t.includes("submitted") || t.includes("application") || t.includes("returned")) {
        return "application";
    }
    if (t.includes("status update")) {
        return "message";
    }
    return "system";
}

/**
 * Map one wire-format notification row to the FE's `AppNotification`
 * shape (used by the Zustand store + bell UI).
 *
 * Prefers the server-provided type; falls back to title-based
 * classification for rows written before the Type column existed.
 */
export function mapApiNotification(n: NotificationResponse): AppNotification {
    return {
        id: String(n.id),
        type: (n.type as NotificationType) ?? classifyNotification(n.title),
        title: n.title,
        description: n.description,
        createdAt: n.createdAt,
        read: n.isRead,
        link: n.link ?? undefined,
    };
}

/**
 * Batch variant — used by the `useNotifications` hook to push the
 * whole poll result into the store in one update.
 */
export function mapApiNotifications(rows: NotificationResponse[]): AppNotification[] {
    return rows.map(mapApiNotification);
}
