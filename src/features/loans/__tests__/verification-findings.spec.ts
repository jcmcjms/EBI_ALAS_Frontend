import { describe, expect, it } from 'vitest'

import { verificationSchema } from '@/src/features/loans/schemas/schema'
import {
  isRichTextEmpty,
  richTextToPlainText,
} from '@/src/shared/lib/rich-text'

describe('verification findings validation', () => {
  it('rejects empty string', () => {
    const result = verificationSchema.safeParse({ findings: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty paragraph (empty editor document)', () => {
    const result = verificationSchema.safeParse({ findings: '<p></p>' })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only paragraph', () => {
    const result = verificationSchema.safeParse({ findings: '<p>   </p>' })
    expect(result.success).toBe(false)
  })

  it('rejects empty list', () => {
    const result = verificationSchema.safeParse({
      findings: '<ul><li></li></ul>',
    })
    expect(result.success).toBe(false)
  })

  it('accepts formatted findings', () => {
    const result = verificationSchema.safeParse({
      findings:
        '<ol><li><strong>net pay</strong> verified in AUGUST 2026 payslip</li></ol>',
    })
    expect(result.success).toBe(true)
  })

  it('accepts plain paragraph findings', () => {
    const result = verificationSchema.safeParse({
      findings: '<p>Employment confirmed with HR department.</p>',
    })
    expect(result.success).toBe(true)
  })

  it('enforces character cap on text content (not markup)', () => {
    const result = verificationSchema.safeParse({
      findings: `<p>${'a'.repeat(2001)}</p>`,
    })
    expect(result.success).toBe(false)
  })

  it('allows exactly 2000 characters of text content', () => {
    const result = verificationSchema.safeParse({
      findings: `<p>${'a'.repeat(2000)}</p>`,
    })
    expect(result.success).toBe(true)
  })
})

describe('richTextToPlainText integration', () => {
  it('strips markup for length measurement', () => {
    expect(richTextToPlainText('<p>aaa</p><p>bbb</p>')).toBe('aaa\nbbb')
  })
})

describe('isRichTextEmpty integration', () => {
  it('detects empty documents across formats', () => {
    for (const empty of ['', '<p></p>', '<p>   </p>', '<ul><li></li></ul>']) {
      expect(isRichTextEmpty(empty)).toBe(true)
    }
  })
})
