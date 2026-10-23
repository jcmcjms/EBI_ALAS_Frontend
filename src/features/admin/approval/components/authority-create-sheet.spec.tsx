import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { AuthorityCreateSheet } from './authority-create-sheet'

describe('AuthorityCreateSheet', () => {
  it('shows validation error and does not submit when display name is empty', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(
      <AuthorityCreateSheet open onClose={vi.fn()} onCreate={onCreate} />,
    )

    await user.click(screen.getByRole('button', { name: /create authority/i }))

    expect(screen.getByText('Display name is required')).toBeInTheDocument()
    expect(onCreate).not.toHaveBeenCalled()
  })
})
