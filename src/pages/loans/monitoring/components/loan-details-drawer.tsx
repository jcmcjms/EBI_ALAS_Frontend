import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/src/components/ui/sheet";
import { Badge } from "@/src/components/ui/badge";
import { Label } from "@/src/components/ui/label";
import { Separator } from "@/src/components/ui/separator";
import { Clock, CurrencyDollar, User, Building, CalendarBlank, Warning } from "@phosphor-icons/react";
import type { LoanMonitoringRecord } from "../types";

interface LoanDetailsDrawerProps {
    loan: LoanMonitoringRecord | null;
    onClose: () => void;
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ComponentType<any> }) {
    return (
        <div className="flex items-start gap-3">
            {Icon && <Icon size={14} className="mt-0.5 text-muted-foreground shrink-0" weight="bold" />}
            <div className="space-y-0.5 min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium">{value}</p>
            </div>
        </div>
    );
}

function TimeLapsedBadge({ hours }: { hours: number }) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    const label = days > 0 ? `${days}d ${remHours}h` : `${remHours}h`;

    let variant = "secondary";
    if (hours >= 48) variant = "destructive";
    else if (hours >= 24) variant = "outline";

    return (
        <Badge variant={variant as any} className="gap-1">
            <Clock size={12} weight="bold" />
            {label}
        </Badge>
    );
}

export function LoanDetailsDrawer({ loan, onClose }: LoanDetailsDrawerProps) {
    return (
        <Sheet open={!!loan} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="sm:max-w-[420px] p-0 flex flex-col overflow-hidden">
                {loan && (
                    <>
                        <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <SheetTitle className="font-mono text-base">{loan.formNumber}</SheetTitle>
                                    <SheetDescription className="text-xs mt-1">
                                        {loan.customerName} — {loan.product}
                                    </SheetDescription>
                                </div>
                                <TimeLapsedBadge hours={loan.timeLapsedHours} />
                            </div>
                        </SheetHeader>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Status */}
                            <div>
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Current Status</Label>
                                <div className="mt-2">
                                    <Badge
                                        variant={
                                            loan.status === "Approved" || loan.status === "Disbursed"
                                                ? "success"
                                                : loan.status === "Rejected"
                                                    ? "destructive"
                                                    : "secondary"
                                        }
                                        className="text-sm px-3 py-1"
                                    >
                                        {loan.status}
                                    </Badge>
                                </div>
                            </div>

                            <Separator />

                            {/* Client Information */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client Information</h4>
                                <div className="grid gap-4">
                                    <InfoRow icon={User} label="Customer Name" value={loan.customerName} />
                                    <InfoRow icon={Building} label="Branch" value={loan.branchCode} />
                                    <InfoRow label="Loan Type" value={<Badge variant="outline" className="font-normal text-xs">{loan.loanType}</Badge>} />
                                </div>
                            </div>

                            <Separator />

                            {/* Loan Details */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Loan Details</h4>
                                <div className="grid gap-4">
                                    <InfoRow icon={CurrencyDollar} label="Loan Amount" value={<span className="text-lg font-bold">₱{loan.loanAmount.toLocaleString()}</span>} />
                                    <InfoRow icon={CalendarBlank} label="Application Date" value={new Date(loan.applicationDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })} />
                                    <InfoRow label="Last Action" value={new Date(loan.lastActionDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })} />
                                    <InfoRow label="Last Approver" value={loan.lastApprover} />
                                </div>
                            </div>

                            <Separator />

                            {/* SLA Warning */}
                            {loan.timeLapsedHours >= 48 && (
                                <div className="rounded-md border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
                                    <Warning size={16} weight="fill" className="text-red-600 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-red-700">SLA Breach</p>
                                        <p className="text-xs text-red-600/80 mt-1">
                                            This application has exceeded the 48-hour SLA threshold. Immediate action is required.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
