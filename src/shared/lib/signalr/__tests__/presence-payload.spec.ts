import { describe, expect, it } from 'vitest'
import { mapPresencePayload, type PresenceApiRow } from '../presence-payload'

describe('mapPresencePayload', () => {
  it('maps a raw online row into a string-keyed presence user', () => {
    const row: PresenceApiRow = {
      userId: '43104ae5-e009-4761-a314-f215e08464d9',
      name: 'System Administrator',
      role: 'Admin',
      branchCode: 'HO',
      jobTitle: null,
      connections: 1,
    }

    const user = mapPresencePayload(row)

    expect(user.userId).toBe('43104ae5-e009-4761-a314-f215e08464d9')
    expect(user.name).toBe('System Administrator')
    expect(user.connections).toBe(1)
    expect(typeof user.userId).toBe('string')
  })
})
