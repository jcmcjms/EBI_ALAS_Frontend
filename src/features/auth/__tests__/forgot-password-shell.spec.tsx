import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import ForgotPassword from '../pages/forgot-password'

vi.mock('@/src/shared/lib/apiClient', () => ({
  apiClient: { post: vi.fn() },
  getErrorMessage: () => 'Request failed',
}))

vi.mock('@/src/shared/ui/feedback/toast', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

async function renderForgotPassword() {
  const rootRoute = createRootRoute({ component: () => <Outlet /> })
  const forgotRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/forgot-password',
    component: () => <ForgotPassword />,
  })
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: () => <div>Login page</div>,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([forgotRoute, loginRoute]),
    history: createMemoryHistory({
      initialEntries: ['/forgot-password'],
    }),
  })
  const view = render(<RouterProvider router={router} />)
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Forgot password?' })).toBeInTheDocument()
  })
  return view
}

describe('ForgotPassword shell alignment with login', () => {
  it('shows the Enterprise Bank logo linking to the bank site', async () => {
    await renderForgotPassword()
    const logo = screen.getByAltText('Enterprise Bank Inc')
    expect(logo).toHaveAttribute('src', '/enterprise_bank-logo.png')
    expect(logo.closest('a')).toHaveAttribute(
      'href',
      'https://www.enterprisebank.ph/',
    )
  })

  it('renders the form without login-style card chrome', async () => {
    const { container } = await renderForgotPassword()
    const form = container.querySelector('form')
    expect(form).not.toBeNull()
    expect(form?.className).toContain('flex')
    expect(form?.className).toContain('flex-col')
    expect(form?.className).toContain('gap-6')
    expect(form?.className).not.toContain('border')
    expect(form?.className).not.toContain('bg-card')
    expect(form?.className).not.toContain('shadow-sm')
  })

  it('keeps existing product copy and username field', async () => {
    await renderForgotPassword()
    expect(screen.getByRole('heading', { name: 'ALAS (CL)' })).toBeInTheDocument()
    expect(screen.getByText('Enterprise Bank Inc.')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Forgot password?' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Send temporary password' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to login' })).toBeInTheDocument()
  })
})
