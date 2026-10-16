import type { Session } from '../api/account'

export function sessionTitle(
  session: Pick<Session, 'deviceInfo' | 'ipAddress'>,
): string {
  const device = session.deviceInfo?.trim()
  if (device && device !== 'Unknown Device') return device
  if (session.ipAddress) return `Unknown Device (${session.ipAddress})`
  return 'Unknown Device'
}
