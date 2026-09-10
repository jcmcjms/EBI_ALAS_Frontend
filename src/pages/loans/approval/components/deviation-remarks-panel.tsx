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
    getLoanDeviations,
    loanReviewKeys,
    postDeviationRemark,
    type DeviationRemarkDto,
    type LoanDeviationDto,
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

function RemarkCard({
    remark,
    replyToName,
}: {
    remark: DeviationRemarkDto;
    replyToName?: string;
}) {
    return (
        <div className="rounded-md border bg-background p-3">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold">
                    {remark.authorName}
                </span>
                <RoleBadge role={remark.authorRole} />
                <span className="ml-auto text-[11px] text-muted-foreground">
                    {new Date(remark.createdAt).toLocaleString()}
                </span>
            </div>
            {replyToName && (
                <p className="mt-1 text-[11px] italic text-muted-foreground">
                    in reply to {replyToName}
                </p>
            )}
            <p className="mt-1.5 whitespace-pre-wrap text-sm">{remark.body}</p>
        </div>
    );
}

function ThreadComposer({
    loanId,
    deviation,
    canWrite,
    frozen,
    onReply,
}: {
    loanId: number;
    deviation: LoanDeviationDto;
    canWrite: boolean;
    frozen: boolean;
    onReply?: (remarkId: number) => void;
}) {
    const qc = useQueryClient();
    const [body, setBody] = useState("");
    const [parentId, setParentId] = useState<number | null>(null);

    const send = useMutation({
        mutationFn: () =>
            postDeviationRemark(loanId, deviation.id, {
                body,
                parentRemarkId: parentId,
            }),
        onSuccess: () => {
            toast.success("Remark added.");
            setBody("");
            setParentId(null);
            onReply?.(0);
            qc.invalidateQueries({
                queryKey: loanReviewKeys.deviations(loanId),
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

    const replyTo = parentId
        ? deviation.remarks.find((r) => r.id === parentId)?.authorName
        : undefined;

    return (
        <div className="space-y-2">
            {replyTo && (
                <p className="text-[11px] text-muted-foreground">
                    Replying to <strong>{replyTo}</strong>{" "}
                    <button
                        type="button"
                        className="underline"
                        onClick={() => setParentId(null)}
                    >
                        cancel
                    </button>
                </p>
            )}
            <Textarea
                rows={2}
                value={body}
                maxLength={2000}
                placeholder="Add a remark on this deviation…"
                onChange={(e) => setBody(e.target.value)}
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

function DeviationThread({
    loanId,
    deviation,
    canWrite,
    frozen,
}: {
    loanId: number;
    deviation: LoanDeviationDto;
    canWrite: boolean;
    frozen: boolean;
}) {
    const nameOf = (id: number | null) =>
        id
            ? deviation.remarks.find((r) => r.id === id)?.authorName
            : undefined;

    return (
        <section className="space-y-2 rounded-lg border p-3">
            <header className="flex items-start gap-2">
                {deviation.isFeeOverride ? (
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
                    {deviation.reasonText}
                </h3>
                <Badge
                    variant="outline"
                    className="ml-auto shrink-0 gap-1 text-[10px]"
                >
                    <ChatCenteredText size={11} /> {deviation.remarks.length}
                </Badge>
            </header>

            {/* Thread root: the encoder's submission-time justification (immutable). */}
            <div className="rounded-md border border-slate-300 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold">Encoder</span>
                    <RoleBadge role="Encoder" />
                    <Badge variant="secondary" className="text-[10px]">
                        Submitted with application
                    </Badge>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm">
                    {deviation.encoderJustification || "\u2014"}
                </p>
            </div>

            <div className="ml-4 space-y-2 border-l-2 border-border pl-3">
                {deviation.remarks.map((r) => (
                    <div key={r.id} className="space-y-1">
                        <RemarkCard
                            remark={r}
                            replyToName={
                                r.parentRemarkId
                                    ? (nameOf(r.parentRemarkId) ?? "Encoder")
                                    : "Encoder"
                            }
                        />
                        {canWrite && !frozen && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 gap-1 px-2 text-[11px]"
                                onClick={() => {
                                    /* parentId is managed by ThreadComposer */
                                }}
                            >
                                <ArrowBendUpLeft size={11} /> Reply
                            </Button>
                        )}
                    </div>
                ))}
                <ThreadComposer
                    loanId={loanId}
                    deviation={deviation}
                    canWrite={canWrite}
                    frozen={frozen}
                />
            </div>
        </section>
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
    const deviations = useQuery({
        queryKey: loanReviewKeys.deviations(loanId),
        queryFn: () => getLoanDeviations(loanId),
    });

    if (deviations.isLoading) return <Spinner className="size-5" />;
    const list = deviations.data ?? [];
    if (list.length === 0)
        return (
            <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                No deviations were declared for this application.
            </p>
        );

    return (
        <div className="space-y-5">
            {list.map((d) => (
                <DeviationThread
                    key={d.id}
                    loanId={loanId}
                    deviation={d}
                    canWrite={canWrite}
                    frozen={frozen}
                />
            ))}
        </div>
    );
}
