import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActionRequired } from '../components/action-required'
import type { ActionRequiredItem } from '../types'

describe('ActionRequired', () => {
  it('renders compact empty state', () => {
    render(<ActionRequired items={[]} onReview={vi.fn()} />)
    expect(screen.getByText('Nothing needs attention')).toBeInTheDocument()
  })

  it('lists items with review action', async () => {
    const onReview = vi.fn()
    const items: ActionRequiredItem[] = [
      {
        kind: 'Returned',
        lamId: 'LAM-1',
        reason: 'Returned for correction',
        occurredAt: new Date().toISOString(),
        canAct: true,
      },
    ]
    render(<ActionRequired items={items} onReview={onReview} />)
    expect(screen.getByText('LAM-1')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Review/i }))
    expect(onReview).toHaveBeenCalledWith('LAM-1', 'Returned')
  })
})
