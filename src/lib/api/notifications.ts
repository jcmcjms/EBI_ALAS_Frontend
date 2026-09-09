import { apiClient } from "../apiClient";

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
 * The endpoint returns `ApiResponse<List<NotificationResponse>>`; we
 * unwrap `.data` to give callers a clean array. The ApiResponse envelope
 * is unwrapped manually (not via `unwrapApiData` from `types.ts`) so this
 * file stays a leaf module — `types.ts` is a dependency of nearly every
 * other API file and we don't want a circular import later.
 */
export async function getNotifications(): Promise<NotificationResponse[]> {
    const response = await apiClient.get("/api/notifications");
    return response.data?.data ?? [];
}