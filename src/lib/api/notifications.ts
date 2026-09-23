import { apiClient } from "../apiClient";
import { unwrapApiData, type ApiResponse } from "./types";

/**
 * Wire format for GET /api/notifications. Mirrors
 * `EBI.ALAS.Api.Features.Notifications.NotificationResponse` on the
 * backend (camelCased by System.Text.Json).
 */
export interface NotificationResponse {
    id: number;
    title: string;
    description: string;
    link?: string;
    isRead: boolean;
    /** ISO timestamp */
    createdAt: string;
    /** Notification type bucket (application, action, message, system). */
    type: string;
    /** ISO timestamp when marked read; null if unread. */
    readAt?: string | null;
}

/** Query parameters for the server-driven inbox endpoint. */
export interface InboxQuery {
    page?: number;
    pageSize?: number;
    status?: "all" | "unread" | "read";
    type?: string;
    search?: string;
}

/** Paged inbox envelope from the backend. */
export interface InboxPage {
    items: NotificationResponse[];
    totalCount: number;
    unreadCount: number;
}

/**
 * GET /api/notifications — server-driven paged inbox.
 * Supports status/type/search filtering and pagination.
 */
export async function getNotificationInbox(params: InboxQuery = {}): Promise<InboxPage> {
    const { data } = await apiClient.get<ApiResponse<InboxPage>>("/api/notifications", { params });
    return unwrapApiData(data);
}

/**
 * GET /api/notifications/recent — backward-compatible endpoint for the
 * header bell. Returns most recent 20 notifications.
 *
 * Returns an empty array when the backend reports failure so the bell
 * degrades gracefully instead of crashing the header.
 */
export async function getNotifications(): Promise<NotificationResponse[]> {
    const { data: envelope } = await apiClient.get<ApiResponse<NotificationResponse[]>>("/api/notifications/recent");
    if (!envelope.success) {
        return [];
    }
    return envelope.data ?? [];
}

/**
 * PUT /api/notifications/{id}/read — mark a single notification as read.
 * Idempotent — re-reading keeps the original ReadAt.
 */
export async function markNotificationRead(id: number): Promise<void> {
    await apiClient.put<ApiResponse<unknown>>(`/api/notifications/${id}/read`);
}

/**
 * PUT /api/notifications/read-all — mark all unread notifications as read.
 * Returns the number of rows changed.
 */
export async function markAllNotificationsRead(): Promise<number> {
    const { data } = await apiClient.put<ApiResponse<{ changedCount: number }>>("/api/notifications/read-all");
    return unwrapApiData(data).changedCount;
}
