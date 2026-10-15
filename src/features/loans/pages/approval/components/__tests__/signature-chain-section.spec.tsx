import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { SignatureChainSection } from '../signature-chain-section'
import type { SignatureSlotDto } from '@/src/features/loans/api/signatures'

const slots: SignatureSlotDto[] = [
  {
    order: 1,
    action: 'Recommend',
    role: 'Recommender',
    jobTitle: 'Branch Head',
    signedByName: 'DELA CRUZ, JUAN',
    signedByJobTitle: 'Branch Head',
    signedAt: '2026-10-14T09:12:00Z',
  },
  {
    order: 2,
    action: 'Evaluate',
    role: 'Evaluator',
    jobTitle: 'Credit Checker',
    signedByName: null,
    signedByJobTitle: null,
    signedAt: null,
  },
  {
    order: 3,
    action: 'Approve',
    role: 'Approver',
    jobTitle: 'Area Head',
    signedByName: null,
    signedByJobTitle: null,
    signedAt: null,
  },
]

describe('SignatureChainSection', () => {
  it('shows signed state with signer and timestamp', () => {
    render(<SignatureChainSection slots={slots} />)
    expect(screen.getByText('/s/ DELA CRUZ, JUAN')).toBeInTheDocument()
    expect(screen.getAllByText('Signed')).toHaveLength(1)
  })

  it('shows pending state for unsigned stages', () => {
    render(<SignatureChainSection slots={slots} />)
    expect(screen.getAllByText('Pending')).toHaveLength(2)
    expect(screen.getAllByText('Awaiting signature')).toHaveLength(2)
  })

  it('reports chain progress', () => {
    render(<SignatureChainSection slots={slots} />)
    expect(screen.getByText('1 of 3 signed')).toBeInTheDocument()
  })

  it('hides from print and keeps signed state on signedAt only', () => {
    render(
      <SignatureChainSection
        slots={[
          {
            ...slots[1],
            signedByName: 'ASSIGNED NAME',
            signedAt: null,
          },
        ]}
      />,
    )
    expect(screen.getByText('ASSIGNED NAME')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.queryByText(/^\/s\//)).not.toBeInTheDocument()
  })
})
