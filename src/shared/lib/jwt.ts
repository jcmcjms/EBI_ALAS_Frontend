export interface JwtUserSession {
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

export function decodeJwtPayload(
  token: string,
): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

function claimString(payload: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return ''
}

export interface ExtractUserOptions {
  mustChangePassword?: boolean
}

export function extractUserFromToken(
  token: string,
  options?: ExtractUserOptions,
): JwtUserSession | null {
  const payload = decodeJwtPayload(token)
  if (!payload) return null

  const permissions: string[] = []
  for (const [key, value] of Object.entries(payload)) {
    if (key === 'permission') {
      if (typeof value === 'string') {
        permissions.push(value)
      } else if (Array.isArray(value)) {
        permissions.push(
          ...value.filter((v): v is string => typeof v === 'string'),
        )
      }
    }
  }

  const jwtMustChange =
    payload.mustChangePassword === true ||
    String(payload.mustChangePassword) === 'true'

  return {
    userId: claimString(payload, 'userId', 'sub', 'nameid'),
    firstName: claimString(payload, 'firstName', 'FirstName'),
    middleName: claimString(payload, 'middleName', 'MiddleName'),
    lastName: claimString(payload, 'lastName', 'LastName'),
    branchId: claimString(payload, 'branchId', 'branch'),
    role: claimString(payload, 'role'),
    jobTitle:
      (payload.jobTitle ?? payload.JobTitle) != null
        ? String(payload.jobTitle ?? payload.JobTitle)
        : null,
    permissions,
    mustChangePassword: options?.mustChangePassword ?? jwtMustChange,
  }
}
