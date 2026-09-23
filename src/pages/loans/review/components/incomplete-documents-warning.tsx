import { Warning } from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import type { LoanChecklistDocumentDto } from "@/src/lib/api/loan-review";

const MAX_LISTED = 6;

interface Props {
    status: string;
    checklist: LoanChecklistDocumentDto[] | undefined;
    flagAction?: { actionByUserName: string; actionDate: string } | null;
}

/**
 * Application-level completeness: ANY pending requirement ⇒ incomplete file.
 * Shown parked (ForIncompleteDocuments) or whenever a reviewer has the file
 * with requirements still pending (e.g. returned to Checking mid-sync).
 */
export function IncompleteDocumentsWarning({ status, checklist, flagAction }: Props) {
    const pending = (checklist ?? []).filter((i) => i.uploadStatus !== "Uploaded");
    const parked = status === "ForIncompleteDocuments";
    if (!parked && pending.length === 0) return null;

    const listed = pending.slice(0, MAX_LISTED);
    return (
        <Alert
            variant="destructive"
            role="status"
            aria-live="polite"
            className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 [&_svg]:text-amber-600"
        >
            <Warning />
            <AlertTitle>
                {parked
                    ? `Incomplete documents — flagged by ${flagAction?.actionByUserName ?? "a reviewer"}${flagAction?.actionDate ? ` on ${new Date(flagAction.actionDate).toLocaleDateString()}` : ""} · waiting on encoder (WebLoan)`
                    : `Incomplete documents — ${pending.length} requirement(s) pending`}
            </AlertTitle>
            <AlertDescription className="space-y-1">
                <p>
                    {parked
                        ? "The file returns to the review desk automatically once every requirement verifies complete on the document server, or the evaluator may proceed to approval with justification."
                        : "A file with any pending requirement is incomplete. Verify uploads before forwarding to the next stage."}
                </p>
                {pending.length > 0 && (
                    <p className="text-xs">
                        {listed.map((p) => p.checklistDescription ?? p.idCode).join(" · ")}
                        {pending.length > MAX_LISTED && ` · +${pending.length - MAX_LISTED} more`}
                    </p>
                )}
            </AlertDescription>
        </Alert>
    );
}
