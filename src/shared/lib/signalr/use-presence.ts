import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/src/shared/lib/apiClient'
import { getSharedConnection } from '@/src/shared/lib/signalr/connection'
import {
  mapPresencePayload,
  type PresenceApiRow,
  type PresenceUser,
} from '@/src/shared/lib/signalr/presence-payload'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { usePresenceStore } from '@/src/shared/store/presence-store'

export interface EntityViewer {
  userId: string
  name: string
}

const HEARTBEAT_MS = 60_000

export function usePresenceSync(enabled = true) {
  const token = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    if (!token || !enabled) {
      usePresenceStore.getState().reset()
      return
    }

    const conn = getSharedConnection(token)

    const hydrateFromApi = () => {
      apiClient
        .get<PresenceApiRow[]>('/api/presence/online')
        .then((r) => {
          const entries = Array.isArray(r.data) ? r.data : []
          usePresenceStore
            .getState()
            .hydrate(entries.map(mapPresencePayload))
        })
        .catch(() => {})
    }

    let heartbeatInFlight = false
    const heartbeat = () => {
      if (heartbeatInFlight) return
      heartbeatInFlight = true
      apiClient
        .post('/api/presence/heartbeat')
        .catch(() => {})
        .finally(() => {
          heartbeatInFlight = false
        })
    }

    heartbeat()
    hydrateFromApi()
    const heartbeatTimer = window.setInterval(heartbeat, HEARTBEAT_MS)
    const hydrateTimer = window.setInterval(hydrateFromApi, HEARTBEAT_MS)

    const onSnapshot = (list: PresenceApiRow[]) => {
      usePresenceStore
        .getState()
        .hydrate(list.map(mapPresencePayload))
    }

    const onChange = (change: {
      user: PresenceApiRow
      online: boolean
      connections: number
    }) => {
      usePresenceStore
        .getState()
        .applyChange(
          change.user.userId,
          mapPresencePayload(change.user),
          change.online,
          change.connections,
        )
    }

    conn.on('PresenceSnapshot', onSnapshot)
    conn.on('PresenceChanged', onChange)

    conn.onreconnected(() => {
      heartbeat()
      hydrateFromApi()
    })

    return () => {
      window.clearInterval(heartbeatTimer)
      window.clearInterval(hydrateTimer)
      conn.off('PresenceSnapshot', onSnapshot)
      conn.off('PresenceChanged', onChange)
    }
  }, [token, enabled])
}

export function useUserPresence(userId?: string | null) {
  return usePresenceStore((s) =>
    userId != null && userId !== '' ? s.online[userId] : undefined,
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
  const me = useAuthStore((s) => s.user?.userId)
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

export type { PresenceUser }
