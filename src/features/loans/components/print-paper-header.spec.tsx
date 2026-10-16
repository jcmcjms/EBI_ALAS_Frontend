import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { PrintPaperHeader } from './approval-form-sheet'

describe('PrintPaperHeader', () => {
  it('keeps the logo print-only and always shows the paper title', () => {
    render(<PrintPaperHeader title="LOAN APPROVAL FORM" />)
    const logo = screen.getByAltText('Enterprise Bank')
    expect(logo).toHaveAttribute('src', '/print_logo.png')
    expect(logo.parentElement).toHaveClass('hidden')
    expect(logo.parentElement).toHaveClass('print:flex')
    expect(
      screen.getByRole('heading', { name: /loan approval form/i }),
    ).toBeInTheDocument()
  })

  it('renders optional meta only in the print logo row', () => {
    render(
      <PrintPaperHeader title="LOAN APPROVAL FORM" meta="Juan · LAM-1 · PN-9" />,
    )
    expect(screen.getByText(/LAM-1/)).toBeInTheDocument()
    expect(screen.getByText(/LAM-1/).parentElement).toHaveClass('hidden')
    expect(screen.getByText(/LAM-1/).parentElement).toHaveClass('print:flex')
  })
})
