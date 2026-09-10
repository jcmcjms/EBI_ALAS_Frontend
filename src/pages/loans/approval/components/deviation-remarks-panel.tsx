import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ChatCenteredText,
    ArrowBendUpLeft,
    Warning,
    Receipt,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Textarea } from "@/src/components/ui/textarea";
import { Spinner } from "@/src/components/ui/spinner";

import {
    getDeviationThreads,
    loanReviewKeys,
    postDeviationRemark,
    type DeviationRemarkMessageDto,
} from "@/src/lib/api/loan-review";

const ROLE_BADGE: Record<string, string> = {
    Encoder: "border-slate-300 bg-slate-100 text-slate-700",
    Recommender: "border-blue-200 bg-blue-50 text-blue-700",
    Evaluator: "border-violet-200 bg-violet-50 text-violet-700",
    Approver: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Admin: "border-amber-200 bg-amber-50 text-amber-700",
};

function RoleBadge({ role }: { role: string }) {
    return (
        <Badge
            variant="outline"
            className={`text-[10px] ${ROLE_BADGE[role] ?? ""}`}
        >
            {role}
        </Badge>
    );
}

function MessageCard({
    msg,
    isRoot,
    replyToName,
}: {
    msg: DeviationRemarkMessageDto;
    isRoot?: boolean;
    replyToName?: string;
}) {
    return (
        <div
            className={`rounded-md border p-3 ${isRoot ? "border-slate-300 bg-slate-50" : "bg-background"}`}
        >
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold">
                    {msg.authorName}
                </span>
                <RoleBadge role={msg.authorRole} />
                {isRoot && (
                    <Badge variant="secondary" className="text-[10px]">
                        Submitted with application
                    </Badge>
                )}
                <span className="ml-auto text-[11px] text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleString()}
                </span>
            </div>
            {replyToName && (
                <p className="mt-1 text-[11px] italic text-muted-foreground">
                    in reply to {replyToName}
                </p>
            )}
            <p className="mt-1.5 whitespace-pre-wrap text-sm">
                {msg.body || "—"}
            </p>
        </div>
    );
}

function ThreadComposer({
    loanId,
    deviationKey,
    canWrite,
    frozen,
    onDone,
}: {
    loanId: number;
    deviationKey: string;
    canWrite: boolean;
    frozen: boolean;
    onDone?: () => void;
}) {
    const qc = useQueryClient();
    const [body, setBody] = useState("");
    const [parentId, setParentId] = useState<number | null>(null);

    const send = useMutation({
        mutationFn: () =>
            postDeviationRemark(loanId, {
                deviationKey,
                parentRemarkId: parentId,
                body,
            }),
        onSuccess: () => {
            toast.success("Remark added.");
            setBody("");
            setParentId(null);
            onDone?.();
            qc.invalidateQueries({
                queryKey: loanReviewKeys.deviationRemarks(loanId),
            });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    if (!canWrite) return null;
    if (frozen)
        return (
            <p className="text-[11px] text-muted-foreground">
                Remarks are closed for this application.
            </p>
        );

    return (
        <div className="space-y-2">
            <Textarea
                rows={2}
                value={body}
                placeholder="Add a remark on this deviation…"
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
            />
            <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                    {body.trim().length}/2000
                </span>
                <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={body.trim().length < 3 || send.isPending}
                    onClick={() => send.mutate()}
                >
                    <ArrowBendUpLeft size={13} weight="bold" />{" "}
                    {parentId ? "Reply" : "Add remark"}
                </Button>
            </div>
        </div>
    );
}

export function DeviationRemarksPanel({
    loanId,
    canWrite,
    frozen,
}: {
    loanId: number;
    canWrite: boolean;
    frozen: boolean;
}) {
    const threads = useQuery({
        queryKey: loanReviewKeys.deviationRemarks(loanId),
        queryFn: () => getDeviationThreads(loanId),
    });

    if (threads.isLoading) return <Spinner className="size-5" />;
    const list = threads.data ?? [];
    if (list.length === 0)
        return (
            <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                No deviations were declared for this application.
            </p>
        );

    return (
        <div className="space-y-5">
            {list.map((t) => (
                <section
                    key={t.deviationKey}
                    className="space-y-2 rounded-lg border p-3"
                >
                    <header className="flex items-start gap-2">
                        {t.deviationKey === "FEE_OVERRIDE" ? (
                            <Receipt
                                size={16}
                                weight="fill"
                                className="mt-0.5 text-amber-600"
                            />
                        ) : (
                            <Warning
                                size={16}
                                weight="fill"
                                className="mt-0.5 text-amber-600"
                            />
                        )}
                        <h3 className="text-sm font-semibold leading-snug">
                            {t.title}
                        </h3>
                        <Badge
                            variant="outline"
                            className="ml-auto shrink-0 gap-1 text-[10px]"
                        >
                            <ChatCenteredText size={11} /> {t.replies.length}
                        </Badge>
                    </header>

                    <MessageCard msg={t.root} isRoot />

                    <div className="ml-4 space-y-2 border-l-2 border-border pl-3">
                        {t.replies.map((r) => (
                            <MessageCard
                                key={r.id}
                                msg={r}
                                replyToName={
                                    r.parentRemarkId && r.parentRemarkId !== 0
                                        ? (t.replies.find(
                                              (x) => x.id === r.parentRemarkId
                                          )?.authorName ?? t.root.authorName)
                                        : t.root.authorName
                                }
                            />
                        ))}
                        <ThreadComposer
                            loanId={loanId}
                            deviationKey={t.deviationKey}
                            canWrite={canWrite}
                            frozen={frozen}
                        />
                    </div>
                </section>
            ))}
        </div>
    );
}
