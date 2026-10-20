const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export type NthpDateValidation = { ok: true } | { ok: false; message: string }

function parseIsoDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatMonthDay(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`
}

export function getNthpWindowStart(today: Date): Date {
  const y = today.getFullYear()
  const m = today.getMonth()
  const day = today.getDate()
  if (day <= 15) {
    return new Date(y, m - 2, 16)
  }
  return new Date(y, m - 1, 1)
}

export function validateNthpDate(
  value: string | undefined | null,
  today: Date,
): NthpDateValidation {
  const raw = value?.trim() ?? ''
  if (raw.length === 0) {
    return { ok: false, message: 'Add the payslip date before continuing.' }
  }

  const nthp = parseIsoDateOnly(raw)
  if (nthp === null) {
    return { ok: false, message: 'Enter the payslip date as YYYY-MM-DD.' }
  }

  const applicationDate = startOfDay(today)
  if (nthp.getTime() > applicationDate.getTime()) {
    return { ok: false, message: "The payslip date can't be in the future." }
  }

  const windowStart = getNthpWindowStart(applicationDate)
  if (nthp.getTime() < windowStart.getTime()) {
    return {
      ok: false,
      message: `Use a payslip from ${formatMonthDay(windowStart)} or later.`,
    }
  }

  return { ok: true }
}
