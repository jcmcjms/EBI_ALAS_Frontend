import { describe, expect, it } from 'vitest'
import { buildUnifiedAuditTrail } from '../approval-form-document-utils'
import type { DocumentRemarkDto } from '@/src/features/loans/api/loan-review'

const remark: DocumentRemarkDto = {
  id: 'r1',
  loanApplicationId: 'l1',
  checklistIdCode: 'A2020',
  docId: null,
  parentRemarkId: null,
  authorId: 'u1',
  authorName: 'Ana',
  authorRole: 'Evaluator',
  body: 'Please re-upload',
  createdAt: '2026-10-09T01:00:00Z',
}

describe('buildUnifiedAuditTrail document remarks', () => {
  it('shows document description instead of code when labels are provided', () => {
    const entries = buildUnifiedAuditTrail(undefined, undefined, [remark], {
      A2020: 'CIBI Report',
    })

    expect(entries[0].context).toBe('CIBI Report')
  })

  it('falls back to the code when no label is known', () => {
    const entries = buildUnifiedAuditTrail(undefined, undefined, [remark])

    expect(entries[0].context).toBe('A2020')
  })
})
