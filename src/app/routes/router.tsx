import { lazy, Suspense, type ReactNode } from 'react'
import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
} from '@tanstack/react-router'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import { ProtectedRoute } from '@/src/features/auth/components/ProtectedRoute'
import {
  parseAccountTab,
  type AccountTab,
} from '@/src/features/account/types'
import { FeatureErrorBoundary } from '@/src/app/system/FeatureErrorBoundary'
import { AppShell } from '@/src/app/layout/AppShell'
import { PERMISSIONS } from '@/src/shared/lib/api/types'

const Login = lazy(() => import('@/src/features/auth/pages/login'))
const ForgotPassword = lazy(
  () => import('@/src/features/auth/pages/forgot-password'),
)
const ChangePassword = lazy(
  () => import('@/src/features/auth/pages/change-password'),
)
const Dashboard = lazy(() =>
  import('@/src/features/dashboard/pages/index').then((m) => ({
    default: m.Dashboard,
  })),
)
const UsersPage = lazy(() =>
  import('@/src/features/admin/users/pages/index').then((m) => ({
    default: m.UsersPage,
  })),
)
const LoanProductsPage = lazy(() =>
  import('@/src/features/admin/loan-products/pages/index').then((m) => ({
    default: m.LoanProductsPage,
  })),
)
const BranchesPage = lazy(() =>
  import('@/src/features/admin/branches/pages/index').then((m) => ({
    default: m.BranchesPage,
  })),
)
const ApprovalAuthoritiesPage = lazy(() =>
  import('@/src/features/admin/approval/pages/index').then((m) => ({
    default: m.ApprovalAuthoritiesPage,
  })),
)
const LoanCreation = lazy(
  () => import('@/src/features/loans/pages/create/index'),
)
const LoanRevision = lazy(
  () => import('@/src/features/loans/pages/revision/index'),
)
const LoanMonitoring = lazy(
  () => import('@/src/features/loans/pages/monitoring/index'),
)
const LoanApproval = lazy(
  () => import('@/src/features/loans/pages/approval/index'),
)
const LoanEvaluation = lazy(
  () => import('@/src/features/loans/pages/evaluation/index'),
)
const ReviewDesk = lazy(() => import('@/src/features/loans/pages/queue/index'))
const WorkflowSettings = lazy(() =>
  import('@/src/features/admin/workflow/pages/index').then((m) => ({
    default: m.WorkflowSettingsPage,
  })),
)
const Notifications = lazy(
  () => import('@/src/features/notifications/pages/index'),
)
const Account = lazy(() => import('@/src/features/account/pages/index'))
const Forbidden = lazy(() => import('@/src/features/auth/pages/Forbidden'))

function RoutePending() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner className="size-8" />
    </div>
  )
}

function AuthedShell() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

interface GuardedRouteProps {
  children: ReactNode
  requiredPermission?: string | string[]
  requiredAnyPermission?: string[]
  featureName?: string
}

function GuardedRoute({
  children,
  requiredPermission,
  requiredAnyPermission,
  featureName,
}: GuardedRouteProps) {
  const guarded = (
    <ProtectedRoute
      requiredPermission={requiredPermission}
      requiredAnyPermission={requiredAnyPermission}
    >
      {children}
    </ProtectedRoute>
  )

  if (!featureName) return guarded

  return (
    <FeatureErrorBoundary featureName={featureName}>{guarded}</FeatureErrorBoundary>
  )
}

type MonitoringSearch = {
  status?: string
  id?: string
  flagged?: string
}

function parseMonitoringSearch(
  search: Record<string, unknown>,
): MonitoringSearch {
  const asString = (value: unknown) =>
    typeof value === 'string' ? value : value != null ? String(value) : undefined

  return {
    status: asString(search.status),
    id: asString(search.id),
    flagged: asString(search.flagged),
  }
}

type AccountSearch = {
  tab: AccountTab
}

function parseAccountSearch(search: Record<string, unknown>): AccountSearch {
  return {
    tab: parseAccountTab(typeof search.tab === 'string' ? search.tab : null),
  }
}

const rootRoute = createRootRoute({
  component: () => (
    <Suspense fallback={<RoutePending />}>
      <Outlet />
    </Suspense>
  ),
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: ForgotPassword,
})

const forbiddenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forbidden',
  component: Forbidden,
})

const changePasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/change-password',
  component: () => (
    <GuardedRoute>
      <ChangePassword />
    </GuardedRoute>
  ),
})

const authedShellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authed-shell',
  component: AuthedShell,
})

const dashboardRoute = createRoute({
  getParentRoute: () => authedShellRoute,
  path: '/dashboard',
  component: () => (
    <GuardedRoute
      requiredPermission={PERMISSIONS.loansView}
      featureName="Dashboard"
    >
      <Dashboard />
    </GuardedRoute>
  ),
})

const loanMonitoringRoute = createRoute({
  getParentRoute: () => authedShellRoute,
  path: '/loans/monitoring',
  validateSearch: parseMonitoringSearch,
  component: () => (
    <GuardedRoute
      requiredPermission={PERMISSIONS.loansView}
      featureName="Loan Monitoring"
    >
      <LoanMonitoring />
    </GuardedRoute>
  ),
})

const loanCreateRoute = createRoute({
  getParentRoute: () => authedShellRoute,
  path: '/loans/create',
  component: () => (
    <GuardedRoute
      requiredPermission={PERMISSIONS.loansCreate}
      featureName="Loan Creation"
    >
      <LoanCreation />
    </GuardedRoute>
  ),
})

const loanRevisionRoute = createRoute({
  getParentRoute: () => authedShellRoute,
  path: '/loans/revision/$loanId',
  component: () => (
    <GuardedRoute
      requiredPermission={PERMISSIONS.loansRevise}
      featureName="Loan Revision"
    >
      <LoanRevision />
    </GuardedRoute>
  ),
})

const loanQueueRoute = createRoute({
  getParentRoute: () => authedShellRoute,
  path: '/loans/queue',
  component: () => (
    <GuardedRoute
      requiredAnyPermission={[
        PERMISSIONS.loansRecommend,
        PERMISSIONS.loansEvaluate,
        PERMISSIONS.loansApprove,
      ]}
      featureName="Review Desk"
    >
      <ReviewDesk />
    </GuardedRoute>
  ),
})

const loanApprovalRoute = createRoute({
  getParentRoute: () => authedShellRoute,
  path: '/loans/approval/$loanId',
  component: () => (
    <GuardedRoute
      requiredPermission={PERMISSIONS.loansView}
      featureName="Loan Approval"
    >
      <LoanApproval />
    </GuardedRoute>
  ),
})

const loanEvaluationRoute = createRoute({
  getParentRoute: () => authedShellRoute,
  path: '/loans/evaluation/$loanId',
  component: () => (
    <GuardedRoute
      requiredPermission={PERMISSIONS.loansEvaluate}
      featureName="Loan Evaluation"
    >
      <LoanEvaluation />
    </GuardedRoute>
  ),
})

const notificationsRoute = createRoute({
  getParentRoute: () => authedShellRoute,
  path: '/notifications',
  component: () => (
    <GuardedRoute featureName="Notifications">
      <Notifications />
    </GuardedRoute>
  ),
})

const accountRoute = createRoute({
  getParentRoute: () => authedShellRoute,
  path: '/account',
  validateSearch: parseAccountSearch,
  component: () => (
    <GuardedRoute featureName="Account">
      <Account />
    </GuardedRoute>
  ),
})

const adminUsersRoute = createRoute({
  getParentRoute: () => authedShellRoute,
  path: '/admin/users',
  component: () => (
    <GuardedRoute
      requiredPermission={PERMISSIONS.userView}
      featureName="User Management"
    >
      <UsersPage />
    </GuardedRoute>
  ),
})

const adminLoanProductsRoute = createRoute({
  getParentRoute: () => authedShellRoute,
  path: '/admin/loan-products',
  component: () => (
    <GuardedRoute
      requiredPermission={PERMISSIONS.loanProductView}
      featureName="Loan Products"
    >
      <LoanProductsPage />
    </GuardedRoute>
  ),
})

const adminBranchesRoute = createRoute({
  getParentRoute: () => authedShellRoute,
  path: '/admin/branches',
  component: () => (
    <GuardedRoute
      requiredPermission={PERMISSIONS.branchManage}
      featureName="Branch Management"
    >
      <BranchesPage />
    </GuardedRoute>
  ),
})

const adminWorkflowRoute = createRoute({
  getParentRoute: () => authedShellRoute,
  path: '/admin/workflow',
  component: () => (
    <GuardedRoute
      requiredPermission={PERMISSIONS.workflowManage}
      featureName="Workflow Settings"
    >
      <WorkflowSettings />
    </GuardedRoute>
  ),
})

const adminApprovalRoute = createRoute({
  getParentRoute: () => authedShellRoute,
  path: '/admin/approval',
  component: () => (
    <GuardedRoute
      requiredPermission={PERMISSIONS.workflowManage}
      featureName="Approval Management"
    >
      <ApprovalAuthoritiesPage />
    </GuardedRoute>
  ),
})

const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: () => <Navigate to="/login" replace />,
})

const authedRouteTree = authedShellRoute.addChildren([
  dashboardRoute,
  loanMonitoringRoute,
  loanCreateRoute,
  loanRevisionRoute,
  loanQueueRoute,
  loanApprovalRoute,
  loanEvaluationRoute,
  notificationsRoute,
  accountRoute,
  adminUsersRoute,
  adminLoanProductsRoute,
  adminBranchesRoute,
  adminWorkflowRoute,
  adminApprovalRoute,
])

const routeTree = rootRoute.addChildren([
  loginRoute,
  forgotPasswordRoute,
  forbiddenRoute,
  changePasswordRoute,
  authedRouteTree,
  catchAllRoute,
])

export const router = createRouter({
  routeTree,
  defaultPendingComponent: RoutePending,
  defaultNotFoundComponent: () => <Navigate to="/login" replace />,
})

export type AppRouter = typeof router
