import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/src/lib/apiClient";
import { unwrapApiData, type ApiResponse } from "@/src/lib/api/types";
import { getSharedConnection } from "@/src/lib/signalr/connection";
import { useAuthStore } from "@/src/store/authStore";
import { usePresenceStore } from "@/src/store/presenceStore";

/**
 * Entity viewer — a user currently watching a specific record.
 */
export interface EntityViewer {
    userId: number;
    name: string;
}

/**
 * Mount once (in AppShell): hydrate + live deltas + reconnect resync + logout reset.
 *
 * This is the single source of truth for presence state. It:
 * 1. Fetches the full online directory via REST on mount.
 * 2. Listens for `PresenceSnapshot` (on connect) and `PresenceChanged` (deltas).
 * 3. Re-hydrates on reconnect to heal any missed deltas.
 * 4. Resets the store on logout.
 */
export function usePresenceSync() {
    const token = useAuthStore((s) => s.accessToken);

    useEffect(() => {
        if (!token) {
            usePresenceStore.getState().reset();
            return;
        }

        const conn = getSharedConnection(token);

        const hydrateFromApi = () => {
            apiClient
                .get<ApiResponse<PresenceEntry[]>>("/api/presence/online")
                .then((r) => {
                    const entries = unwrapApiData(r.data);
                    usePresenceStore
                        .getState()
                        .hydrate(
                            entries.map((e) => ({
                                ...e.user,
                                connections: e.connections,
                            })),
                        );
                })
                .catch(() => {
                    // REST hydration failed — the hub snapshot will catch up.
                });
        };

        // Initial hydration via REST (faster than waiting for hub connect).
        hydrateFromApi();

        // Hub events.
        const onSnapshot = (list: PresenceEntry[]) => {
            usePresenceStore
                .getState()
                .hydrate(
                    list.map((e) => ({ ...e.user, connections: e.connections })),
                );
        };

        const onChange = (change: PresenceChangePayload) => {
            usePresenceStore
                .getState()
                .applyChange(
                    change.user.userId,
                    change.user,
                    change.online,
                    change.connections,
                );
        };

        conn.on("PresenceSnapshot", onSnapshot);
        conn.on("PresenceChanged", onChange);

        // Re-hydrate on reconnect to heal any missed deltas.
        conn.onreconnected(() => hydrateFromApi());

        return () => {
            conn.off("PresenceSnapshot", onSnapshot);
            conn.off("PresenceChanged", onChange);
        };
    }, [token]);
}

/**
 * Returns the presence entry for a single user, or undefined if offline.
 */
export function useUserPresence(userId?: number | null) {
    return usePresenceStore((s) =>
        userId != null ? s.online[userId] : undefined,
    );
}

/**
 * Returns all online users sorted by name.
 *
 * Uses `useMemo` to stabilize the sorted array reference — without it,
 * `Object.values().sort()` creates a new array every render, which
 * `useSyncExternalStore` treats as a change and triggers an infinite loop.
 */
export function useOnlineUsers() {
    const online = usePresenceStore((s) => s.online);
    return useMemo(
        () => Object.values(online).sort((a, b) => a.name.localeCompare(b.name)),
        [online],
    );
}

/**
 * "Who is looking at this record right now" — any entity, any page.
 *
 * Mounts a watch/unwatch lifecycle around the entity and returns
 * the current viewer list (excluding the current user).
 */
export function useEntityViewers(
    entityType: string,
    entityId: number | null,
) {
    const me = useAuthStore((s) => Number(s.user?.userId));
    const [viewers, setViewers] = useState<EntityViewer[]>([]);

    useEffect(() => {
        if (entityId == null) return;

        const conn = getSharedConnection(
            useAuthStore.getState().accessToken!,
        );
        const key = `${entityType}:${entityId}`;

        const onChange = (e: {
            entityType: string;
            entityId: number;
            viewers: EntityViewer[];
        }) => {
            if (`${e.entityType}:${e.entityId}` === key) {
                setViewers(e.viewers);
            }
        };

        conn.on("EntityViewersChanged", onChange);
        conn.invoke("WatchEntity", entityType, entityId).catch(() => {});

        return () => {
            conn.off("EntityViewersChanged", onChange);
            conn
                .invoke("UnwatchEntity", entityType, entityId)
                .catch(() => {});
        };
    }, [entityType, entityId]);

    // Filter out the current user from the viewer list.
    return viewers.filter((v) => v.userId !== me);
}

// ── Internal types matching the backend payload shapes ─────────────────────

interface PresenceEntry {
    user: PresenceUserInfo;
    connections: number;
}

interface PresenceUserInfo {
    userId: number;
    name: string;
    role: string;
    branchCode: string;
    jobTitle?: string | null;
}

interface PresenceChangePayload {
    user: PresenceUserInfo;
    online: boolean;
    connections: number;
}
