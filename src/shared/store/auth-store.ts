import { create } from 'zustand/react'
import { dropSharedConnection } from '@/src/shared/lib/signalr/connection'

interface UserSession {
  userId: string
  firstName: string
  middleName: string
  lastName: string
  branchId: string
  role: string
  jobTitle: string | null
  permissions: string[]
  mustChangePassword: boolean
}

interface AuthState {
  accessToken: string | null
  user: UserSession | null

  isInitializing: boolean
  setAccessToken: (token: string) => void
  setSession: (token: string, user: UserSession) => void
  clearSession: () => void
  setInitializing: (value: boolean) => void
  hasPermission: (permission: string | string[]) => boolean

  hasAnyPermission: (permissions: string[]) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  isInitializing: true,

  setAccessToken: (token) => set({ accessToken: token }),

  setSession: (token, user) => set({ accessToken: token, user }),

  clearSession: () => {
    dropSharedConnection()
    set({ accessToken: null, user: null })
  },

  setInitializing: (value) => set({ isInitializing: value }),

  hasPermission: (required) => {
    const { user } = get()
    if (!user) return false

    if (user.permissions.includes('*')) return true

    const requiredArray = Array.isArray(required) ? required : [required]
    return requiredArray.every((p) => user.permissions.includes(p))
  },

  hasAnyPermission: (required) => {
    const { user } = get()
    if (!user) return false

    if (user.permissions.includes('*')) return true

    return required.some((p) => user.permissions.includes(p))
  },
}))