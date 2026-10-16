import { describe, expect, it } from 'vitest'
import { formFooterMode } from '../pages/create/form-footer-utils'

describe('formFooterMode', () => {
  it('is continue on intermediate sections', () => {
    expect(
      formFooterMode('loan-params', [
        'cis-lookup',
        'loan-params',
        'approval-form',
      ]),
    ).toEqual({
      isFirst: false,
      isLast: false,
      primary: 'continue',
    })
  })

  it('is submit on last section and hides back on first', () => {
    expect(
      formFooterMode('approval-form', ['cis-lookup', 'approval-form']),
    ).toEqual({
      isFirst: false,
      isLast: true,
      primary: 'submit',
    })
    expect(
      formFooterMode('cis-lookup', ['cis-lookup', 'approval-form']).isFirst,
    ).toBe(true)
  })
})
