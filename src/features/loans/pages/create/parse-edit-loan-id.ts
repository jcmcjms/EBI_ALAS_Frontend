const INVALID_IDS = new Set(['', 'NaN', 'undefined', 'null', '0'])

/**
 * Live loan ids are GUIDs. The create page used to coerce `?loanId=` with
 * Number(), which turned every GUID into NaN and skipped edit mode.
 */
export function parseEditLoanId(raw: string | number | undefined | null): string | null {
  if (raw == null) return null
  const id = String(raw).trim()
  if (INVALID_IDS.has(id)) return null
  return id
}
