import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EbiReloansTable } from '../components/ebi-reloans-table'

describe('EbiReloansTable deductions', () => {
  it('writes existingDeduction edits to form state', () => {
    const setCell = vi.fn()
    render(
      <EbiReloansTable
        rows={[
          {
            pn: 'PN-1',
            name: 'Test Bank',
            existingDeduction: 100,
            outstandingBalance: 1000,
            payToClose: 0,
          },
        ]}
        loanPath="loans.0"
        setCell={setCell}
        handleTransfer={vi.fn()}
      />,
    )

    const input = screen.getByLabelText(/deductions for/i)
    fireEvent.change(input, { target: { value: '250' } })

    expect(setCell).toHaveBeenCalledWith(
      'loans.0.ebiReloans.0.existingDeduction',
      250,
    )
  })
})
