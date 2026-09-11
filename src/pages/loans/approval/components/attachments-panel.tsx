import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Paperclip,
    UploadSimple,
    DownloadSimple,
    Trash,
    FilePdf,
    FileDoc,
    FileXls,
    FileImage,
    CheckCircle,
    XCircle,
    ListChecks,
} from "@phosphor-icons/react";
import { toast } from "sonner";

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

import { useAuthStore } from "@/src/store/authStore";
import {
    deleteLoanAttachment,
    downloadLoanAttachment,
    getChecklistDocuments,
    getLoanAttachments,
    loanReviewKeys,
    uploadLoanAttachment,
    viewChecklistDocument,
    type LoanAttachmentDto,
    type LoanChecklistDocumentDto,
} from "@/src/lib/api/loan-review";

const MAX_MB = 10;

function iconFor(name: string) {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "pdf")
        return <FilePdf size={18} weight="fill" className="text-red-500" />;
    if (ext === "doc" || ext === "docx")
        return <FileDoc size={18} weight="fill" className="text-blue-500" />;
    if (ext === "xls" || ext === "xlsx")
        return (
            <FileXls size={18} weight="fill" className="text-emerald-600" />
        );
    if (ext === "png" || ext === "jpg" || ext === "jpeg")
        return (
            <FileImage size={18} weight="fill" className="text-violet-500" />
        );
    return <Paperclip size={18} className="text-muted-foreground" />;
}

function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsPanel({
    loanId,
    frozen,
    canUpload,
}: {
    loanId: number;
    frozen: boolean;
    canUpload: boolean;
}) {
    const qc = useQueryClient();
    const inputRef = useRef<HTMLInputElement>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const userId = useAuthStore((s) => s.user?.userId);
    const role = useAuthStore((s) => s.user?.role);

    // Query for checklist documents from BPB_BINARY_SERVER
    const checklistDocs = useQuery({
        queryKey: loanReviewKeys.checklistDocuments(loanId),
        queryFn: () => getChecklistDocuments(loanId),
    });

    const attachments = useQuery({
        queryKey: loanReviewKeys.attachments(loanId),
        queryFn: () => getLoanAttachments(loanId),
    });

    const upload = useMutation({
        mutationFn: (file: File) =>
            uploadLoanAttachment(loanId, file, null, setProgress),
        onMutate: () => setProgress(0),
        onSuccess: (_, file) => {
            toast.success(`"${file.name}" uploaded.`);
            qc.invalidateQueries({
                queryKey: loanReviewKeys.attachments(loanId),
            });
        },
        onError: (e: Error) => toast.error(e.message),
        onSettled: () => setProgress(null),
    });

    const remove = useMutation({
        mutationFn: deleteLoanAttachment,
        onSuccess: () => {
            toast.success("File deleted.");
            qc.invalidateQueries({
                queryKey: loanReviewKeys.attachments(loanId),
            });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const pickFiles = (files: FileList | null) => {
        if (!files) return;
        for (const file of Array.from(files)) {
            if (file.size > MAX_MB * 1024 * 1024) {
                toast.error(`"${file.name}" exceeds ${MAX_MB} MB.`);
                continue;
            }
            upload.mutate(file);
        }
        if (inputRef.current) inputRef.current.value = "";
    };

    const rows: LoanAttachmentDto[] = attachments.data ?? [];
    const checklistItems: LoanChecklistDocumentDto[] = checklistDocs.data ?? [];

    // Count uploaded checklist items
    const uploadedCount = checklistItems.filter(
        (item) => item.uploadStatus === "Uploaded"
    ).length;

    return (
        <div className="space-y-6">
            {/* ── Checklist Documents Section (from BPB_BINARY_SERVER) ── */}
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
                                className="flex items-start gap-3 rounded-md border bg-background p-3"
                            >
                                {/* Status Icon */}
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
                                    {/* Checklist Description */}
                                    <p className="text-sm font-medium">
                                        {item.checklistDescription ?? item.idCode}
                                    </p>

                                    {/* Document Details (if uploaded) */}
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

                                    {/* Not uploaded message */}
                                    {item.uploadStatus !== "Uploaded" && (
                                        <p className="text-xs italic text-muted-foreground">
                                            No documents uploaded yet
                                        </p>
                                    )}
                                </div>

                                {/* View Button for uploaded documents */}
                                {item.uploadStatus === "Uploaded" && item.docId && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="shrink-0 gap-1.5"
                                        onClick={() =>
                                            viewChecklistDocument(
                                                item.docId!,
                                                item.docStr ?? `document-${item.docId}`
                                            )
                                        }
                                    >
                                        <DownloadSimple size={14} weight="bold" /> View
                                    </Button>
                                )}

                                {/* Status Badge */}
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
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* ── Divider ── */}
            <div className="border-t" />

            {/* ── Additional Attachments Section (local files) ── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Paperclip size={18} className="text-muted-foreground" />
                        <h3 className="text-sm font-semibold">Additional Attachments</h3>
                        <Badge variant="secondary" className="text-xs">
                            {rows.length} file{rows.length === 1 ? "" : "s"}
                        </Badge>
                    </div>
                    {canUpload && !frozen && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => inputRef.current?.click()}
                            disabled={upload.isPending}
                        >
                            <UploadSimple size={14} weight="bold" /> Upload
                        </Button>
                    )}
                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        hidden
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                        onChange={(e) => pickFiles(e.target.files)}
                    />
                </div>

                <p className="text-xs text-muted-foreground">
                    Supporting documents submitted with this application.
                </p>

                {progress !== null && (
                    <div className="space-y-1" aria-live="polite">
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Uploading… {progress}%
                        </p>
                    </div>
                )}

                {attachments.isLoading && <Spinner className="size-5" />}
                {!attachments.isLoading && rows.length === 0 && (
                    <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                        No additional files attached yet.
                    </p>
                )}

                <ul className="space-y-2">
                    {rows.map((a) => (
                        <li
                            key={a.id}
                            className="flex items-center gap-3 rounded-md border bg-background p-2.5"
                        >
                            {iconFor(a.fileName)}
                            <div className="min-w-0 flex-1">
                                <p
                                    className="truncate text-sm font-medium"
                                    title={a.fileName}
                                >
                                    {a.fileName}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    {formatSize(a.sizeBytes)} • {a.uploadedByName} •{" "}
                                    {new Date(a.uploadedAt).toLocaleString()}
                                </p>
                            </div>
                            {a.category && (
                                <Badge
                                    variant="secondary"
                                    className="text-[10px]"
                                >
                                    {a.category}
                                </Badge>
                            )}
                            <Button
                                size="icon"
                                variant="ghost"
                                aria-label={`Download ${a.fileName}`}
                                onClick={() =>
                                    downloadLoanAttachment(a.id, a.fileName)
                                }
                            >
                                <DownloadSimple size={15} />
                            </Button>
                            {(a.uploadedById === Number(userId) ||
                                role === "Admin") &&
                                !frozen && (
                                    <AlertDialog>
                                        <AlertDialogTrigger
                                            render={
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    aria-label={`Delete ${a.fileName}`}
                                                />
                                            }
                                        >
                                            <Trash
                                                size={15}
                                                className="text-destructive"
                                            />
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>
                                                    Delete this file?
                                                </AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    &ldquo;{a.fileName}&rdquo; will
                                                    be removed from the loan file.
                                                    This is recorded in the audit
                                                    trail.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>
                                                    Cancel
                                                </AlertDialogCancel>
                                                <AlertDialogAction
                                                    className="bg-destructive text-destructive-foreground"
                                                    onClick={() =>
                                                        remove.mutate(a.id)
                                                    }
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
