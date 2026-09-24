/**
 * Notification types and domain helpers.
 */

import type { NotificationResponse } from "./api/notifications";

// ─── Types ──────────────────────────────────────────────────────────────────

export type NotificationType = "application" | "action" | "message" | "system";

export interface AppNotification {
    id: string;
    type: NotificationType;
    title: string;
    description: string;
    createdAt: string;
    read: boolean;
    actor?: string;
    link?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function formatRelativeTime(iso: string): string {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
    return new Date(iso).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export function initialsOf(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]!.toUpperCase())
        .join("");
}

export function classifyNotification(title: string): NotificationType {
    const t = title.toLowerCase();
    if (
        t.includes("ready for") ||
        t.includes("recommendation") ||
        t.includes("approval")
    )
        return "action";
    if (
        t.includes("submitted") ||
        t.includes("application") ||
        t.includes("returned")
    )
        return "application";
    if (t.includes("status update")) return "message";
    return "system";
}

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

export function mapApiNotifications(
    rows: NotificationResponse[],
): AppNotification[] {
    return rows.map(mapApiNotification);
}
