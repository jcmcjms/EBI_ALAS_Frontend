import type { LoanStatus } from '@/src/features/loans/utils/loan-status'

export const ROLE_QUEUE_DEFAULTS: Record<string, LoanStatus[]> = {
  Recommender: ['ForRecommendation'],
  Evaluator: ['ForChecking'],
  Approver: ['ForApproval'],
}

export function queueDefaultForRole(
  role: string | undefined | null,
): LoanStatus[] {
  if (!role) return []
  return ROLE_QUEUE_DEFAULTS[role] ?? []
}

export const sameStatusSet = (a: LoanStatus[], b: LoanStatus[]) =>
  a.length === b.length && a.every((s) => b.includes(s))
