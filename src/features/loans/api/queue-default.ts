import type { LoanStatus } from '@/src/features/loans/model/loan-status'
import { LOAN_STATUS_META } from '@/src/features/loans/model/loan-status'


export function parseQueueDefault(body: unknown): LoanStatus[] {
  if (!Array.isArray(body)) return []
  return body.filter((s): s is LoanStatus =>
    typeof s === 'string' && s in LOAN_STATUS_META,
  )
}
