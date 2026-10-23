import { describe, expect, it } from 'vitest'
import {
  mapApproverUser,
  SCOPE_LABELS,
  SEVERITY_LABELS,
} from './approval-authorities'

describe('mapApproverUser', () => {
  it('joins first and last name and passes id through', () => {
    expect(
      mapApproverUser({ id: '1', firstName: 'Ana', lastName: 'Reyes' }),
    ).toEqual({ id: '1', name: 'Ana Reyes' })
  })

  it('omits an empty last name', () => {
    expect(
      mapApproverUser({ id: '2', firstName: 'Ben', lastName: '' }),
    ).toEqual({ id: '2', name: 'Ben' })
  })
})

describe('labels', () => {
  it('maps severity codes', () => {
    expect(SEVERITY_LABELS[0]).toBe('None')
    expect(SEVERITY_LABELS[1]).toBe('Minor')
    expect(SEVERITY_LABELS[2]).toBe('Major')
  })

  it('maps scope codes', () => {
    expect(SCOPE_LABELS[0]).toBe('Branch')
    expect(SCOPE_LABELS[1]).toBe('Area')
    expect(SCOPE_LABELS[2]).toBe('Global')
  })
})
