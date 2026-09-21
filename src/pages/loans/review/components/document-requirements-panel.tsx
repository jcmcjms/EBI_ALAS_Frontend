import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Textarea } from "@/src/components/ui/textarea";
import { Separator } from "@/src/components/ui/separator";
import { toastSuccess, toastError } from "@/src/components/ui/toast";
import { cn } from "@/src/lib/utils";
import { useAuthStore } from "@/src/store/authStore";
import { useDocumentRemarks } from "@/src/hooks/use-document-remarks";
import { updateLoanStatus } from "@/src/lib/api/loans";
import { DocumentRemarksThread } from "../../approval/components/document-remarks-thread";
import type { DocumentChecklistItem, DocumentRemarkDto } from "@/src/lib/api/loan-review";

const STATUS_STYLE: Record<string, string> = {
    Missing: "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400",
    Pending: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    Submitted: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
    Verified: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
};

interface Props {
    loanId: number;
    lamId: string;
    status: string;
    checklist: DocumentChecklistItem[] | undefined;
    isHeadOwner: boolean;
}

export function DocumentRequirementsPanel({
    loanId,
    lamId,
    status,
    checklist,
    isHeadOwner,
}: Props) {
    const user = useAuthStore((s) => s.user);
    const qc = useQueryClient();
    const remarks = useDocumentRemarks(loanId);
    const [openThread, setOpenThread] = useState<string | null>(null);
    const [selected, setSelected] = useState<Record<string, boolean>>({});

    const isEvaluator = user?.role === "Evaluator" || user?.role === "Admin";
    const isEncoder = user?.role === "Encoder" || user?.role === "Admin";
    const inChecking = status === "ForChecking";
    const parked = status === "ForIncompleteDocuments";

    const pushBack = useMutation({
        mutationFn: (codes: string[]) =>
            updateLoanStatus(loanId, {
                status: "ForIncompleteDocuments",
                comments: `Documents incomplete: ${codes.join(", ")}`,
                missingRequirementCodes: codes,
            }),
        onSuccess: () => {
            toastSuccess("Pushed back to Incomplete Documents queue", {
                description: lamId,
            });
            qc.invalidateQueries();
        },
        onError: (e) => toastError("Push-back failed", { description: String(e) }),
    });

    const submitComplete = useMutation({
        mutationFn: (codes: string[]) =>
            updateLoanStatus(loanId, {
                status: "ForChecking",
                comments: "Documents updated and complete.",
                submittedRequirementCodes: codes,
            }),
        onSuccess: () => {
            toastSuccess("Returned to Checking queue", { description: lamId });
            qc.invalidateQueries();
        },
        onError: (e) =>
            toastError("Server rejected completion", { description: String(e) }),
    });

    const groupedRemarks = useMemo(() => {
        const map = new Map<string, DocumentRemarkDto[]>();
        for (const r of remarks.data ?? []) {
            const list = map.get(r.checklistIdCode) ?? [];
            list.push(r);
            map.set(r.checklistIdCode, list);
        }
        return map;
    }, [remarks.data]);

    const missingSelected = (checklist ?? []).filter((i) => selected[i.code]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl">Document Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {(checklist ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        No document requirements recorded for this file.
                    </p>
                )}
                <ul className="divide-y rounded-md border">
                    {(checklist ?? []).map((item) => (
                        <li key={item.code} className="p-3">
                            <div className="flex items-center gap-3">
                                {isEvaluator && inChecking && isHeadOwner && (
                                    <input
                                        type="checkbox"
                                        aria-label={`Select ${item.name} as missing`}
                                        checked={!!selected[item.code]}
                                        onChange={(e) =>
                                            setSelected((s) => ({
                                                ...s,
                                                [item.code]: e.target.checked,
                                            }))
                                        }
                                        className="size-4 accent-primary"
                                    />
                                )}
                                {isEncoder && parked && (
                                    <input
                                        type="checkbox"
                                        aria-label={`Mark ${item.name} submitted`}
                                        checked={!!selected[item.code]}
                                        onChange={(e) =>
                                            setSelected((s) => ({
                                                ...s,
                                                [item.code]: e.target.checked,
                                            }))
                                        }
                                        className="size-4 accent-primary"
                                    />
                                )}
                                <span className="flex-1 text-sm font-medium">
                                    {item.name}
                                </span>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "font-normal",
                                        STATUS_STYLE[item.status]
                                    )}
                                >
                                    {item.status}
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    aria-expanded={openThread === item.code}
                                    onClick={() =>
                                        setOpenThread((t) =>
                                            t === item.code ? null : item.code
                                        )
                                    }
                                >
                                    Remarks (
                                    {(groupedRemarks.get(item.code) ?? []).length})
                                </Button>
                            </div>
                            {openThread === item.code && (
                                <div className="mt-3">
                                    <DocumentRemarksThread
                                        loanId={loanId}
                                        checklistIdCode={item.code}
                                        docId={item.docId}
                                        remarks={
                                            groupedRemarks.get(item.code) ?? []
                                        }
                                        canWrite={
                                            isEvaluator ||
                                            isEncoder ||
                                            user?.role === "Recommender" ||
                                            user?.role === "Approver"
                                        }
                                        frozen={
                                            status === "Approved" ||
                                            status === "Rejected" ||
                                            status === "Cancelled"
                                        }
                                    />
                                </div>
                            )}
                        </li>
                    ))}
                </ul>

                {isEvaluator && inChecking && isHeadOwner && (
                    <Button
                        variant="outline"
                        className="text-amber-600 dark:text-amber-400"
                        disabled={missingSelected.length === 0 || pushBack.isPending}
                        onClick={() =>
                            pushBack.mutate(missingSelected.map((i) => i.code))
                        }
                    >
                        {pushBack.isPending
                            ? "Pushing back..."
                            : `Push back incomplete (${missingSelected.length})`}
                    </Button>
                )}
                {isEncoder && parked && (
                    <Button
                        disabled={
                            Object.values(selected).filter(Boolean).length === 0 ||
                            submitComplete.isPending
                        }
                        onClick={() =>
                            submitComplete.mutate(
                                (checklist ?? [])
                                    .filter((i) => selected[i.code])
                                    .map((i) => i.code)
                            )
                        }
                    >
                        {submitComplete.isPending
                            ? "Submitting..."
                            : "Submit documents & return to Checking"}
                    </Button>
                )}
                <p className="text-xs text-muted-foreground">
                    Requirements update through remarks between encoder and evaluator.
                    The file re-enters the Checking queue tail once all requirements
                    verify complete.
                </p>
            </CardContent>
        </Card>
    );
}
