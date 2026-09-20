import { apiClient } from "../apiClient";
import type { ApiResponse } from "./types";

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
}

/**
 * GET /api/notifications — most-recent 20 notifications for the
 * authenticated user. The SPA's header bell calls this on a 30s poll
 * via the `useNotifications` hook.
 *
 * Returns an empty array when the backend reports failure (e.g. the
 * notifications table is unavailable) so the bell degrades gracefully
 * instead of crashing the header. Throws on network/infra errors.
 */
export async function getNotifications(): Promise<NotificationResponse[]> {
    const { data: envelope } = await apiClient.get<ApiResponse<NotificationResponse[]>>("/api/notifications");
    if (!envelope.success) {
        // Graceful degradation: bell shows zero notifications rather than
        // crashing the header. The error is non-critical for the user's
        // primary workflow (loan origination/approval).
        return [];
    }
    return envelope.data ?? [];
}