import { useEffect, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { toastInfo } from '@/src/shared/ui/feedback/toast'

import { useAuthStore } from '@/src/shared/store/auth-store'
import {
  useNotificationStore,
  classifyNotification,
  type AppNotification,
} from '@/src/shared/store/notification-store'
import { useSignalRConnectionStore } from '@/src/shared/store/signalr-connection-store'
import { queryClient } from '@/src/shared/lib/queryClient'
import {
  getSharedConnection,
  getStartingPromise,
  setStartingPromise,
} from '@/src/shared/lib/signalr/connection'

function playChime() {
  try {
    const ctx = new AudioContext()

    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.value = 880
    gain1.gain.setValueAtTime(0.3, ctx.currentTime)
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.15)

    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.value = 660
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.12)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(ctx.currentTime + 0.12)
    osc2.stop(ctx.currentTime + 0.35)

    setTimeout(() => ctx.close(), 400)
  } catch {}
}

export function useSignalR() {
  const token = useAuthStore((state) => state.accessToken)
  const addNotification = useNotificationStore((state) => state.addNotification)
  const isConnected = useSignalRConnectionStore((s) => s.isConnected)
  const setConnected = useSignalRConnectionStore((s) => s.setConnected)
  const [connection, setConnection] = useState<signalR.HubConnection | null>(
    null,
  )

  useEffect(() => {
    if (!token) {
      setConnection(null)
      setConnected(false)
      return
    }

    let disposed = false
    const conn = getSharedConnection(token)

    conn.onclose(() => {
      if (!disposed) setConnected(false)
    })
    conn.onreconnecting(() => {
      if (!disposed) setConnected(false)
    })
    conn.onreconnected(() => {
      if (!disposed) setConnected(true)
    })

    conn.on(
      'ReceiveNotification',
      (payload: {
        id?: string
        title: string
        description: string
        link?: string
        timestamp: string
      }) => {
        const appNotification: AppNotification = {
          id:
            payload.id ??
            `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: classifyNotification(payload.title),
          title: payload.title,
          description: payload.description,
          createdAt: payload.timestamp,
          read: false,
          link: payload.link ?? undefined,
        }

        addNotification(appNotification)

        
        void queryClient.invalidateQueries({ queryKey: ['notifications'] })

        toastInfo(payload.title, {
          description: payload.description,
        })

        playChime()

        if (document.hidden) {
          const originalTitle = document.title
          document.title = `\u{1F514} ${payload.title}`

          const interval = setInterval(() => {
            document.title =
              document.title === originalTitle
                ? `\u{1F514} ${payload.title}`
                : originalTitle
          }, 1000)

          const handleFocus = () => {
            clearInterval(interval)
            document.title = originalTitle
            window.removeEventListener('focus', handleFocus)
          }

          window.addEventListener('focus', handleFocus)
        }
      },
    )

    if (conn.state === signalR.HubConnectionState.Disconnected) {
      const existingStart = getStartingPromise()
      if (existingStart) {
        existingStart
          .then(() => {
            if (!disposed) {
              setConnected(true)
              setConnection(conn)
            }
          })
          .catch(() => {})
      } else {
        const startPromise = conn
          .start()
          .then(() => {
            if (disposed) return
            setConnected(true)
            setConnection(conn)
          })
          .catch(() => {})
          .finally(() => {
            setStartingPromise(null)
          })
        setStartingPromise(startPromise)
      }
    } else if (conn.state === signalR.HubConnectionState.Connected) {
      setConnected(true)
      setConnection(conn)
    }

    return () => {
      disposed = true
      setConnected(false)
    }
  }, [token, addNotification, setConnected])

  return { connection, isConnected }
}
