import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../ProtectedRoute'
import { useAuthStore } from '@/src/features/auth/store/authStore'
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

function renderReviewRoute() {
  return render(
    <MemoryRouter initialEntries={['/loans/approval/42']}>
      <Routes>
        <Route
          path="/loans/approval/:loanId"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.loansView}>
              <div>Review Application</div>
            </ProtectedRoute>
          }
        />
        <Route path="/forbidden" element={<div>Access Restricted</div>} />
        <Route path="/login" element={<div>Login</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute — loan review access', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      user: null,
      isInitializing: false,
    })
  })

  it('lets an Encoder open a review application with loans.view', () => {
    setSession([PERMISSIONS.loansCreate, PERMISSIONS.loansView])
    renderReviewRoute()
    expect(screen.getByText('Review Application')).toBeTruthy()
    expect(screen.queryByText('Access Restricted')).toBeNull()
  })

  it('still blocks users without loans.view', () => {
    setSession([PERMISSIONS.loansCreate])
    renderReviewRoute()
    expect(screen.getByText('Access Restricted')).toBeTruthy()
    expect(screen.queryByText('Review Application')).toBeNull()
  })
})
