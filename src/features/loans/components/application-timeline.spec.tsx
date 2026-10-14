import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom/vitest'
import type { PagedResult } from '@/src/shared/lib/api/types'
import type { TimelineEvent } from '../api/loan-review'

vi.mock('../api/loan-review', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/loan-review')>()
  return {
    ...actual,
    getLoanTimeline: vi.fn(),
  }
})

import { ApplicationTimeline } from './application-timeline'
import { getLoanTimeline } from '../api/loan-review'

const GUID = '0533c6bc-0562-4606-8395-cb117840508f'

const emptyPage: PagedResult<TimelineEvent> = {
  items: [],
  totalCount: 0,
  currentPage: 1,
  pageSize: 15,
  totalPages: 0,
  hasPreviousPage: false,
  hasNextPage: false,
}

const getLoanTimelineMock = vi.mocked(getLoanTimeline)

function renderWithQueryClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  )
}

describe('ApplicationTimeline loan id', () => {
  beforeEach(() => {
    getLoanTimelineMock.mockReset()
    getLoanTimelineMock.mockResolvedValue(emptyPage)
  })

  it('requests the timeline with the GUID loan id, not NaN', async () => {
    renderWithQueryClient(<ApplicationTimeline loanId={GUID} />)

    await waitFor(() => {
      expect(getLoanTimeline).toHaveBeenCalled()
    })

    expect(getLoanTimelineMock.mock.calls[0][0]).toBe(GUID)
  })

  it('requests the timeline with a numeric loan id unchanged', async () => {
    renderWithQueryClient(<ApplicationTimeline loanId={42} />)

    await waitFor(() => {
      expect(getLoanTimeline).toHaveBeenCalled()
    })

    expect(getLoanTimelineMock.mock.calls[0][0]).toBe(42)
  })

  it('does not fetch when the loan id is missing', async () => {
    renderWithQueryClient(
      <ApplicationTimeline loanId={'' as unknown as number} />,
    )

    await Promise.resolve()
    expect(getLoanTimeline).not.toHaveBeenCalled()
  })
})
