import { Warning } from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import type { LoanChecklistDocumentDto } from "@/src/features/loans/api/loan-review";

const MAX_LISTED = 6;

interface DocumentFlag {
    flaggedAt: string;
    flaggedById: number | null;
    reason: string | null;
    missingCount: number;
}

interface Props {
    status: string;
    checklist: LoanChecklistDocumentDto[] | undefined;
    documentFlag?: DocumentFlag | null;
}

/**
 * Application-level completeness: ANY pending requirement ⇒ incomplete file.
 * Shown when a reviewer has flagged the file with missing documents.
 * The flag is a data fact, not a routing status — the file stays at its desk.
 */
export function IncompleteDocumentsWarning({ status, checklist, documentFlag }: Props) {
    const pending = (checklist ?? []).filter((i) => i.uploadStatus !== "Uploaded");
    const hasFlag = documentFlag != null;
    if (!hasFlag && pending.length === 0) return null;

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
                {hasFlag
                    ? `Documents flagged — ${documentFlag.missingCount} requirement(s) missing`
                    : `Incomplete documents — ${pending.length} requirement(s) pending`}
            </AlertTitle>
            <AlertDescription className="space-y-1">
                {hasFlag && (
                    <p>
                        Flagged on {new Date(documentFlag.flaggedAt).toLocaleDateString()}.
                        {documentFlag.reason ? ` Reason: ${documentFlag.reason}` : ""}
                        {" "}The workflow is not blocked. The flag clears automatically once every
                        requirement verifies complete on the document server.
                    </p>
                )}
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
