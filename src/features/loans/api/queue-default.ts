import type { LoanStatus } from '@/src/features/loans/model/loan-status'
import { LOAN_STATUS_META } from '@/src/features/loans/model/loan-status'

/** Raw body from GET /api/loans/queue-default (string[], no envelope). */
export function parseQueueDefault(body: unknown): LoanStatus[] {
  if (!Array.isArray(body)) return []
  return body.filter((s): s is LoanStatus =>
    typeof s === 'string' && s in LOAN_STATUS_META,
  )
}
