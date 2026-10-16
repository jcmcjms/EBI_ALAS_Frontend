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
import { LoginForm } from '../pages/login-form'

vi.mock('@/src/shared/lib/apiClient', () => ({
  apiClient: { post: vi.fn() },
  getErrorMessage: () => 'Request failed',
}))

vi.mock('@/src/shared/ui/feedback/toast', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

const setSession = vi.fn()
vi.mock('@/src/shared/store/auth-store', () => ({
  useAuthStore: (selector: (s: { setSession: typeof setSession }) => unknown) =>
    selector({ setSession }),
}))

describe('Login forgot-password link', () => {
  it('links to the in-app forgot-password route', async () => {
    const rootRoute = createRootRoute({ component: () => <Outlet /> })
    const loginRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/login',
      component: () => <LoginForm />,
    })
    const forgotRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/forgot-password',
      component: () => <div>Forgot password page</div>,
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([loginRoute, forgotRoute]),
      history: createMemoryHistory({ initialEntries: ['/login'] }),
    })
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Login to your account' }),
      ).toBeInTheDocument()
    })

    const link = screen.getByRole('link', { name: 'Forgot password?' })
    expect(link).toHaveAttribute('href', '/forgot-password')
    expect(link).not.toHaveAttribute(
      'href',
      expect.stringContaining('itsupport'),
    )
  })
})
