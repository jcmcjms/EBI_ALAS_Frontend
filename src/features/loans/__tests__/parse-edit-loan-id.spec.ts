import { describe, expect, it } from 'vitest'
import { parseEditLoanId } from '../pages/create/parse-edit-loan-id'

describe('parseEditLoanId', () => {
  it('accepts a GUID loan id from the push-back edit link', () => {
    const guid = 'f5700542-6abf-4a8a-98d4-fdc7f73d696a'
    expect(parseEditLoanId(guid)).toBe(guid)
  })

  it('accepts a numeric id when present', () => {
    expect(parseEditLoanId('42')).toBe('42')
  })

  it('returns null for missing or invalid ids', () => {
    expect(parseEditLoanId(undefined)).toBeNull()
    expect(parseEditLoanId('')).toBeNull()
    expect(parseEditLoanId('NaN')).toBeNull()
    expect(parseEditLoanId('undefined')).toBeNull()
    expect(parseEditLoanId('null')).toBeNull()
  })
})
