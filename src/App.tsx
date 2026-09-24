import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Spinner } from "@/src/components/ui/spinner";
import { ProtectedRoute } from "@/src/components/auth/ProtectedRoute";
import { FeatureErrorBoundary } from "@/src/components/system/FeatureErrorBoundary";
import { PERMISSIONS } from "@/src/lib/api/types";

const Login = lazy(() => import("./features/auth/pages/login"));
const ChangePassword = lazy(() => import("./features/auth/pages/change-password"));
const Dashboard = lazy(() => import("./features/dashboard/pages/index").then(m => ({ default: m.Dashboard })));
const UsersPage = lazy(() => import("./features/admin/users/pages/index").then(m => ({ default: m.UsersPage })));
const LoanProductsPage = lazy(() => import("./features/admin/loan-products/pages/index").then(m => ({ default: m.LoanProductsPage })));
const LoanCreation = lazy(() => import("./features/loans/pages/create/index"));
const LoanMonitoring = lazy(() => import("./features/loans/pages/monitoring/index"));
const LoanApproval = lazy(() => import("./features/loans/pages/approval/index"));
const LoanEvaluation = lazy(() => import("./features/loans/pages/evaluation/index"));
const ReviewDesk = lazy(() => import("./features/loans/pages/queue/index"));
const AuditLogs = lazy(() => import("./features/audit-logs/pages/index").then(m => ({ default: m.default })));
const WorkflowSettings = lazy(() => import("./features/admin/workflow/pages/index").then(m => ({ default: m.WorkflowSettingsPage })));
const Notifications = lazy(() => import("./features/notifications/pages/index"));
const Account = lazy(() => import("./features/account/pages/index"));
const Forbidden = lazy(() => import("./pages/errors/Forbidden"));

function App() {
    return (
        <BrowserRouter>
            <Suspense fallback={
                <div className="flex h-screen items-center justify-center">
                    <Spinner className="size-8" />
                </div>
            }>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    {/* Change Password — requires auth but accessible even when mustChangePassword is true */}
                    <Route path="/change-password" element={
                        <ProtectedRoute>
                            <ChangePassword />
                        </ProtectedRoute>
                    } />

                    {/* 403 Forbidden — accessible without auth so the page
                        itself can render for any user who hits it */}
                    <Route path="/forbidden" element={<Forbidden />} />

                    {/* Protected Routes */}
                    <Route path="/dashboard" element={
                        <ProtectedRoute>
                            <FeatureErrorBoundary featureName="Dashboard">
                                <Dashboard />
                            </FeatureErrorBoundary>
                        </ProtectedRoute>
                    } />

                    {/* Loan Routes */}
                    <Route path="/loans/monitoring" element={
                        <ProtectedRoute>
                            <FeatureErrorBoundary featureName="Loan Monitoring">
                                <LoanMonitoring />
                            </FeatureErrorBoundary>
                        </ProtectedRoute>
                    } />
                    <Route path="/loans/create" element={
                        <ProtectedRoute>
                            <FeatureErrorBoundary featureName="Loan Creation">
                                <LoanCreation />
                            </FeatureErrorBoundary>
                        </ProtectedRoute>
                    } />
                    {/* /loans/queue — the reviewer's FIFO desk.
                        Gated to Recommender/Evaluator/Approver by the backend
                        endpoints; the frontend route only requires auth. */}
                    <Route path="/loans/queue" element={
                        <ProtectedRoute>
                            <FeatureErrorBoundary featureName="Review Desk">
                                <ReviewDesk />
                            </FeatureErrorBoundary>
                        </ProtectedRoute>
                    } />
                    {/* /loans/approval/:loanId is reachable by every workflow role
                        (Encoder / Recommender / Evaluator / Approver / Admin).
                        The frontend route only requires auth; the backend
                        `LoanWorkflowService.IsValidTransition` is the
                        authoritative gate — it checks both the loan's
                        current status AND the actor's role before letting
                        `PUT /api/loans/{id}/status` through. */}
                    <Route path="/loans/approval/:loanId" element={
                        <ProtectedRoute>
                            <FeatureErrorBoundary featureName="Loan Approval">
                                <LoanApproval />
                            </FeatureErrorBoundary>
                        </ProtectedRoute>
                    } />
                    <Route path="/loans/evaluation/:loanId" element={
                        <ProtectedRoute>
                            <FeatureErrorBoundary featureName="Loan Evaluation">
                                <LoanEvaluation />
                            </FeatureErrorBoundary>
                        </ProtectedRoute>
                    } />
                    <Route path="/notifications" element={
                        <ProtectedRoute>
                            <FeatureErrorBoundary featureName="Notifications">
                                <Notifications />
                            </FeatureErrorBoundary>
                        </ProtectedRoute>
                    } />
                    <Route path="/account" element={
                        <ProtectedRoute>
                            <FeatureErrorBoundary featureName="Account">
                                <Account />
                            </FeatureErrorBoundary>
                        </ProtectedRoute>
                    } />

                    {/* Admin Routes — guards mirror backend policies:
                        user list requires `user.view` (CanViewUsers). */}
                    <Route path="/admin/users" element={
                        <ProtectedRoute requiredPermission={PERMISSIONS.userView}>
                            <FeatureErrorBoundary featureName="User Management">
                                <UsersPage />
                            </FeatureErrorBoundary>
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/loan-products" element={
                        <ProtectedRoute requiredPermission={PERMISSIONS.loanProductView}>
                            <FeatureErrorBoundary featureName="Loan Products">
                                <LoanProductsPage />
                            </FeatureErrorBoundary>
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/audit-logs" element={
                        <ProtectedRoute requiredPermission={PERMISSIONS.auditLogsView}>
                            <FeatureErrorBoundary featureName="Audit Logs">
                                <AuditLogs />
                            </FeatureErrorBoundary>
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/workflow" element={
                        <ProtectedRoute requiredPermission={PERMISSIONS.workflowManage}>
                            <FeatureErrorBoundary featureName="Workflow Settings">
                                <WorkflowSettings />
                            </FeatureErrorBoundary>
                        </ProtectedRoute>
                    } />
                    {/* Catch-all redirect */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    )
}

export default App
