import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { TransferTargetDialog } from '../components/transfer-target-dialog'

const options = [
  { loanIndex: 0, productCode: 'A16', loanNo: 'PN-10001' },
  { loanIndex: 1, productCode: 'B17', loanNo: 'PN-20002' },
]

describe('TransferTargetDialog', () => {
  it('lists selected loan applications and confirms the chosen target', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <TransferTargetDialog
        open
        onOpenChange={onOpenChange}
        rowLabel="OLD-1 · Prior loan"
        options={options}
        defaultLoanIndex={0}
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/A16 · PN-10001/)).toBeInTheDocument()
    expect(screen.getByText(/B17 · PN-20002/)).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /B17 · PN-20002/ }))
    await user.click(
      screen.getByRole('button', { name: /move to ebi reloans/i }),
    )

    expect(onConfirm).toHaveBeenCalledWith(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not confirm on cancel', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <TransferTargetDialog
        open
        onOpenChange={onOpenChange}
        rowLabel="OLD-1"
        options={options}
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
