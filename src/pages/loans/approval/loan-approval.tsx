import { useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Textarea } from "@/src/components/ui/textarea";
import { Label } from "@/src/components/ui/label";
import { Badge } from "@/src/components/ui/badge";
import {
    CheckCircle,
    XCircle,
    ArrowRight,
    ArrowCounterClockwise,
    FilePdf,
    Printer,
    Clock,
    UserCircle,
    WarningCircle,
} from "@phosphor-icons/react";
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
import { toast } from "sonner";

import { useAuthStore } from "@/src/store/authStore";
import { ApprovalFormDocument } from "./components/approval-form-document";
import { dummyLoanData } from "./dummy-data";

export function LoanApprovalPage() {
    const [remarks, setRemarks] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // TODO(api): replace dummyLoanData with a fetch keyed off the URL param
    // (e.g. /loans/approval/:lai). The route will hand the loan record to
    // this page; for now we render the static dummy dataset.
    const loanData = dummyLoanData;
    const lai = loanData.branchType.lai || "LA-2026-08-9942";

    const authUser = useAuthStore((s) => s.user);
    const fullNameOfUser = authUser
        ? [authUser.firstName, authUser.middleName, authUser.lastName]
              .filter(Boolean)
              .join(" ")
        : "Unknown Approver";

    const handleAction = async (action: "approve" | "reject" | "revision") => {
        if (!remarks.trim()) {
            toast.error("Remarks are required for this workflow action.");
            return;
        }

        setIsSubmitting(true);
        // Simulated API call — wired up when the approval endpoint lands.
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setIsSubmitting(false);

        const messages: Record<typeof action, string> = {
            approve: "Application approved and routed for disbursement.",
            reject: "Application rejected. Encoder has been notified.",
            revision: "Returned to encoder for revisions.",
        };

        toast.success(messages[action]);
        setRemarks("");
        // Router navigation or state reset would happen here.
    };

    const canAct = remarks.trim().length > 0 && !isSubmitting;

    return (
        <div className="flex min-h-[calc(100vh-var(--header-height))] flex-col bg-muted/40">
            {/* Top Header */}
            <header className="sticky top-[var(--header-height)] z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-16 items-center justify-between px-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <h1 className="text-xl font-semibold tracking-tight">Loan Approval</h1>
                        <Badge variant="outline" className="text-xs">
                            {lai}
                        </Badge>
                        <Badge
                            variant="secondary"
                            className="gap-1.5 border-blue-200 bg-blue-50 text-blue-700"
                        >
                            <Clock size={12} weight="fill" />
                            For Approval
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1.5 font-normal">
                            <UserCircle size={14} />
                            {fullNameOfUser}
                        </Badge>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-6 py-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr,380px]">
                    {/* Main Document Area */}
                    <div className="space-y-4">
                        <Card className="overflow-hidden">
                            <CardHeader className="flex-row items-center justify-between border-b bg-muted/30 p-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <FilePdf size={20} weight="bold" className="text-primary" />
                                    Approval Form Document
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5"
                                        onClick={() => window.print()}
                                    >
                                        <Printer size={14} weight="bold" />
                                        Print
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="gap-1.5"
                                        onClick={() => toast.info("Generating PDF...")}
                                    >
                                        <FilePdf size={14} weight="bold" />
                                        Export PDF
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ApprovalFormDocument data={loanData} />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sticky Sidebar for Actions */}
                    <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit lg:self-start">
                        <Card>
                            <CardHeader className="border-b pb-4">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <CheckCircle size={18} weight="bold" className="text-primary" />
                                    Workflow Actions
                                </CardTitle>
                                <CardDescription className="pt-1 text-xs">
                                    Review the application details and route to the next step.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-4">
                                {/* Audit Trail */}
                                <div className="space-y-3">
                                    <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        <Clock size={12} />
                                        Audit Trail
                                    </h3>
                                    <ul className="space-y-3 text-xs">
                                        <li className="flex gap-3">
                                            <CheckCircle
                                                size={16}
                                                className="mt-0.5 shrink-0 text-primary"
                                                weight="fill"
                                            />
                                            <div>
                                                <p className="font-medium text-foreground">
                                                    Encoder (Maria Santos)
                                                </p>
                                                <p className="text-muted-foreground">
                                                    Created application • Aug 28, 10:24 AM
                                                </p>
                                            </div>
                                        </li>
                                        <li className="flex gap-3">
                                            <CheckCircle
                                                size={16}
                                                className="mt-0.5 shrink-0 text-primary"
                                                weight="fill"
                                            />
                                            <div>
                                                <p className="font-medium text-foreground">
                                                    Branch Head (Recommender)
                                                </p>
                                                <p className="text-muted-foreground">
                                                    Recommended for Checking • Aug 29, 02:15 PM
                                                </p>
                                                <p className="mt-1 border-l-2 border-border pl-2 italic text-muted-foreground">
                                                    &ldquo;Borrower has excellent standing.&rdquo;
                                                </p>
                                            </div>
                                        </li>
                                        <li className="flex gap-3">
                                            <ArrowRight
                                                size={16}
                                                className="mt-0.5 shrink-0 text-blue-500"
                                                weight="bold"
                                            />
                                            <div>
                                                <p className="font-medium text-blue-600">
                                                    Pending: Area Head (Approver)
                                                </p>
                                                <p className="text-muted-foreground">
                                                    Awaiting final approval
                                                </p>
                                            </div>
                                        </li>
                                    </ul>
                                </div>

                                <div className="h-px bg-border" />

                                {/* Remarks */}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="remarks"
                                        className="flex items-center gap-1.5 text-sm font-semibold"
                                    >
                                        Remarks / Conditions
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        id="remarks"
                                        placeholder="Enter comments, conditions for approval, or reasons for rejection..."
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        className="min-h-[100px] resize-none text-sm"
                                        disabled={isSubmitting}
                                    />
                                    {remarks.trim().length === 0 && (
                                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                            <WarningCircle size={12} weight="fill" />
                                            Required to take workflow action
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            variant="outline"
                                            className="gap-2"
                                            onClick={() => handleAction("revision")}
                                            disabled={!canAct}
                                        >
                                            <ArrowCounterClockwise size={16} />
                                            Return
                                        </Button>

                                        <AlertDialog>
                                            <AlertDialogTrigger
                                                render={
                                                    <Button
                                                        variant="destructive"
                                                        className="gap-2"
                                                        disabled={!canAct}
                                                    />
                                                }
                                            >
                                                <XCircle size={16} />
                                                Reject
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>
                                                        Reject this application?
                                                    </AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will terminate the loan process and
                                                        notify the encoder. Ensure your remarks
                                                        clearly state the reason for rejection.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel disabled={isSubmitting}>
                                                        Cancel
                                                    </AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleAction("reject")}
                                                        disabled={isSubmitting}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Confirm Rejection
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>

                                    <Button
                                        className="w-full gap-2"
                                        size="lg"
                                        onClick={() => handleAction("approve")}
                                        disabled={!canAct}
                                    >
                                        {isSubmitting ? (
                                            <span className="animate-pulse">Processing...</span>
                                        ) : (
                                            <>
                                                <CheckCircle size={18} weight="bold" />
                                                Approve Loan
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </div>
        </div>
    );
}