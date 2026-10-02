import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Spinner } from '@/src/shared/ui/spinner'
import { ProtectedRoute } from '@/src/features/auth/components/ProtectedRoute'
import { FeatureErrorBoundary } from '@/src/components/system/FeatureErrorBoundary'
import { AppShell } from '@/src/app/layout/AppShell'
import { PERMISSIONS } from '@/src/lib/api/types'

const Login = lazy(() => import('./features/auth/pages/login'))
const ChangePassword = lazy(
  () => import('./features/auth/pages/change-password'),
)
const Dashboard = lazy(() =>
  import('./features/dashboard/pages/index').then((m) => ({
    default: m.Dashboard,
  })),
)
const UsersPage = lazy(() =>
  import('./features/admin/users/pages/index').then((m) => ({
    default: m.UsersPage,
  })),
)
const LoanProductsPage = lazy(() =>
  import('./features/admin/loan-products/pages/index').then((m) => ({
    default: m.LoanProductsPage,
  })),
)
const LoanCreation = lazy(() => import('./features/loans/pages/create/index'))
const LoanMonitoring = lazy(
  () => import('./features/loans/pages/monitoring/index'),
)
const LoanApproval = lazy(() => import('./features/loans/pages/approval/index'))
const LoanEvaluation = lazy(
  () => import('./features/loans/pages/evaluation/index'),
)
const ReviewDesk = lazy(() => import('./features/loans/pages/queue/index'))
const AuditLogs = lazy(() =>
  import('./features/audit-logs/pages/index').then((m) => ({
    default: m.default,
  })),
)
const WorkflowSettings = lazy(() =>
  import('./features/admin/workflow/pages/index').then((m) => ({
    default: m.WorkflowSettingsPage,
  })),
)
const Notifications = lazy(() => import('./features/notifications/pages/index'))
const Account = lazy(() => import('./features/account/pages/index'))
const Forbidden = lazy(() => import('./features/auth/pages/Forbidden'))

function AuthedShell() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            <Spinner className="size-8" />
          </div>
        }
      >
        <Routes>
          {}
          <Route path="/login" element={<Login />} />
          <Route path="/forbidden" element={<Forbidden />} />

          {}
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />

          {}
          <Route element={<AuthedShell />}>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredPermission={PERMISSIONS.loansView}>
                  <FeatureErrorBoundary featureName="Dashboard">
                    <Dashboard />
                  </FeatureErrorBoundary>
                </ProtectedRoute>
              }
            />

            {}
            <Route
              path="/loans/monitoring"
              element={
                <ProtectedRoute requiredPermission={PERMISSIONS.loansView}>
                  <FeatureErrorBoundary featureName="Loan Monitoring">
                    <LoanMonitoring />
                  </FeatureErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/loans/create"
              element={
                <ProtectedRoute requiredPermission={PERMISSIONS.loansCreate}>
                  <FeatureErrorBoundary featureName="Loan Creation">
                    <LoanCreation />
                  </FeatureErrorBoundary>
                </ProtectedRoute>
              }
            />
            {}
            <Route
              path="/loans/queue"
              element={
                <ProtectedRoute
                  requiredAnyPermission={[
                    PERMISSIONS.loansRecommend,
                    PERMISSIONS.loansEvaluate,
                    PERMISSIONS.loansApprove,
                  ]}
                >
                  <FeatureErrorBoundary featureName="Review Desk">
                    <ReviewDesk />
                  </FeatureErrorBoundary>
                </ProtectedRoute>
              }
            />
            {}
            <Route
              path="/loans/approval/:loanId"
              element={
                <ProtectedRoute
                  requiredAnyPermission={[
                    PERMISSIONS.loansRecommend,
                    PERMISSIONS.loansEvaluate,
                    PERMISSIONS.loansApprove,
                  ]}
                >
                  <FeatureErrorBoundary featureName="Loan Approval">
                    <LoanApproval />
                  </FeatureErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/loans/evaluation/:loanId"
              element={
                <ProtectedRoute requiredPermission={PERMISSIONS.loansEvaluate}>
                  <FeatureErrorBoundary featureName="Loan Evaluation">
                    <LoanEvaluation />
                  </FeatureErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <FeatureErrorBoundary featureName="Notifications">
                    <Notifications />
                  </FeatureErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <FeatureErrorBoundary featureName="Account">
                    <Account />
                  </FeatureErrorBoundary>
                </ProtectedRoute>
              }
            />

            {}
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requiredPermission={PERMISSIONS.userView}>
                  <FeatureErrorBoundary featureName="User Management">
                    <UsersPage />
                  </FeatureErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/loan-products"
              element={
                <ProtectedRoute
                  requiredPermission={PERMISSIONS.loanProductView}
                >
                  <FeatureErrorBoundary featureName="Loan Products">
                    <LoanProductsPage />
                  </FeatureErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <ProtectedRoute requiredPermission={PERMISSIONS.auditLogsView}>
                  <FeatureErrorBoundary featureName="Audit Logs">
                    <AuditLogs />
                  </FeatureErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/workflow"
              element={
                <ProtectedRoute requiredPermission={PERMISSIONS.workflowManage}>
                  <FeatureErrorBoundary featureName="Workflow Settings">
                    <WorkflowSettings />
                  </FeatureErrorBoundary>
                </ProtectedRoute>
              }
            />
          </Route>

          {}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
