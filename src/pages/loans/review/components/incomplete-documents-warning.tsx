import { useMemo } from "react";
import { Warning } from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { Badge } from "@/src/components/ui/badge";
import type { DocumentChecklistItem } from "@/src/lib/api/loan-review";

interface Props {
    status: string;
    checklist: DocumentChecklistItem[] | undefined;
}

/**
 * Persistent (non-toast) warning: reviewers must see document state the moment
 * the file opens, including files that returned to Checking/Approval with a
 * history of push-backs. role="status" keeps it out of the toast aria stream.
 */
export function IncompleteDocumentsWarning({ status, checklist }: Props) {
    const unresolved = useMemo(
        () => (checklist ?? []).filter((i) => i.status === "Missing" || i.status === "Pending"),
        [checklist]
    );
    const parked = status === "ForIncompleteDocuments";
    if (!parked && unresolved.length === 0) return null;

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
                    ? "Incomplete documents — waiting on encoder"
                    : "Document requirements unresolved"}
            </AlertTitle>
            <AlertDescription className="space-y-2">
                <p>
                    {parked
                        ? "This application is parked in the Incomplete Documents queue. It returns to the Checking queue only after every requirement below is submitted and verified."
                        : "The following requirements are still open. Verify submission before forwarding to the next stage."}
                </p>
                <ul className="flex flex-wrap gap-1.5">
                    {unresolved.map((i) => (
                        <li key={i.code}>
                            <Badge variant="outline" className="font-normal">
                                {i.name} ·{" "}
                                <span className="text-amber-600 dark:text-amber-400">
                                    {i.status}
                                </span>
                            </Badge>
                        </li>
                    ))}
                    {parked && unresolved.length === 0 && (
                        <li className="text-sm">Awaiting completeness sync...</li>
                    )}
                </ul>
            </AlertDescription>
        </Alert>
    );
}
