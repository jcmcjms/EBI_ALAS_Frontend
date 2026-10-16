import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IdentificationCard } from '@phosphor-icons/react'
import { ProfileCard } from '../profile-card'

vi.mock('@/src/shared/ui/feedback/toast', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

describe('ProfileCard sensitive row', () => {
  it('copies raw value when copy control is used', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    render(
      <ProfileCard
        fullName="Ada Lovelace"
        stats={[]}
        isLoading={false}
        onEditProfile={() => {}}
        contactRows={[
          {
            key: 'employee',
            icon: IdentificationCard,
            text: 'Employee ID EMP***7890',
            missing: false,
            sensitive: true,
            rawValue: 'EMP1234567890',
          },
        ]}
      />,
    )

    await userEvent.click(
      screen.getByRole('button', { name: /copy full identifier/i }),
    )
    expect(writeText).toHaveBeenCalledWith('EMP1234567890')
  })
})
