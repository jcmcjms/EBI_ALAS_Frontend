import { create } from 'zustand/react'
import type { PresenceUser } from '@/src/shared/lib/signalr/presence-payload'

interface PresenceState {
  online: Record<string, PresenceUser>

  hydrated: boolean

  hydrate: (list: PresenceUser[]) => void

  applyChange: (
    userId: string,
    user: Partial<PresenceUser> & { userId: string },
    online: boolean,
    connections: number,
  ) => void

  reset: () => void
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
      const next = { ...s.online }
      if (online) {
        next[userId] = {
          ...(next[userId] ?? {
            userId,
            name: '',
            role: '',
            branchCode: '',
          }),
          ...user,
          connections,
        }
      } else {
        delete next[userId]
      }
      return { online: next }
    }),

  reset: () => set({ online: {}, hydrated: false }),
}))
