import { describe, expect, it } from 'vitest'
import { getNthpWindowStart, validateNthpDate } from '../nthp-date-window'

describe('getNthpWindowStart', () => {
  it('first half of month starts on the 16th two months earlier', () => {
    expect(getNthpWindowStart(new Date(2026, 9, 5))).toEqual(new Date(2026, 7, 16))
  })

  it('second half of month starts on the 1st of last month', () => {
    expect(getNthpWindowStart(new Date(2026, 9, 20))).toEqual(new Date(2026, 8, 1))
  })

  it('uses the 16th boundary on day 15 and 16', () => {
    expect(getNthpWindowStart(new Date(2026, 9, 15))).toEqual(new Date(2026, 7, 16))
    expect(getNthpWindowStart(new Date(2026, 9, 16))).toEqual(new Date(2026, 8, 1))
  })
})

describe('validateNthpDate', () => {
  const firstHalf = new Date(2026, 9, 5) // Oct 5 → from Aug 16
  const secondHalf = new Date(2026, 9, 20) // Oct 20 → from Sep 1

  it('rejects missing date', () => {
    expect(validateNthpDate(undefined, firstHalf)).toEqual({
      ok: false,
      message: 'Add the payslip date before continuing.',
    })
    expect(validateNthpDate('   ', firstHalf)).toEqual({
      ok: false,
      message: 'Add the payslip date before continuing.',
    })
  })

  it('rejects unparseable date', () => {
    expect(validateNthpDate('not-a-date', firstHalf)).toEqual({
      ok: false,
      message: 'Enter the payslip date as YYYY-MM-DD.',
    })
  })

  it('rejects future date', () => {
    expect(validateNthpDate('2026-10-06', firstHalf)).toEqual({
      ok: false,
      message: "The payslip date can't be in the future.",
    })
  })

  it('allows second half of August when applying in first half of October', () => {
    expect(validateNthpDate('2026-08-20', firstHalf)).toEqual({ ok: true })
    expect(validateNthpDate('2026-08-16', firstHalf)).toEqual({ ok: true })
    expect(validateNthpDate('2026-08-15', firstHalf)).toEqual({
      ok: false,
      message: 'Use a payslip from August 16 or later.',
    })
  })

  it('requires September when applying in second half of October', () => {
    expect(validateNthpDate('2026-09-01', secondHalf)).toEqual({ ok: true })
    expect(validateNthpDate('2026-08-20', secondHalf)).toEqual({
      ok: false,
      message: 'Use a payslip from September 1 or later.',
    })
  })

  it('allows today', () => {
    expect(validateNthpDate('2026-10-05', firstHalf)).toEqual({ ok: true })
    expect(validateNthpDate('2026-10-20', secondHalf)).toEqual({ ok: true })
  })
})
