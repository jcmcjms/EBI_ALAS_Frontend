import { describe, expect, it } from 'vitest'
import type { FieldErrors } from 'react-hook-form'
import {
  collectErrorMessages,
  formatErrorSummary,
} from './form-footer-utils'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'

describe('collectErrorMessages', () => {
  it('returns leaf zod messages in stable order', () => {
    const errors = {
      client: {
        firstName: { message: 'First name is required', type: 'min' },
        lastName: { message: 'Last name is required', type: 'min' },
      },
    } as unknown as FieldErrors<LoanApplicationFormData>

    expect(collectErrorMessages(errors)).toEqual([
      'First name is required',
      'Last name is required',
    ])
  })
})

describe('formatErrorSummary', () => {
  it('lists up to three messages', () => {
    expect(
      formatErrorSummary([
        'First name is required',
        'Last name is required',
        'Agency is required',
      ]),
    ).toBe('First name is required; Last name is required; Agency is required')
  })

  it('truncates after three with a count', () => {
    expect(
      formatErrorSummary([
        'A',
        'B',
        'C',
        'D',
        'E',
      ]),
    ).toBe('A; B; C; and 2 more')
  })

  it('handles empty list', () => {
    expect(formatErrorSummary([])).toBe('')
  })
})
