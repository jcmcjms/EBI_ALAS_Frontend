import { useNavigate } from "react-router-dom";
import { Button } from "@/src/components/ui/button";
import { ShieldSlash } from "@phosphor-icons/react";

/**
 * Dedicated 403 Forbidden page.
 *
 * Shown when a logged-in user attempts to access a resource they lack
 * permission for. In a banking environment this is also the right place
 * to log the unauthorized access attempt to your SIEM system.
 */
export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-destructive/10">
        <ShieldSlash className="size-10 text-destructive" weight="duotone" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Access Denied</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          You do not have permission to access this page. If you believe this
          is an error, please contact your system administrator.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
        <Button onClick={() => navigate("/dashboard", { replace: true })}>
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
