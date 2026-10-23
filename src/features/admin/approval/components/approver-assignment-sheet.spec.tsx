import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { ApproverAssignmentSheet } from './approver-assignment-sheet'
import type { ApprovalAuthorityDto } from '../api/approval-authorities'

const authority: ApprovalAuthorityDto = {
  key: 'area-head',
  displayName: 'Area Head',
  tier: 2,
  priority: 1,
  allowNew: true,
  allowRenewal: false,
  maxSeverity: 2,
  maxTotalExposure: 500000,
  scopeType: 1,
  assignedUsers: [{ userId: '1', name: 'Ana Reyes' }],
}

describe('ApproverAssignmentSheet', () => {
  it('toggles a user and saves the resulting id list', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <ApproverAssignmentSheet
        authority={authority}
        users={[
          { id: '1', name: 'Ana Reyes' },
          { id: '2', name: 'Ben Cruz' },
        ]}
        isLoading={false}
        isPending={false}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    )

    const ben = screen.getByRole('checkbox', { name: /ben cruz/i })
    await user.click(ben)
    const ana = screen.getByRole('checkbox', { name: /ana reyes/i })
    await user.click(ana)

    await user.click(screen.getByRole('button', { name: /save assignment/i }))

    expect(onSave).toHaveBeenCalledWith(['2'])
  })
})
