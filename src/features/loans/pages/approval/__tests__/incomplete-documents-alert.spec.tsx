import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { IncompleteDocumentsAlert } from '../components/incomplete-documents-alert'

describe('IncompleteDocumentsAlert', () => {
  it('renders nothing when count is zero', () => {
    const { container } = render(
      <IncompleteDocumentsAlert count={0} onReview={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('pluralizes the requirement count and calls onReview', async () => {
    const user = userEvent.setup()
    const onReview = vi.fn()
    render(<IncompleteDocumentsAlert count={2} onReview={onReview} />)

    expect(
      screen.getByText(/2 requirements pending/i),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: /review missing documents/i }),
    )
    expect(onReview).toHaveBeenCalledTimes(1)
  })
})
