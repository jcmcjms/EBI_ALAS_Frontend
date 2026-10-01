import { create } from "zustand/react";


export interface PresenceUser {
    userId: number;
    name: string;
    role: string;
    branchCode: string;
    jobTitle?: string | null;
    connections: number;
}

interface PresenceState {
    
    online: Record<number, PresenceUser>;
    
    hydrated: boolean;

    
    hydrate: (list: PresenceUser[]) => void;

    
    applyChange: (
        userId: number,
        user: Partial<PresenceUser> & { userId: number },
        online: boolean,
        connections: number,
    ) => void;

    
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
