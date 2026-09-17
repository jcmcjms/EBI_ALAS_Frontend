import { create } from "zustand/react";

/**
 * Presence user info — mirrors the backend's PresenceUserInfo + Connections.
 */
export interface PresenceUser {
    userId: number;
    name: string;
    role: string;
    branchCode: string;
    jobTitle?: string | null;
    connections: number;
}

interface PresenceState {
    /** userId → PresenceUser map for O(1) lookups. */
    online: Record<number, PresenceUser>;
    /** True after the first PresenceSnapshot or REST hydration. */
    hydrated: boolean;

    /** Bulk-hydrate from a snapshot (on connect or REST fetch). */
    hydrate: (list: PresenceUser[]) => void;

    /** Apply a single PresenceChanged delta from the hub. */
    applyChange: (
        userId: number,
        user: Partial<PresenceUser> & { userId: number },
        online: boolean,
        connections: number,
    ) => void;

    /** Tear down on logout. */
    reset: () => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
    online: {},
    hydrated: false,

    hydrate: (list) =>
        set({
            online: Object.fromEntries(list.map((u) => [u.userId, u])),
            hydrated: true,
        }),

    applyChange: (userId, user, online, connections) =>
        set((s) => {
            const next = { ...s.online };
            if (online) {
                next[userId] = {
                    ...(next[userId] ?? {
                        userId,
                        name: "",
                        role: "",
                        branchCode: "",
                    }),
                    ...user,
                    connections,
                };
            } else {
                delete next[userId];
            }
            return { online: next };
        }),

    reset: () => set({ online: {}, hydrated: false }),
}));
