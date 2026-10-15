import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MetricStrip } from '../components/metric-strip'
import type { DashboardSummary } from '../types'

const summary: DashboardSummary = {
  totalPending: 0,
  pendingDeltaFromYesterday: 0,
  nowServing: 2,
  pushBacksToday: 1,
  approvedToday: 0,
  approvedVsAvgPercent: 0,
}

describe('MetricStrip', () => {
  it('uses approved labels and neutral zero-change copy', () => {
    render(<MetricStrip summary={summary} onNavigate={vi.fn()} />)
    expect(screen.getByText('Pending Applications')).toBeInTheDocument()
    expect(screen.getByText('Under Review')).toBeInTheDocument()
    expect(screen.getByText('Returned Today')).toBeInTheDocument()
    expect(screen.getByText('Approved Today')).toBeInTheDocument()
    expect(screen.getAllByText(/No change/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/\+0/)).not.toBeInTheDocument()
  })

  it('navigates when a metric is activated', async () => {
    const onNavigate = vi.fn()
    render(<MetricStrip summary={summary} onNavigate={onNavigate} />)
    await userEvent.click(
      screen.getByRole('button', { name: /Returned Today/i }),
    )
    expect(onNavigate).toHaveBeenCalledWith('returned')
  })
})
