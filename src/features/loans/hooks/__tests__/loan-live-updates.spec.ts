import { describe, expect, it } from 'vitest'
import { shouldInvalidateLoansOnNotification } from '../loan-live-updates'

describe('shouldInvalidateLoansOnNotification', () => {
  it('refreshes loans for returned/revision pushback notices', () => {
    expect(
      shouldInvalidateLoansOnNotification('Application returned for revision'),
    ).toBe(true)
    expect(
      shouldInvalidateLoansOnNotification('Your application was returned'),
    ).toBe(true)
  })

  it('refreshes loans for revision resubmit notices', () => {
    expect(
      shouldInvalidateLoansOnNotification(
        'Application resubmitted for recommendation',
      ),
    ).toBe(true)
    expect(
      shouldInvalidateLoansOnNotification(
        'Application resubmitted after corrections',
      ),
    ).toBe(true)
    expect(
      shouldInvalidateLoansOnNotification(
        'Application resubmitted for evaluation',
      ),
    ).toBe(true)
  })

  it('refreshes loans for document remark notices', () => {
    expect(shouldInvalidateLoansOnNotification('New document remark')).toBe(
      true,
    )
    expect(
      shouldInvalidateLoansOnNotification(
        'Loan LAM-1 · PAYSIP: Please clarify',
      ),
    ).toBe(false)
  })

  it('does not refresh loans for unrelated notices', () => {
    expect(shouldInvalidateLoansOnNotification('Password reset sent')).toBe(
      false,
    )
    expect(shouldInvalidateLoansOnNotification('Welcome')).toBe(false)
  })
})
