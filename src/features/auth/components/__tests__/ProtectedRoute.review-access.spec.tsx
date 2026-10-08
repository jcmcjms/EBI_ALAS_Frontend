import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { ProtectedRoute } from '../ProtectedRoute'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { PERMISSIONS } from '@/src/shared/lib/api/types'

function setSession(permissions: string[], role = 'Encoder') {
  useAuthStore.setState({
    accessToken: 'test-token',
    isInitializing: false,
    user: {
      userId: '7',
      firstName: 'Test',
      middleName: '',
      lastName: 'Encoder',
      branchId: '011',
      role,
      jobTitle: null,
      permissions,
      mustChangePassword: false,
    },
  })
}

function createTestRouter(initialEntry: string) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> })

  const reviewRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/loans/approval/$loanId',
    component: () => (
      <ProtectedRoute requiredPermission={PERMISSIONS.loansView}>
        <div>Review Application</div>
      </ProtectedRoute>
    ),
  })

  const forbiddenRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/forbidden',
    component: () => <div>Access Restricted</div>,
  })

  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: () => <div>Login</div>,
  })

  const routeTree = rootRoute.addChildren([
    reviewRoute,
    forbiddenRoute,
    loginRoute,
  ])

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  })
}

function renderReviewRoute() {
  const router = createTestRouter('/loans/approval/42')
  return render(<RouterProvider router={router} />)
}

describe('ProtectedRoute — loan review access', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      user: null,
      isInitializing: false,
    })
  })

  it('lets an Encoder open a review application with loans.view', async () => {
    setSession([PERMISSIONS.loansCreate, PERMISSIONS.loansView])
    renderReviewRoute()
    expect(await screen.findByText('Review Application')).toBeTruthy()
    expect(screen.queryByText('Access Restricted')).toBeNull()
  })

  it('still blocks users without loans.view', async () => {
    setSession([PERMISSIONS.loansCreate])
    renderReviewRoute()
    expect(await screen.findByText('Access Restricted')).toBeTruthy()
    expect(screen.queryByText('Review Application')).toBeNull()
  })
})
