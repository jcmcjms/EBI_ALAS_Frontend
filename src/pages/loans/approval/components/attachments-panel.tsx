import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    DownloadSimple,
    Eye,
    CheckCircle,
    XCircle,
    ListChecks,
    ChatCenteredText,
} from "@phosphor-icons/react";

import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Spinner } from "@/src/components/ui/spinner";

import {
    getChecklistDocuments,
    getDocumentRemarks,
    loanReviewKeys,
    downloadChecklistDocument,
    canWriteDocumentRemarks,
    type LoanChecklistDocumentDto,
    type DocumentRemarkDto,
} from "@/src/lib/api/loan-review";

import { DocumentPreviewDialog } from "./document-preview-dialog";
import { DocumentRemarksThread } from "./document-remarks-thread";

/**
 * Required-documents checklist for the loan product, sourced from the
 * document server (BPB_BINARY_SERVER). This is the single source of truth
 * for supporting documents — the former local "Additional Attachments"
 * upload was removed so reviewers and the document server never disagree
 * about what is in the file.
 */
export function AttachmentsPanel({
    loanId,
    role,
    frozen,
    isLoanOwner,
}: {
    loanId: number;
    role?: string;
    frozen: boolean;
    /** True when the signed-in user submitted this application (Encoder write scope). */
    isLoanOwner: boolean;
}) {
    const [preview, setPreview] = useState<{
        docId: number;
        fileName: string;
        contentType: string;
    } | null>(null);
    const [openThreads, setOpenThreads] = useState<Set<string>>(new Set());

    const checklistDocs = useQuery({
        queryKey: loanReviewKeys.checklistDocuments(loanId),
        queryFn: () => getChecklistDocuments(loanId),
    });

    const remarksQuery = useQuery({
        queryKey: loanReviewKeys.documentRemarks(loanId),
        queryFn: () => getDocumentRemarks(loanId),
        staleTime: 30_000,
    });

    const remarksByIdCode = useMemo(() => {
        const map = new Map<string, DocumentRemarkDto[]>();
        for (const r of remarksQuery.data ?? []) {
            const list = map.get(r.checklistIdCode);
            if (list) list.push(r);
            else map.set(r.checklistIdCode, [r]);
        }
        return map;
    }, [remarksQuery.data]);

    const canWriteRemarks = canWriteDocumentRemarks(role, isLoanOwner);

    const toggleThread = (code: string) =>
        setOpenThreads((prev) => {
            const next = new Set(prev);
            next.has(code) ? next.delete(code) : next.add(code);
            return next;
        });

    const checklistItems: LoanChecklistDocumentDto[] = checklistDocs.data ?? [];
    const uploadedCount = checklistItems.filter(
        (item) => item.uploadStatus === "Uploaded",
    ).length;

    return (
        <>
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <ListChecks size={18} className="text-primary" />
                    <h3 className="text-sm font-semibold">Required Documents</h3>
                    {checklistItems.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {uploadedCount}/{checklistItems.length} uploaded
                        </Badge>
                    )}
                </div>

                {checklistDocs.isLoading && <Spinner className="size-5" />}

                {checklistDocs.isError && (
                    <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                        Failed to load checklist documents. Please try again.
                    </p>
                )}

                {!checklistDocs.isLoading && checklistItems.length === 0 && (
                    <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                        No checklist items found for this loan product.
                    </p>
                )}

                {checklistItems.length > 0 && (
                    <ul className="space-y-2">
                        {checklistItems.map((item) => (
                            <li
                                key={item.idCode}
                                className="flex-col rounded-md border bg-background p-3"
                            >
                                <div className="flex items-start gap-3">
                                    {item.uploadStatus === "Uploaded" ? (
                                        <CheckCircle
                                            size={20}
                                            weight="fill"
                                            className="mt-0.5 shrink-0 text-emerald-500"
                                        />
                                    ) : (
                                        <XCircle
                                            size={20}
                                            weight="fill"
                                            className="mt-0.5 shrink-0 text-muted-foreground"
                                        />
                                    )}

                                    <div className="min-w-0 flex-1 space-y-1">
                                        <p className="text-sm font-medium">
                                            {item.checklistDescription ?? item.idCode}
                                        </p>

                                        {item.uploadStatus === "Uploaded" && item.docId && (
                                            <div className="space-y-0.5">
                                                {item.docStr && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Document: {item.docStr}
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    {item.contentType && `${item.contentType} • `}
                                                    {item.uploadedBy && `Uploaded by ${item.uploadedBy}`}
                                                    {item.created &&
                                                        ` on ${new Date(item.created).toLocaleDateString()}`}
                                                </p>
                                            </div>
                                        )}

                                        {item.uploadStatus !== "Uploaded" && (
                                            <p className="text-xs italic text-muted-foreground">
                                                No documents uploaded yet
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex shrink-0 items-center gap-1">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="shrink-0 gap-1.5"
                                            aria-expanded={openThreads.has(item.idCode)}
                                            aria-controls={`doc-remarks-${item.idCode}`}
                                            onClick={() => toggleThread(item.idCode)}
                                        >
                                            <ChatCenteredText
                                                size={14}
                                                weight={
                                                    openThreads.has(item.idCode)
                                                        ? "fill"
                                                        : "regular"
                                                }
                                            />
                                            Remarks
                                            {(remarksByIdCode.get(item.idCode)?.length ?? 0) >
                                                0 && (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px]"
                                                >
                                                    {
                                                        remarksByIdCode.get(item.idCode)!
                                                            .length
                                                    }
                                                </Badge>
                                            )}
                                        </Button>

                                        {item.uploadStatus === "Uploaded" && item.docId && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-1.5"
                                                    onClick={() =>
                                                        setPreview({
                                                            docId: item.docId!,
                                                            fileName:
                                                                item.docStr ??
                                                                `document-${item.docId}`,
                                                            contentType:
                                                                item.contentType ??
                                                                "application/octet-stream",
                                                        })
                                                    }
                                                >
                                                    <Eye size={14} weight="bold" />{" "}
                                                    View
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    aria-label={`Download ${item.checklistDescription ?? item.docStr}`}
                                                    title="Download"
                                                    onClick={() =>
                                                        void downloadChecklistDocument(
                                                            item.docId!,
                                                            item.docStr ??
                                                                `document-${item.docId}`,
                                                        )
                                                    }
                                                >
                                                    <DownloadSimple size={15} />
                                                </Button>
                                            </>
                                        )}
                                    </div>

                                    <Badge
                                        variant={
                                            item.uploadStatus === "Uploaded"
                                                ? "default"
                                                : "outline"
                                        }
                                        className="shrink-0 text-[10px]"
                                    >
                                        {item.uploadStatus === "Uploaded"
                                            ? "Uploaded"
                                            : "Pending"}
                                    </Badge>
                                </div>

                                {/* Collapsible remarks thread */}
                                {openThreads.has(item.idCode) && (
                                    <div
                                        id={`doc-remarks-${item.idCode}`}
                                        role="region"
                                        aria-label={`Remarks for ${item.checklistDescription ?? item.idCode}`}
                                        className="mt-2 space-y-2 rounded-md border bg-muted/30 p-3"
                                    >
                                        <DocumentRemarksThread
                                            loanId={loanId}
                                            checklistIdCode={item.idCode}
                                            docId={item.docId ?? null}
                                            remarks={
                                                remarksByIdCode.get(item.idCode) ??
                                                []
                                            }
                                            canWrite={canWriteRemarks}
                                            frozen={frozen}
                                        />
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <DocumentPreviewDialog
                open={preview !== null}
                onClose={() => setPreview(null)}
                doc={preview}
            />
        </>
    );
}
