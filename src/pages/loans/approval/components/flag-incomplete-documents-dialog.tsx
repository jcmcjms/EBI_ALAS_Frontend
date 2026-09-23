import { useEffect, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";

import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import { Checkbox } from "@/src/components/ui/checkbox";
import type { LoanChecklistDocumentDto } from "@/src/lib/api/loan-review";

interface FlagIncompleteDocumentsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Checklist rows from useDocumentChecklist(loanId). */
    items: LoanChecklistDocumentDto[];
    isSubmitting: boolean;
    onSubmit: (payload: { missingRequirementCodes: string[]; comments: string }) => void;
}

/**
 * Reviewer-initiated flag for missing documents.
 * Pre-selects items the document server already knows are missing —
 * the reviewer confirms/adjusts instead of retyping.
 */
export function FlagIncompleteDocumentsDialog({
    open,
    onOpenChange,
    items,
    isSubmitting,
    onSubmit,
}: FlagIncompleteDocumentsDialogProps) {
    const [selected, setSelected] = useState<string[]>([]);
    const [comments, setComments] = useState("");
    const [attempted, setAttempted] = useState(false);

    // Pre-select whatever the document server already knows is missing.
    useEffect(() => {
        if (open) {
            setSelected(items.filter((i) => i.uploadStatus !== "Uploaded").map((i) => i.idCode));
            setComments("");
            setAttempted(false);
        }
    }, [open, items]);

    const codesError = selected.length === 0 ? "Select at least one missing requirement." : undefined;
    const commentsError = comments.trim().length < 5 ? "Explain what the borrower must submit (min 5 characters)." : undefined;

    const handleConfirm = () => {
        setAttempted(true);
        if (codesError || commentsError) return;
        onSubmit({ missingRequirementCodes: selected, comments: comments.trim() });
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-lg">
                <AlertDialogHeader>
                    <AlertDialogTitle className="gap-2">
                        <WarningCircle size={18} weight="fill" className="text-amber-600" />
                        Flag as lacking documents
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        The file moves to the Incomplete Documents queue and the encoder is
                        notified. It returns to your desk automatically once every selected
                        requirement verifies complete on the document server — or you can
                        proceed to approval at any time.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-3">
                    <div
                        role="group"
                        aria-label="Missing requirements"
                        className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3"
                    >
                        {items.map((item) => (
                            <label
                                key={item.idCode}
                                className="flex cursor-pointer items-start gap-2 text-sm"
                            >
                                <Checkbox
                                    checked={selected.includes(item.idCode)}
                                    onCheckedChange={(c) =>
                                        setSelected((prev) =>
                                            c
                                                ? [...prev, item.idCode]
                                                : prev.filter((x) => x !== item.idCode)
                                        )
                                    }
                                />
                                <span>
                                    {item.checklistDescription ?? item.idCode}{" "}
                                    <span className="text-xs text-muted-foreground">
                                        ({item.idCode})
                                    </span>
                                    {item.uploadStatus !== "Uploaded" && (
                                        <Badge variant="secondary" className="ml-2 text-[10px]">
                                            not uploaded
                                        </Badge>
                                    )}
                                </span>
                            </label>
                        ))}
                    </div>
                    {attempted && codesError && (
                        <p role="alert" className="text-xs font-medium text-destructive">
                            {codesError}
                        </p>
                    )}

                    <Label htmlFor="flag-reason">Reason sent to the encoder</Label>
                    <Textarea
                        id="flag-reason"
                        rows={3}
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        placeholder="e.g. Payslip is unreadable and the COE lacks the compensation clause…"
                        aria-invalid={!!(attempted && commentsError)}
                    />
                    {attempted && commentsError && (
                        <p role="alert" className="text-xs font-medium text-destructive">
                            {commentsError}
                        </p>
                    )}
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <Button
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        className="gap-2"
                    >
                        <WarningCircle size={16} weight="bold" />
                        {isSubmitting ? "Flagging…" : "Flag file"}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
