import { useEffect, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { toastInfo } from '@/src/shared/ui/feedback/toast'

import { useAuthStore } from '@/src/shared/store/auth-store'
import {
  useNotificationStore,
  classifyNotification,
  type AppNotification,
} from '@/src/shared/store/notification-store'
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
  const [isConnected, setIsConnected] = useState(false)
  const [connection, setConnection] = useState<signalR.HubConnection | null>(
    null,
  )

  useEffect(() => {
    if (!token) {
      setConnection(null)
      setIsConnected(false)
      return
    }

    let disposed = false
    const conn = getSharedConnection(token)

    conn.onclose(() => {
      if (!disposed) setIsConnected(false)
    })
    conn.onreconnecting(() => {
      if (!disposed) setIsConnected(false)
    })
    conn.onreconnected(() => {
      if (!disposed) setIsConnected(true)
    })

    conn.on(
      'ReceiveNotification',
      (payload: {
        title: string
        description: string
        link?: string
        timestamp: string
      }) => {
        const appNotification: AppNotification = {
          id: `live-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: classifyNotification(payload.title),
          title: payload.title,
          description: payload.description,
          createdAt: payload.timestamp,
          read: false,
          link: payload.link ?? undefined,
        }

        addNotification(appNotification)

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
              setIsConnected(true)
              setConnection(conn)
            }
          })
          .catch(() => {})
      } else {
        const startPromise = conn
          .start()
          .then(() => {
            if (disposed) return
            setIsConnected(true)
            setConnection(conn)
          })
          .catch(() => {})
          .finally(() => {
            setStartingPromise(null)
          })
        setStartingPromise(startPromise)
      }
    } else if (conn.state === signalR.HubConnectionState.Connected) {
      setIsConnected(true)
      setConnection(conn)
    }

    return () => {
      disposed = true
      setIsConnected(false)
    }
  }, [token, addNotification])

  return { connection, isConnected }
}
