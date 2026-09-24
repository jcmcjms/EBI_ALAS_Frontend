import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Eye,
    DownloadSimple,
    CheckCircle,
    XCircle,
    ListChecks,
    ChatCenteredText,
    ArrowCounterClockwise,
} from "@phosphor-icons/react";

import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Spinner } from "@/src/components/ui/spinner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/src/components/ui/alert-dialog";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";

import {
    getChecklistDocuments,
    getDocumentRemarks,
    viewChecklistDocument,
    type LoanChecklistDocumentDto,
} from "@/src/features/loans/api/loan-review";
import { loanReviewKeys } from "@/src/features/loans/api/loan-review";
import { DocumentRemarksThread } from "./document-remarks-thread";
import { DocumentPreviewDialog } from "./document-preview-dialog";

const MIN_REMARKS = 10;

interface AttachmentsPanelProps {
    loanId: number;
    frozen: boolean;
    /** Reviewers + submitting encoder may write remarks (backend enforces). */
    canRemark: boolean;
    /** Evaluator (or Admin) while the file sits in ForChecking. Server re-checks turn ownership. */
    canPushBack: boolean;
    pushBackPending: boolean;
    onPushBack: (pendingCodes: string[], remarks: string) => void;
}

/**
 * Document requirements for the loan, synced from the document server
 * (WebLoan / BPB_BINARY_SERVER). Completeness is binary at application level:
 * ANY pending requirement means the file is incomplete. Documents are
 * uploaded/updated in WebLoan only — this panel is read + remarks + push-back.
 */
export function AttachmentsPanel({
    loanId,
    frozen,
    canRemark,
    canPushBack,
    pushBackPending,
    onPushBack,
}: AttachmentsPanelProps) {
    const [openThread, setOpenThread] = useState<string | null>(null);
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [pushBackOpen, setPushBackOpen] = useState(false);
    const [pushBackRemarks, setPushBackRemarks] = useState("");
    const [previewDoc, setPreviewDoc] = useState<{ docId: number; fileName: string; contentType: string } | null>(null);

    const checklistDocs = useQuery({
        queryKey: loanReviewKeys.checklistDocuments(loanId),
        queryFn: () => getChecklistDocuments(loanId),
    });
    // One remarks query for the whole file; sliced per requirement below.
    const remarksQuery = useQuery({
        queryKey: loanReviewKeys.documentRemarks(loanId),
        queryFn: () => getDocumentRemarks(loanId),
        staleTime: 15_000,
    });

    const items: LoanChecklistDocumentDto[] = checklistDocs.data ?? [];
    const pending = useMemo(() => items.filter((i) => i.uploadStatus !== "Uploaded"), [items]);
    const uploadedCount = items.length - pending.length;
    const selectedCodes = pending.filter((p) => selected[p.idCode]).map((p) => p.idCode);

    const remarksFor = (code: string) =>
        (remarksQuery.data ?? []).filter((r) => r.checklistIdCode === code);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <ListChecks size={18} className="text-primary" />
                <h3 className="text-sm font-semibold">Required Documents</h3>
                {items.length > 0 && (
                    <Badge variant="secondary" className="text-xs tabular-nums">
                        {uploadedCount}/{items.length} uploaded
                    </Badge>
                )}
                {pending.length > 0 && (
                    <Badge variant="outline" className="text-xs text-destructive">
                        Incomplete
                    </Badge>
                )}
            </div>

            {checklistDocs.isLoading && <Spinner className="size-5" />}
            {checklistDocs.isError && (
                <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                    Failed to load checklist documents. Please try again.
                </p>
            )}
            {!checklistDocs.isLoading && items.length === 0 && (
                <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                    No checklist items found for this loan product.
                </p>
            )}

            {items.length > 0 && (
                <ul className="space-y-2">
                    {items.map((item, index) => {
                        const isPending = item.uploadStatus !== "Uploaded";
                        const threadOpen = openThread === item.idCode;
                        const remarkCount = remarksFor(item.idCode).length;
                        return (
                            <li key={`${item.idCode}-${item.docId ?? index}`} className="rounded-md border bg-background">
                                <div className="flex items-start gap-3 p-3">
                                    {canPushBack && isPending && (
                                        <input
                                            type="checkbox"
                                            className="mt-1 size-4 accent-primary"
                                            aria-label={`Select ${item.checklistDescription ?? item.idCode} as missing`}
                                            checked={!!selected[item.idCode]}
                                            onChange={(e) =>
                                                setSelected((s) => ({ ...s, [item.idCode]: e.target.checked }))
                                            }
                                        />
                                    )}
                                    {isPending ? (
                                        <XCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-muted-foreground" />
                                    ) : (
                                        <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-emerald-500" />
                                    )}
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <p className="text-sm font-medium">
                                            {item.checklistDescription ?? item.idCode}
                                        </p>
                                        {!isPending && item.docId && (
                                            <p className="text-xs text-muted-foreground">
                                                {item.docStr && <>Document: {item.docStr} &bull; </>}
                                                {item.contentType && <>{item.contentType} &bull; </>}
                                                {item.uploadedBy && `Uploaded by ${item.uploadedBy}`}
                                                {item.created && ` on ${new Date(item.created).toLocaleDateString()}`}
                                            </p>
                                        )}
                                        {isPending && (
                                            <p className="text-xs italic text-muted-foreground">No documents uploaded yet</p>
                                        )}
                                    </div>
                                    {!isPending && item.docId && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="shrink-0 gap-1.5"
                                                onClick={() =>
                                                    setPreviewDoc({
                                                        docId: item.docId!,
                                                        fileName: item.docStr ?? `document-${item.docId}`,
                                                        contentType: item.contentType ?? "application/octet-stream",
                                                    })
                                                }
                                            >
                                                <Eye size={14} weight="bold" /> View
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="shrink-0 gap-1.5"
                                                onClick={() => viewChecklistDocument(item.docId!, item.docStr ?? `document-${item.docId}`)}
                                            >
                                                <DownloadSimple size={14} weight="bold" /> Download
                                            </Button>
                                        </>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="shrink-0 gap-1.5"
                                        aria-expanded={threadOpen}
                                        onClick={() => setOpenThread((t) => (t === item.idCode ? null : item.idCode))}
                                    >
                                        <ChatCenteredText size={14} weight="bold" />
                                        Remarks ({remarkCount})
                                    </Button>
                                    <Badge variant={isPending ? "outline" : "default"} className="shrink-0 text-[10px]">
                                        {isPending ? "Pending" : "Uploaded"}
                                    </Badge>
                                </div>
                                {threadOpen && (
                                    <div className="border-t bg-muted/30 p-3">
                                        <DocumentRemarksThread
                                            loanId={loanId}
                                            checklistIdCode={item.idCode}
                                            docId={item.docId ?? null}
                                            remarks={remarksFor(item.idCode)}
                                            canWrite={canRemark}
                                            frozen={frozen}
                                        />
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            {canPushBack && !frozen && pending.length > 0 && (
                <div className="flex items-center justify-between gap-3 border-t pt-3">
                    <p className="text-[11px] text-muted-foreground">
                        {selectedCodes.length === 0
                            ? "Select the pending requirements to push this file back for documents."
                            : `${selectedCodes.length} requirement(s) selected.`}
                    </p>
                    <AlertDialog open={pushBackOpen} onOpenChange={setPushBackOpen}>
                        <AlertDialogTrigger
                            render={
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
                                    disabled={selectedCodes.length === 0 || pushBackPending}
                                />
                            }
                        >
                            <ArrowCounterClockwise size={14} weight="bold" />
                            Push back incomplete
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Push back for incomplete documents?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    The file moves to the <strong>Incomplete Documents queue</strong> (encoder&apos;s desk).
                                    The encoder updates the documents in WebLoan; the file returns to the Checking
                                    queue automatically once every requirement verifies complete.
                                    <ul className="mt-2 list-disc pl-4 text-left">
                                        {pending.map((p) => (
                                            <li key={p.idCode}>
                                                {p.checklistDescription ?? p.idCode}
                                                {!selected[p.idCode] && <em className="text-muted-foreground"> (not selected)</em>}
                                            </li>
                                        ))}
                                    </ul>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2">
                                <Label htmlFor="pushback-remarks">Remarks *</Label>
                                <Textarea
                                    id="pushback-remarks"
                                    rows={3}
                                    maxLength={2000}
                                    placeholder="What is missing / what the encoder must update in WebLoan…"
                                    value={pushBackRemarks}
                                    onChange={(e) => setPushBackRemarks(e.target.value)}
                                />
                                <p className="text-[11px] tabular-nums text-muted-foreground">
                                    {pushBackRemarks.trim().length}/2000 — minimum {MIN_REMARKS}
                                </p>
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Keep reviewing</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground"
                                    disabled={pushBackRemarks.trim().length < MIN_REMARKS || pushBackPending}
                                    onClick={() => {
                                        onPushBack(selectedCodes, pushBackRemarks.trim());
                                        setPushBackOpen(false);
                                        setPushBackRemarks("");
                                        setSelected({});
                                    }}
                                >
                                    {pushBackPending ? "Pushing back…" : "Confirm push-back"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}

            <DocumentPreviewDialog
                open={previewDoc !== null}
                onClose={() => setPreviewDoc(null)}
                doc={previewDoc}
            />
        </div>
    );
}
