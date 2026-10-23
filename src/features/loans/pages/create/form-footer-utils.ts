import type { FieldErrors } from 'react-hook-form'
import type { SectionId } from '@/src/features/loans/constants/sections'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'

export function formFooterMode(
  activeSection: SectionId,
  visibleSectionIds: SectionId[],
): { isFirst: boolean; isLast: boolean; primary: 'continue' | 'submit' } {
  const index = visibleSectionIds.indexOf(activeSection)
  const isFirst = index <= 0
  const isLast = index >= 0 && index === visibleSectionIds.length - 1
  return { isFirst, isLast, primary: isLast ? 'submit' : 'continue' }
}

function pushLeafMessages(node: unknown, out: string[]): void {
  if (!node || typeof node !== 'object') return
  const record = node as Record<string, unknown>
  if (typeof record.message === 'string' && record.message.length > 0) {
    out.push(record.message)
    return
  }
  for (const child of Object.values(record)) {
    pushLeafMessages(child, out)
  }
}

export function collectErrorMessages(
  errors: FieldErrors<LoanApplicationFormData>,
): string[] {
  const out: string[] = []
  pushLeafMessages(errors, out)
  return out
}

export function formatErrorSummary(messages: string[]): string {
  if (messages.length === 0) return ''
  const shown = messages.slice(0, 3)
  const rest = messages.length - shown.length
  return rest > 0
    ? `${shown.join('; ')}; and ${rest} more`
    : shown.join('; ')
}
