import { type ReactNode } from "react";
import { useAuthInit } from "@/src/hooks/useAuthInit";
import { Spinner } from "@/src/components/ui/spinner";
import { useAuthStore } from "@/src/store/authStore";

interface AuthInitProviderProps {
  children: ReactNode;
}

/**
 * Wraps the application and shows a full-screen loading spinner while
 * the silent refresh-token flow restores the user session on initial
 * page load. This prevents a flash of the login page for authenticated
 * users who refresh the browser.
 *
 * The spinner is shown exactly once per page load — after the refresh
 * endpoint responds (success or failure), `isInitializing` becomes
 * false and the real app renders.
 *
 * `isInitializing` is read from the auth store (not from the hook) so
 * it stays consistent with what `ProtectedRoute` sees.
 */
export function AuthInitProvider({ children }: AuthInitProviderProps) {
  // Kick off the bootstrap. The hook publishes its progress into the store.
  useAuthInit();

  const isInitializing = useAuthStore((state) => state.isInitializing);

  if (isInitializing) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Spinner className="size-10" />
        <p className="text-sm text-muted-foreground">Restoring session...</p>
      </div>
    );
  }

  return <>{children}</>;
}