/**
 * Notifications API — types and fetchers co-located.
 */

import { apiClient } from "@/src/lib/apiClient";
import { unwrapApiData, type ApiResponse } from "@/src/lib/api/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NotificationResponse {
    id: number;
    title: string;
    description: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
    type: string;
    readAt?: string | null;
}

export interface InboxQuery {
    page?: number;
    pageSize?: number;
    status?: "all" | "unread" | "read";
    type?: string;
    search?: string;
}

export interface InboxPage {
    items: NotificationResponse[];
    totalCount: number;
    unreadCount: number;
}

// ─── API Functions ──────────────────────────────────────────────────────────

export async function getNotificationInbox(
    params: InboxQuery = {},
): Promise<InboxPage> {
    const { data } = await apiClient.get<ApiResponse<InboxPage>>(
        "/api/notifications",
        { params },
    );
    return unwrapApiData(data);
}

export async function getNotifications(): Promise<NotificationResponse[]> {
    const { data: envelope } = await apiClient.get<
        ApiResponse<NotificationResponse[]>
    >("/api/notifications/recent");
    if (!envelope.success) return [];
    return envelope.data ?? [];
}

export async function markNotificationRead(id: number): Promise<void> {
    await apiClient.put<ApiResponse<unknown>>(
        `/api/notifications/${id}/read`,
    );
}

export async function markAllNotificationsRead(): Promise<number> {
    const { data } = await apiClient.put<
        ApiResponse<{ changedCount: number }>
    >("/api/notifications/read-all");
    return unwrapApiData(data).changedCount;
}
