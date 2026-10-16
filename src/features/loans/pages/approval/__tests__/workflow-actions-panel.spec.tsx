import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom/vitest'
import { WorkflowActionsPanel } from '../workflow-actions-panel'
import type { WorkflowButtonDef } from '../workflow-constants'

const approveAction: WorkflowButtonDef = {
  role: 'Approver',
  from: 'ForApproval',
  to: 'Approved',
  label: 'Approve Loan',
  kind: 'advance',
  remarksRequired: false,
  confirm: true,
}

function renderPanel(
  overrides: Partial<Parameters<typeof WorkflowActionsPanel>[0]> = {},
) {
  const props = {
    loanId: '1',
    frozen: false,
    remarks: '',
    onRemarksChange: vi.fn(),
    actions: [approveAction],
    needsDeskGate: false,
    canAct: true,
    canCancel: true,
    onCancel: vi.fn(),
    onPushback: vi.fn(),
    act: { isPending: false, mutate: vi.fn() },
    claimById: { isPending: false, mutate: vi.fn() },
    detailStatus: 'ForApproval',
    missingDocCount: 0,
    ...overrides,
  }
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkflowActionsPanel {...props} />
    </QueryClientProvider>,
  )
}

describe('WorkflowActionsPanel', () => {
  it('renders primary decision action before the activity timeline', () => {
    renderPanel()
    const approve = screen.getByRole('button', { name: /approve loan/i })
    const timelineHeading = screen.getByRole('heading', {
      name: /activity timeline/i,
    })
    expect(approve.compareDocumentPosition(timelineHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it('shows cancel as a secondary text control, not a full-width block button', () => {
    renderPanel()
    const cancel = screen.getByRole('button', {
      name: /cancel this application/i,
    })
    expect(cancel.className).toContain('text-xs')
    expect(cancel.className).not.toContain('w-full')
  })

  it('does not disable decisions when documents are missing', () => {
    renderPanel({ missingDocCount: 3 })
    expect(screen.getByRole('button', { name: /approve loan/i })).toBeEnabled()
  })
})
