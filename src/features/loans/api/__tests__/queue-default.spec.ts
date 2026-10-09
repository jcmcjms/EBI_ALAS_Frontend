import { describe, expect, it } from 'vitest'
import { parseQueueDefault } from '../queue-default'

describe('parseQueueDefault', () => {
  it('accepts a raw status name array from the API', () => {
    const statuses = parseQueueDefault([
      'ForRecommendation',
      'ForChecking',
      'ForApproval',
    ])

    expect(statuses).toEqual(['ForRecommendation', 'ForChecking', 'ForApproval'])
  })

  it('drops unknown status names', () => {
    const statuses = parseQueueDefault(['ForChecking', 'NotAStatus'])

    expect(statuses).toEqual(['ForChecking'])
  })
})
