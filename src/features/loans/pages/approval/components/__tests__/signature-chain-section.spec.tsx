import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { SignatureChainSection } from '../signature-chain-section'
import type { SignatureDisplaySlot } from '@/src/features/loans/api/signatures'

const INK = 'data:image/png;base64,iVBORw0KGgo='

function slot(
  overrides: Partial<SignatureDisplaySlot> = {},
): SignatureDisplaySlot {
  return {
    order: 1,
    action: 'Encode',
    role: 'Encoder',
    jobTitle: 'Account Officer',
    signedByName: 'Encoder Twenty-Two',
    signedByJobTitle: 'Account Officer',
    signedAt: '2026-10-15T08:23:00Z',
    signatureUrl: INK,
    ...overrides,
  }
}

describe('SignatureChainSection', () => {
  it('renders the ink snapshot when present', () => {
    render(<SignatureChainSection slots={[slot()]} />)
    const img = screen.getByRole('img', {
      name: 'Signature of Encoder Twenty-Two',
    })
    expect(img.getAttribute('src')).toBe(INK)
  })

  it('falls back to the conformed /s/ name when no ink is stored', () => {
    render(<SignatureChainSection slots={[slot({ signatureUrl: null })]} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('/s/ Encoder Twenty-Two')).toBeInTheDocument()
  })

  it('falls back to the conformed name when the ink fails to decode', () => {
    render(<SignatureChainSection slots={[slot()]} />)
    fireEvent.error(screen.getByRole('img'))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('/s/ Encoder Twenty-Two')).toBeInTheDocument()
  })
})
