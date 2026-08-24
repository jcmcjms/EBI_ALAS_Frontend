
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";

const Login = lazy(() => import("./pages/auth/login"));

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
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
