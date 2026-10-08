import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/src/shared/lib/apiClient'
import { unwrapApiData, type ApiResponse } from '@/src/shared/lib/api/types'
import { getSharedConnection } from '@/src/shared/lib/signalr/connection'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { usePresenceStore } from '@/src/shared/store/presence-store'

export interface EntityViewer {
  userId: number
  name: string
}

export function usePresenceSync() {
  const token = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    if (!token) {
      usePresenceStore.getState().reset()
      return
    }

    const conn = getSharedConnection(token)

    const hydrateFromApi = () => {
      apiClient
        .get<ApiResponse<PresenceEntry[]>>('/api/presence/online')
        .then((r) => {
          const entries = unwrapApiData(r.data)
          usePresenceStore.getState().hydrate(
            entries.map((e) => ({
              ...e.user,
              connections: e.connections,
            })),
          )
        })
        .catch(() => {})
    }

    hydrateFromApi()

    const onSnapshot = (list: PresenceEntry[]) => {
      usePresenceStore
        .getState()
        .hydrate(list.map((e) => ({ ...e.user, connections: e.connections })))
    }

    const onChange = (change: PresenceChangePayload) => {
      usePresenceStore
        .getState()
        .applyChange(
          change.user.userId,
          change.user,
          change.online,
          change.connections,
        )
    }

    conn.on('PresenceSnapshot', onSnapshot)
    conn.on('PresenceChanged', onChange)

    conn.onreconnected(() => hydrateFromApi())

    return () => {
      conn.off('PresenceSnapshot', onSnapshot)
      conn.off('PresenceChanged', onChange)
    }
  }, [token])
}

export function useUserPresence(userId?: number | null) {
  return usePresenceStore((s) =>
    userId != null ? s.online[userId] : undefined,
  )
}

export function useOnlineUsers() {
  const online = usePresenceStore((s) => s.online)
  return useMemo(
    () => Object.values(online).sort((a, b) => a.name.localeCompare(b.name)),
    [online],
  )
}

export function useEntityViewers(entityType: string, entityId: number | null) {
  const me = useAuthStore((s) => Number(s.user?.userId))
  const [viewers, setViewers] = useState<EntityViewer[]>([])

  useEffect(() => {
    if (entityId == null) return

    const conn = getSharedConnection(useAuthStore.getState().accessToken!)
    const key = `${entityType}:${entityId}`

    const onChange = (e: {
      entityType: string
      entityId: number
      viewers: EntityViewer[]
    }) => {
      if (`${e.entityType}:${e.entityId}` === key) {
        setViewers(e.viewers)
      }
    }

    conn.on('EntityViewersChanged', onChange)
    conn.invoke('WatchEntity', entityType, entityId).catch(() => {})

    return () => {
      conn.off('EntityViewersChanged', onChange)
      conn.invoke('UnwatchEntity', entityType, entityId).catch(() => {})
    }
  }, [entityType, entityId])

  return viewers.filter((v) => v.userId !== me)
}

interface PresenceEntry {
  user: PresenceUserInfo
  connections: number
}

interface PresenceUserInfo {
  userId: number
  name: string
  role: string
  branchCode: string
  jobTitle?: string | null
}

interface PresenceChangePayload {
  user: PresenceUserInfo
  online: boolean
  connections: number
}
