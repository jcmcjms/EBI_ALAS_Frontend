/**
 * Re-exports from shared UI — kept as a thin barrel so existing
 * `import { … } from "./account-states"` paths don't break.
 */

export { EmptyState, ErrorState } from "@/src/components/ui/empty-state";

import { Spinner } from "@/src/components/ui/spinner";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
    return (
        <div
            role="status"
            className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"
        >
            <Spinner className="h-4 w-4" />
            <span>{label}</span>
        </div>
    );
}
