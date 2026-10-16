import { describe, expect, it } from 'vitest'
import { isCreateFormUnlocked } from '../pages/create/client-confirm-utils'

describe('isCreateFormUnlocked', () => {
  it('requires both a CIS id and explicit confirm', () => {
    expect(isCreateFormUnlocked('', false)).toBe(false)
    expect(isCreateFormUnlocked('123', false)).toBe(false)
    expect(isCreateFormUnlocked('', true)).toBe(false)
    expect(isCreateFormUnlocked('123', true)).toBe(true)
  })
})
