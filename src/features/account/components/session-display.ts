import type { Session } from '../api/account'
import { formatRelativeTime } from '@/src/shared/lib/format'

export function sessionTitle(
  session: Pick<Session, 'deviceInfo' | 'ipAddress'>,
): string {
  const device = session.deviceInfo?.trim()
  if (device && device !== 'Unknown Device') return device
  if (session.ipAddress) return `Unknown Device (${session.ipAddress})`
  return 'Unknown Device'
}

export function formatExpiry(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return formatRelativeTime(iso)
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `in ${Math.max(mins, 1)} minute${Math.max(mins, 1) === 1 ? '' : 's'}`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `in ${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.floor(hours / 24)
  if (days < 30) return `in ${days} day${days === 1 ? '' : 's'}`
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
