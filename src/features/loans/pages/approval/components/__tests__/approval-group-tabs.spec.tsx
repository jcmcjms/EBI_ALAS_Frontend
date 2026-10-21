import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { ApprovalGroupTabs } from '../approval-group-tabs'
import type { GroupLoanSummary } from '../approval-group-tabs'

const loans: GroupLoanSummary[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    lamId: 'LAM-0001',
    productCode: 'SAL',
    status: 'ForApproval',
    unresolvedDocs: 0,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    lamId: 'LAM-0002',
    productCode: 'BUS',
    status: 'ForApproval',
    unresolvedDocs: 0,
  },
]

describe('ApprovalGroupTabs', () => {
  it('selects a sibling loan by its string id without coercing to Number', async () => {
    const onSelect = vi.fn()
    render(
      <ApprovalGroupTabs
        loans={loans}
        currentLoanId={loans[0].id}
        onSelect={onSelect}
        statusOf={(s) => s}
      />,
    )

    await userEvent.click(screen.getByRole('tab', { name: /bus/i }))

    expect(onSelect).toHaveBeenCalledWith(loans[1].id)
    expect(onSelect).not.toHaveBeenCalledWith(NaN)
  })
})
