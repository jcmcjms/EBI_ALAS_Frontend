import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChatCenteredText, ArrowBendLeftUp } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Textarea } from "@/src/components/ui/textarea";

import {
    loanReviewKeys,
    postDocumentRemark,
    type DocumentRemarkDto,
} from "@/src/lib/api/loan-review";

const ROLE_BADGE: Record<string, string> = {
    Recommender:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
    Evaluator:
        "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400",
    Approver:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
    Admin:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
};

function RemarkCard({
    remark,
    replyToName,
    onReply,
    canReply,
}: {
    remark: DocumentRemarkDto;
    replyToName?: string;
    onReply?: () => void;
    canReply: boolean;
}) {
    return (
        <div className="rounded-md border bg-background p-2.5">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold">
                    {remark.authorName}
                </span>
                <Badge
                    variant="outline"
                    className={`text-[10px] ${ROLE_BADGE[remark.authorRole] ?? ""}`}
                >
                    {remark.authorRole}
                </Badge>
                <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                    {new Date(remark.createdAt).toLocaleString()}
                </span>
            </div>
            {replyToName && (
                <p className="mt-0.5 text-[11px] italic text-muted-foreground">
                    in reply to {replyToName}
                </p>
            )}
            <p className="mt-1 whitespace-pre-wrap text-sm">{remark.body}</p>
            {canReply && onReply && (
                <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1 h-6 gap-1 px-2 text-[11px]"
                    onClick={onReply}
                >
                    <ArrowBendLeftUp size={11} /> Reply
                </Button>
            )}
        </div>
    );
}

interface DocumentRemarksThreadProps {
    loanId: number;
    checklistIdCode: string;
    docId: number | null;
    /** Remarks for THIS document only (panel slices the single query). */
    remarks: DocumentRemarkDto[];
    canWrite: boolean;
    frozen: boolean;
}

export function DocumentRemarksThread({
    loanId,
    checklistIdCode,
    docId,
    remarks,
    canWrite,
    frozen,
}: DocumentRemarksThreadProps) {
    const qc = useQueryClient();
    const [body, setBody] = useState("");
    const [replyTo, setReplyTo] = useState<number | null>(null);

    const send = useMutation({
        mutationFn: () =>
            postDocumentRemark(loanId, {
                checklistIdCode,
                docId,
                parentRemarkId: replyTo,
                body,
            }),
        onSuccess: () => {
            toast.success("Remark added.");
            setBody("");
            setReplyTo(null);
            qc.invalidateQueries({
                queryKey: loanReviewKeys.documentRemarks(loanId),
            });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const roots = remarks.filter((r) => r.parentRemarkId === null);
    const repliesOf = (id: number) =>
        remarks.filter((r) => r.parentRemarkId === id);
    const nameOf = (id: number | null) =>
        id === null ? undefined : remarks.find((r) => r.id === id)?.authorName;
    const replyTargetName =
        replyTo !== null ? nameOf(replyTo) : undefined;

    return (
        <div className="space-y-2">
            {remarks.length === 0 && (
                <p className="text-xs text-muted-foreground">
                    No remarks on this document yet.
                </p>
            )}

            {roots.map((root) => (
                <div key={root.id} className="space-y-1.5">
                    <RemarkCard
                        remark={root}
                        canReply={canWrite && !frozen}
                        onReply={() => setReplyTo(root.id)}
                    />
                    {repliesOf(root.id).length > 0 && (
                        <div className="ml-4 space-y-1.5 border-l-2 border-border pl-2.5">
                            {repliesOf(root.id).map((r) => (
                                <RemarkCard
                                    key={r.id}
                                    remark={r}
                                    replyToName={nameOf(r.parentRemarkId)}
                                    canReply={canWrite && !frozen}
                                    onReply={() => setReplyTo(r.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {/* Orphaned deeper replies (parent collapsed) still render flat. */}
            {remarks
                .filter(
                    (r) =>
                        r.parentRemarkId !== null &&
                        !roots.some((rt) => rt.id === r.parentRemarkId) &&
                        !roots.some((rt) =>
                            repliesOf(rt.id).some(
                                (x) => x.id === r.parentRemarkId
                            )
                        )
                )
                .map((r) => (
                    <RemarkCard
                        key={r.id}
                        remark={r}
                        replyToName={nameOf(r.parentRemarkId)}
                        canReply={canWrite && !frozen}
                        onReply={() => setReplyTo(r.id)}
                    />
                ))}

            {frozen ? (
                <p className="text-[11px] text-muted-foreground">
                    Remarks are closed for this application.
                </p>
            ) : canWrite ? (
                <div className="space-y-1.5 pt-1">
                    {replyTargetName && (
                        <p className="text-[11px] text-muted-foreground">
                            Replying to{" "}
                            <strong>{replyTargetName}</strong>{" "}
                            <button
                                type="button"
                                className="underline"
                                onClick={() => setReplyTo(null)}
                            >
                                cancel
                            </button>
                        </p>
                    )}
                    <Textarea
                        rows={2}
                        maxLength={2000}
                        value={body}
                        placeholder="Add a remark on this document…"
                        onChange={(e) => setBody(e.target.value)}
                    />
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                            {body.trim().length}/2000
                        </span>
                        <Button
                            size="sm"
                            className="gap-1.5"
                            disabled={
                                body.trim().length < 3 || send.isPending
                            }
                            onClick={() => send.mutate()}
                        >
                            <ChatCenteredText size={13} weight="bold" />
                            {replyTo !== null ? "Reply" : "Add remark"}
                        </Button>
                    </div>
                </div>
            ) : (
                <p className="text-[11px] text-muted-foreground">
                    Only the Recommender, Evaluator, or Approver can add
                    remarks.
                </p>
            )}
        </div>
    );
}
