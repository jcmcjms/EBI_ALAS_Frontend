import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitBranch, Warning } from "@phosphor-icons/react";
import { toastSuccess, toastError } from "@/src/components/ui/toast";

import { AppShell } from "@/src/components/layout/AppShell";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/src/components/ui/card";
import { Switch } from "@/src/components/ui/switch";
import { Badge } from "@/src/components/ui/badge";
import { Skeleton } from "@/src/components/ui/skeleton";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";

import {
    useWorkflowConfiguration,
    updateWorkflowConfiguration,
    getLoanCountByStatus,
    workflowKeys,
} from "@/src/lib/api/workflow";
import { LOAN_STATUS_META, type LoanStatus } from "@/src/lib/loan-status";

// ─── Pipeline preview ────────────────────────────────────────────────────────

function PipelinePreview({
    requireRecommendation,
}: {
    requireRecommendation: boolean;
}) {
    const stages: LoanStatus[] = requireRecommendation
        ? ["ForRecommendation", "ForChecking", "ForApproval", "Approved"]
        : ["ForChecking", "ForApproval", "Approved"];

    return (
        <div
            className="flex flex-wrap items-center gap-1.5"
            aria-label="Pipeline stages"
        >
            {stages.map((s, i) => (
                <span key={s} className="flex items-center gap-1.5">
                    {i > 0 && (
                        <span className="text-muted-foreground" aria-hidden>
                            →
                        </span>
                    )}
                    <Badge
                        variant="outline"
                        className={`font-normal ${LOAN_STATUS_META[s].className}`}
                    >
                        {LOAN_STATUS_META[s].label}
                    </Badge>
                </span>
            ))}
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function WorkflowSettingsPage() {
    const qc = useQueryClient();
    const config = useWorkflowConfiguration();
    const [pending, setPending] = useState<boolean | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Only fetched when the admin is actually confirming a disable.
    const backlog = useQuery({
        queryKey: ["loans", "count", "ForRecommendation"],
        queryFn: () => getLoanCountByStatus("ForRecommendation"),
        enabled: dialogOpen && pending === false,
    });

    const save = useMutation({
        mutationFn: updateWorkflowConfiguration,
        onSuccess: (_d, value) => {
            toastSuccess(
                value
                    ? "Recommendation step enabled for new applications."
                    : "Recommendation step disabled — new applications go straight to evaluation."
            );
            setDialogOpen(false);
            setPending(null);
            qc.invalidateQueries({ queryKey: workflowKeys.configuration });
        },
        onError: (e: Error) => {
            toastError(e.message);
            setPending(null);
        },
    });

    const current = config.data?.requireRecommendation ?? true;

    return (
        <AppShell>
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                        Workflow Settings
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        System-wide loan workflow configuration. Changes apply
                        to new applications immediately.
                    </p>
                </div>

                <Card className="max-w-2xl">
                    <CardHeader className="border-b pb-4">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <GitBranch
                                size={18}
                                weight="bold"
                                className="text-primary"
                            />
                            Branch Head Recommendation Step
                        </CardTitle>
                        <CardDescription className="pt-1 text-xs">
                            When enabled, encoders submit to the Recommender
                            (Branch Head) before evaluation. When disabled,
                            submissions go directly to the Evaluator. Loans
                            already awaiting recommendation are never affected.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-4">
                        {config.isLoading ? (
                            <Skeleton className="h-12 w-full" />
                        ) : (
                            <>
                                <div className="flex items-center justify-between gap-4 rounded-md border p-4">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-medium">
                                            Require recommendation before
                                            evaluation
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Currently{" "}
                                            <strong>
                                                {current
                                                    ? "enabled"
                                                    : "disabled"}
                                            </strong>
                                            {config.data?.source ===
                                                "Database" &&
                                                config.data.updatedByName && (
                                                    <>
                                                        {" "}
                                                        · changed by{" "}
                                                        {
                                                            config.data
                                                                .updatedByName
                                                        }
                                                        {config.data
                                                            .updatedAt &&
                                                            ` on ${new Date(config.data.updatedAt).toLocaleString()}`}
                                                    </>
                                                )}
                                            {config.data?.source ===
                                                "AppConfig" && (
                                                <>
                                                    {" "}
                                                    · from server configuration
                                                    (no admin override yet)
                                                </>
                                            )}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={current}
                                        disabled={save.isPending}
                                        aria-label="Require recommendation before evaluation"
                                        onCheckedChange={(v) => {
                                            setPending(v);
                                            setDialogOpen(true);
                                        }}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        Current pipeline
                                    </p>
                                    <PipelinePreview
                                        requireRecommendation={current}
                                    />
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <AlertDialog
                    open={dialogOpen}
                    onOpenChange={(o) => {
                        setDialogOpen(o);
                        if (!o) setPending(null);
                    }}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {pending ? "Enable" : "Disable"} the
                                recommendation step?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                <div className="space-y-2 text-sm">
                                    <p>
                                        {pending
                                            ? "New applications will route Encoder → Recommender → Evaluator → Approver."
                                            : "New applications will route Encoder → Evaluator → Approver, skipping the Branch Head."}
                                    </p>
                                    <PipelinePreview
                                        requireRecommendation={
                                            pending ?? current
                                        }
                                    />
                                    <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                                        <li>
                                            Applies to{" "}
                                            <strong>
                                                new submissions only
                                            </strong>
                                            , immediately.
                                        </li>
                                        <li>
                                            Loans already in For Recommendation
                                            stay actionable by recommenders.
                                        </li>
                                        <li>
                                            The change is recorded in the audit
                                            log with your name.
                                        </li>
                                    </ul>
                                    {!pending && backlog.isLoading && (
                                        <p className="text-xs text-muted-foreground">
                                            Checking backlog…
                                        </p>
                                    )}
                                    {!pending && (backlog.data ?? 0) > 0 && (
                                        <p className="flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
                                            <Warning
                                                size={14}
                                                weight="fill"
                                                className="mt-0.5 shrink-0"
                                            />
                                            {backlog.data} application(s) are
                                            currently waiting for
                                            recommendation. Recommenders can
                                            still process them.
                                        </p>
                                    )}
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                className={
                                    pending
                                        ? ""
                                        : "bg-amber-600 text-white hover:bg-amber-700"
                                }
                                disabled={save.isPending}
                                onClick={() =>
                                    pending !== null && save.mutate(pending)
                                }
                            >
                                {save.isPending
                                    ? "Saving…"
                                    : pending
                                      ? "Enable step"
                                      : "Disable step"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppShell>
    );
}
