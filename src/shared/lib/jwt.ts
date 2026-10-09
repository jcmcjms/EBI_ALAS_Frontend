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

function splitFullName(fullName: string): {
  firstName: string
  middleName: string
  lastName: string
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', middleName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' }
  if (parts.length === 2) {
    return { firstName: parts[0], middleName: '', lastName: parts[1] }
  }
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
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

  const fullName = claimString(payload, 'fullName', 'FullName')
  const name = fullName
    ? splitFullName(fullName)
    : {
        firstName: claimString(payload, 'firstName', 'FirstName'),
        middleName: claimString(payload, 'middleName', 'MiddleName'),
        lastName: claimString(payload, 'lastName', 'LastName'),
      }

  return {
    userId: claimString(payload, 'userId', 'sub', 'nameid'),
    firstName: name.firstName,
    middleName: name.middleName,
    lastName: name.lastName,
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
