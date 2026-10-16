import { describe, expect, it } from 'vitest'
import { maskEmployeeId } from '../employee-id'

describe('maskEmployeeId', () => {
  it('masks middle of long ids', () => {
    expect(maskEmployeeId('EMP1234567890')).toBe('EMP***7890')
  })
  it('returns short ids unchanged', () => {
    expect(maskEmployeeId('1234')).toBe('1234')
  })
  it('handles empty', () => {
    expect(maskEmployeeId('')).toBe('—')
  })
})
