import { describe, expect, it } from 'vitest'
import { assignableRoles } from '../api/roles'
import type { RoleInfo } from '../api/roles'

const roles: RoleInfo[] = [
  { name: 'Encoder', displayName: 'Encoder' },
  { name: 'Admin', displayName: 'Admin' },
  { name: 'System', displayName: 'System' },
  { name: 'Approver', displayName: 'Approver' },
]

describe('assignableRoles', () => {
  it('hides System from primary role selection', () => {
    const result = assignableRoles(roles)
    expect(result.map((r) => r.name)).toEqual(['Encoder', 'Admin', 'Approver'])
  })
})
