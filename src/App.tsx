import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Spinner } from "@/src/components/ui/spinner";
import { ProtectedRoute } from "@/src/components/auth/ProtectedRoute";
import { PERMISSIONS } from "@/src/lib/api/types";

const Login = lazy(() => import("./pages/auth/login"));
const ChangePassword = lazy(() => import("./pages/auth/change-password"));
const Dashboard = lazy(() => import("./pages/dashboard").then(m => ({ default: m.Dashboard })));
const UsersPage = lazy(() => import("./pages/admin/users/index").then(m => ({ default: m.UsersPage })));
const RolesPage = lazy(() => import("./pages/admin/roles/index").then(m => ({ default: m.RolesPage })));
const LoanProductsPage = lazy(() => import("./pages/admin/loan-products/index").then(m => ({ default: m.LoanProductsIndex })));
const LoanCreation = lazy(() => import("./pages/loans/create/index"));
const LoanMonitoring = lazy(() => import("./pages/loans/monitoring/index"));
const LoanApproval = lazy(() => import("./pages/loans/approval/index"));
const AuditLogs = lazy(() => import("./pages/audit-logs/index").then(m => ({ default: m.default })));
const Notifications = lazy(() => import("./pages/notifications/index"));
const Account = lazy(() => import("./pages/account/index"));
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
                            <Dashboard />
                        </ProtectedRoute>
                    } />

                    {/* Loan Routes */}
                    <Route path="/loans/monitoring" element={
                        <ProtectedRoute>
                            <LoanMonitoring />
                        </ProtectedRoute>
                    } />
                    <Route path="/loans/create" element={
                        <ProtectedRoute>
                            <LoanCreation />
                        </ProtectedRoute>
                    } />
                    <Route path="/loans/approval" element={
                        <ProtectedRoute requiredPermission={PERMISSIONS.loansApprove}>
                            <LoanApproval />
                        </ProtectedRoute>
                    } />
                    <Route path="/notifications" element={
                        <ProtectedRoute>
                            <Notifications />
                        </ProtectedRoute>
                    } />
                    <Route path="/account" element={
                        <ProtectedRoute>
                            <Account />
                        </ProtectedRoute>
                    } />

                    {/* Admin Routes — guards mirror backend policies:
                        user list requires `user.view` (CanViewUsers),
                        role matrix requires `role.view` (CanViewRoles),
                        loan products requires `loan_product.manage` (CanManageLoanProducts). */}
                    <Route path="/admin/users" element={
                        <ProtectedRoute requiredPermission={PERMISSIONS.userView}>
                            <UsersPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/roles" element={
                        <ProtectedRoute requiredPermission={PERMISSIONS.roleView}>
                            <RolesPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/loan-products" element={
                        <ProtectedRoute requiredPermission={PERMISSIONS.loanProductManage}>
                            <LoanProductsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/audit-logs" element={
                        <ProtectedRoute requiredPermission={PERMISSIONS.auditLogsView}>
                            <AuditLogs />
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
