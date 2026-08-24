import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const Login = lazy(() => import("./pages/auth/login"));
const Dashboard = lazy(() => import("./pages/dashboard").then(m => ({ default: m.Dashboard })));
const UsersPage = lazy(() => import("./pages/admin/users/index").then(m => ({ default: m.UsersPage })));
const RolesPage = lazy(() => import("./pages/admin/roles/index").then(m => ({ default: m.RolesPage })));

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

                    {/* Protected Routes */}
                    <Route path="/dashboard" element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    } />

                    {/* Admin Routes */}
                    <Route path="/admin/users" element={
                        <ProtectedRoute requiredPermission="user.create">
                            <UsersPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/roles" element={
                        <ProtectedRoute requiredPermission="role.manage">
                            <RolesPage />
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
