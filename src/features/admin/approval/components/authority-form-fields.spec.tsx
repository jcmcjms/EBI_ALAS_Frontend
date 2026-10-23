import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { AuthorityFormFields } from './authority-form-fields'
import { emptyAuthorityFormState } from './authority-form-schema'

describe('AuthorityFormFields', () => {
  it('renders every field with an error message when present', () => {
    render(
      <AuthorityFormFields
        state={emptyAuthorityFormState()}
        onChange={vi.fn()}
        errors={{ displayName: 'Display name is required' }}
        idPrefix="test"
      />,
    )

    expect(screen.getByLabelText('Display name')).toBeInTheDocument()
    expect(screen.getByLabelText('Tier')).toBeInTheDocument()
    expect(screen.getByLabelText('Priority')).toBeInTheDocument()
    expect(screen.getByLabelText('Max total exposure (₱)')).toBeInTheDocument()
    expect(screen.getByText('Max severity')).toBeInTheDocument()
    expect(screen.getByText('Scope')).toBeInTheDocument()
    expect(screen.getByText('Allow new loans')).toBeInTheDocument()
    expect(screen.getByText('Allow renewals')).toBeInTheDocument()
    expect(screen.getByText('Display name is required')).toBeInTheDocument()
  })
})
