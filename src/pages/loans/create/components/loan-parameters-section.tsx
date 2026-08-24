import { useFormContext, useWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calculator, CurrencyDollar, CalendarBlank } from "@phosphor-icons/react";

const loanProducts = [
    "Personal Loan",
    "Salary Loan",
    "Multi-Purpose Loan",
    "Emergency Loan",
    "Calamity Loan",
    "Educational Loan",
    "Housing Loan",
    "Vehicle Loan",
];

const paymentModes = [
    "Salary Deduction",
    "Post-Dated Checks",
    "Auto Debit",
    "Manual Payment",
];

export function LoanParametersSection() {
    const { control, register, setValue } = useFormContext();

    const proposedAmount = useWatch({ control, name: "loan.proposedAmount" }) || 0;
    const term = useWatch({ control, name: "loan.term" }) || 0;
    const interestRate = useWatch({ control, name: "loan.interestRate" }) || 1.5;

    const monthlyPayment =
        term > 0 && proposedAmount > 0
            ? (proposedAmount + proposedAmount * (interestRate / 100) * (term / 12)) / term
            : 0;

    return (
        <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CurrencyDollar size={20} weight="bold" className="text-primary" />
                        3. Loan Parameters
                    </CardTitle>
                    {monthlyPayment > 0 && (
                        <Badge variant="secondary" className="font-normal text-xs flex items-center gap-1.5 py-1 px-3">
                            <Calculator size={13} weight="bold" />
                            Est. Monthly:{" "}
                            <span className="font-bold text-emerald-600">
                                ₱{monthlyPayment.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Row 1 — Product & Purpose */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Loan Product</Label>
                    <Select
                        value={useWatch({ control, name: "loan.product" }) ?? ""}
                        onValueChange={(v) => setValue("loan.product", v, { shouldValidate: true })}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                            {loanProducts.map((p) => (
                                <SelectItem key={p} value={p}>
                                    {p}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Purpose of Loan</Label>
                    <Input
                        {...register("loan.purpose")}
                        placeholder="e.g. Home renovation, tuition fees, debt consolidation"
                        className="h-9"
                    />
                </div>

                {/* Row 2 — Amount, Term, Rate */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Proposed Amount (₱)</Label>
                    <Input
                        {...register("loan.proposedAmount", { valueAsNumber: true })}
                        type="number"
                        placeholder="0.00"
                        min={0}
                        className="h-9 font-semibold"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarBlank size={12} weight="bold" /> Term (months)
                    </Label>
                    <Input
                        {...register("loan.term", { valueAsNumber: true })}
                        type="number"
                        placeholder="e.g. 24"
                        min={1}
                        max={360}
                        className="h-9"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Interest Rate (% p.a.)</Label>
                    <Input
                        {...register("loan.interestRate", { valueAsNumber: true })}
                        type="number"
                        step="0.1"
                        placeholder="1.5"
                        min={0}
                        max={100}
                        className="h-9"
                    />
                </div>

                {/* Row 3 — Payment mode & release date */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Mode of Payment</Label>
                    <Select
                        value={useWatch({ control, name: "loan.modeOfPayment" }) ?? ""}
                        onValueChange={(v) => setValue("loan.modeOfPayment", v, { shouldValidate: true })}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                            {paymentModes.map((m) => (
                                <SelectItem key={m} value={m}>
                                    {m}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Date of First Release</Label>
                    <Input
                        {...register("loan.dateOfFirstRelease")}
                        type="date"
                        className="h-9"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Co-Maker (optional)</Label>
                    <Input
                        {...register("loan.coMaker")}
                        placeholder="Co-maker name"
                        className="h-9"
                    />
                </div>

                {/* Capacity-to-Pay Summary */}
                <div className="md:col-span-3 rounded-md border bg-muted/20 p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Capacity-to-Pay Indicators
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground text-xs block">Net Take-Home Pay</span>
                            <span className="font-semibold">₱45,000</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground text-xs block">Total Existing Obligations</span>
                            <span className="font-semibold">₱3,700</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground text-xs block">Proposed Monthly Amort.</span>
                            <span className="font-bold text-primary">
                                ₱{monthlyPayment.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground text-xs block">Debt-to-Income Ratio</span>
                            <span
                                className={
                                    proposedAmount > 0 && monthlyPayment > 0
                                        ? (monthlyPayment / 45000) * 100 > 40
                                            ? "font-bold text-red-600"
                                            : "font-bold text-emerald-600"
                                        : "text-muted-foreground"
                                }
                            >
                                {proposedAmount > 0 && monthlyPayment > 0
                                    ? `${((monthlyPayment / 45000) * 100).toFixed(1)}%`
                                    : "—"}
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
