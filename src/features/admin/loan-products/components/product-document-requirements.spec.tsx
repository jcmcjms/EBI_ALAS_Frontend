import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { ProductDocumentRequirementsEditor } from './product-document-requirements'

describe('ProductDocumentRequirementsEditor', () => {
  it('adds and removes rows', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ProductDocumentRequirementsEditor
        value={[{ code: 'A1004', description: 'A1004' }]}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: /add requirement/i }))
    expect(onChange).toHaveBeenLastCalledWith([
      { code: 'A1004', description: 'A1004' },
      { code: '', description: '' },
    ])

    await user.click(screen.getByRole('button', { name: /remove A1004/i }))
    expect(onChange).toHaveBeenLastCalledWith([])
  })
})
