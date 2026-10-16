import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { ConfirmActionDialog } from '../confirm-action-dialog'
import type { WorkflowButtonDef } from '../workflow-constants'

const rejectAction: WorkflowButtonDef = {
  role: 'Approver',
  from: 'ForApproval',
  to: 'Rejected',
  label: 'Reject',
  kind: 'reject',
  remarksRequired: true,
  confirm: true,
}

describe('ConfirmActionDialog', () => {
  it('disables confirm until remarks meet MIN_REMARKS', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <ConfirmActionDialog
        action={rejectAction}
        remarks=""
        onRemarksChange={() => {}}
        onConfirm={onConfirm}
        isPending={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: /reject/i }))
    const confirm = screen.getByRole('button', { name: /^confirm$/i })
    expect(confirm).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
