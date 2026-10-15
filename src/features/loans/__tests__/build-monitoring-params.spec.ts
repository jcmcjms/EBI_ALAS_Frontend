import { describe, expect, it } from 'vitest'
import { buildMonitoringParams } from '../hooks/use-loan-monitoring'
import type { MonitoringFilters } from '../types/monitoring'

const baseFilters: MonitoringFilters = {
  search: '',
  dateRange: { from: undefined, to: undefined },
  status: [],
  branchCode: 'all',
  myTurn: false,
}

const pagination = { pageIndex: 0, pageSize: 15 }

describe('buildMonitoringParams', () => {
  it('sends paging only when no filters are set', () => {
    expect(buildMonitoringParams(baseFilters, pagination)).toEqual({
      page: '1',
      pageSize: '15',
    })
  })

  it('sends comma-separated status and non-all branchCode', () => {
    const params = buildMonitoringParams(
      {
        ...baseFilters,
        status: ['ForApproval', 'ForRecommendation'],
        branchCode: '011',
      },
      pagination,
    )
    expect(params.status).toBe('ForApproval,ForRecommendation')
    expect(params.branchCode).toBe('011')
  })

  it('sends trimmed search text', () => {
    const params = buildMonitoringParams(
      { ...baseFilters, search: '  LAM-100  ' },
      pagination,
    )
    expect(params.search).toBe('LAM-100')
  })

  it('sends dateFrom at local start of day and dateTo at local end of day', () => {
    const from = new Date(2026, 0, 10, 15, 30, 0)
    const to = new Date(2026, 0, 20, 9, 0, 0)
    const params = buildMonitoringParams(
      { ...baseFilters, dateRange: { from, to } },
      pagination,
    )

    const fromSent = new Date(params.dateFrom)
    const toSent = new Date(params.dateTo)
    expect(fromSent.getHours()).toBe(0)
    expect(fromSent.getMinutes()).toBe(0)
    expect(toSent.getHours()).toBe(23)
    expect(toSent.getMinutes()).toBe(59)
    expect(fromSent.getDate()).toBe(10)
    expect(toSent.getDate()).toBe(20)
  })

  it('sends myTurn=true only when enabled', () => {
    expect(
      buildMonitoringParams({ ...baseFilters, myTurn: true }, pagination)
        .myTurn,
    ).toBe('true')
    expect(buildMonitoringParams(baseFilters, pagination).myTurn).toBeUndefined()
  })
})
