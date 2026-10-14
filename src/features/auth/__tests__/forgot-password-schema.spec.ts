import { describe, expect, it } from 'vitest'
import { forgotPasswordSchema } from '../schemas'

describe('forgotPasswordSchema', () => {
  it('accepts a valid username', () => {
    const result = forgotPasswordSchema.safeParse({ username: 'jdoe' })
    expect(result.success).toBe(true)
  })

  it('rejects a short username', () => {
    const result = forgotPasswordSchema.safeParse({ username: 'ab' })
    expect(result.success).toBe(false)
  })

  it('rejects a missing username', () => {
    const result = forgotPasswordSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
