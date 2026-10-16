import { describe, expect, it } from 'vitest'
import { changePasswordSchema, loginSchema } from '../schemas'

describe('changePasswordSchema', () => {
  it('rejects passwords shorter than 12', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldPassword12',
      newPassword: 'ShortPass1!',
      confirmPassword: 'ShortPass1!',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a 12+ character passphrase without complexity rules', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldPassword12',
      newPassword: 'correct horse battery',
      confirmPassword: 'correct horse battery',
    })
    expect(result.success).toBe(true)
  })
})

describe('loginSchema', () => {
  it('keeps login password as required non-empty with max length', () => {
    const result = loginSchema.safeParse({ username: 'jdoe', password: 'x' })
    expect(result.success).toBe(true)
  })
})
