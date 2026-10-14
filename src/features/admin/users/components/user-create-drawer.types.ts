export interface UserCreatePayload {
  username: string
  password: string
  firstName: string
  middleName: string
  lastName: string
  email: string
  branchId: string
  role: string
  jobTitle: string
}

export const emptyForm = {
  username: '',
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  branchId: '',
  role: '',
  jobTitle: '',
}

export const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function generateTempPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'
  const specials = '!?*.'
  const all = upper + lower + digits + specials

  const pick = (set: string) => {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return set[buf[0] % set.length]
  }

  const chars = [pick(upper), pick(lower), pick(digits), pick(specials)]
  while (chars.length < length) chars.push(pick(all))

  for (let i = chars.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    const j = buf[0] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
