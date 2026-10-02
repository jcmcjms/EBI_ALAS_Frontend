import { BRANCHES } from '@/src/shared/lib/api/types'

export interface UserCreatePayload {
  username: string
  password: string
  firstName: string
  middleName: string
  lastName: string
  branchId: string
  role: string
  jobTitle: string
  eSignature: string | null
  coveredBranches: string[] | null
}

export const emptyForm = {
  username: '',
  firstName: '',
  middleName: '',
  lastName: '',
  jobTitle: '',
  branchId: '',
  role: '',
  eSignature: null as string | null,
  coveredBranches: [] as string[],
}

export const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/

export const BRANCH_SELECT_ITEMS = BRANCHES.map((branch) => ({
  value: branch.code,
  label: branch.name,
}))

export function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

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