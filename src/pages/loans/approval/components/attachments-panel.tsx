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
    getLoanAttachments,
    loanReviewKeys,
    uploadLoanAttachment,
    type LoanAttachmentDto,
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

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    {rows.length} file{rows.length === 1 ? "" : "s"} attached to
                    this application.
                </p>
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
                    No files attached yet.
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
    );
}
