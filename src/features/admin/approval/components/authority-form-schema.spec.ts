import { describe, expect, it } from 'vitest'
import type { ApprovalAuthorityDto } from '../api/approval-authorities'
import {
  authorityFormSchema,
  authorityToFormState,
  emptyAuthorityFormState,
  parsedFormToPayload,
} from './authority-form-schema'

const sampleAuthority: ApprovalAuthorityDto = {
  key: 'area-head',
  displayName: 'Area Head',
  tier: 2,
  priority: 1,
  allowNew: true,
  allowRenewal: false,
  maxSeverity: 2,
  maxTotalExposure: 500000,
  scopeType: 1,
  assignedUsers: [],
}

describe('authorityFormSchema', () => {
  it('coerces string fields to numbers', () => {
    const parsed = authorityFormSchema.safeParse({
      displayName: 'Area Head',
      tier: '2',
      priority: '1',
      maxTotalExposure: '500000',
      maxSeverity: '2',
      scopeType: '1',
      allowNew: true,
      allowRenewal: false,
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.tier).toBe(2)
      expect(parsed.data.maxTotalExposure).toBe(500000)
      expect(parsed.data.maxSeverity).toBe(2)
      expect(parsed.data.scopeType).toBe(1)
    }
  })

  it('rejects a tier below 1', () => {
    const parsed = authorityFormSchema.safeParse({
      ...emptyAuthorityFormState(),
      tier: '0',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects an empty display name', () => {
    const parsed = authorityFormSchema.safeParse({
      ...emptyAuthorityFormState(),
      displayName: '   ',
    })
    expect(parsed.success).toBe(false)
  })
})

describe('authorityToFormState', () => {
  it('stringifies numeric fields', () => {
    expect(authorityToFormState(sampleAuthority)).toEqual({
      displayName: 'Area Head',
      tier: '2',
      priority: '1',
      maxTotalExposure: '500000',
      maxSeverity: '2',
      scopeType: '1',
      allowNew: true,
      allowRenewal: false,
    })
  })
})

describe('parsedFormToPayload', () => {
  it('builds a limits payload', () => {
    expect(
      parsedFormToPayload({
        displayName: 'Area Head',
        tier: 2,
        priority: 1,
        maxTotalExposure: 500000,
        maxSeverity: 2,
        scopeType: 1,
        allowNew: true,
        allowRenewal: false,
      }),
    ).toEqual({
      displayName: 'Area Head',
      tier: 2,
      priority: 1,
      maxTotalExposure: 500000,
      maxSeverity: 2,
      scopeType: 1,
      allowNew: true,
      allowRenewal: false,
    })
  })
})
