/**
 * OtherObligationsSection
 * -----------------------
 * Section 5 of the loan creation wizard. Renders three tables per loan:
 *
 *   1. EBI Accounts for Reloans  — read-only rows populated via
 *      transfers from Outstanding Loans. Each row exposes a transfer
 *      menu so it can be moved back to Outstanding.
 *
 *   2. Buy-Out Accounts (Other FIs) — manually managed by the AO. The
 *      user adds rows via "Add Account", edits the inputs directly,
 *      and deletes rows via the trash icon.
 *
 *   3. Incoming / Undeducted Loans — same manual add / edit / delete
 *      pattern as Buy-Outs, triggered by "Add Loan".
 *
 * Visual contract:
 *   • `bg-muted/50` + `readOnly` on the EBI rows signals to the user
 *     that those rows are populated via transfers (not direct entry),
 *     and contrasts visually with the standard inputs in the manual
 *     grids below.
 *   • Phosphor icons are used throughout for consistency with the
 *     rest of the wizard.
 *
 * Controlled-row contract:
 *   All inputs render from `useWatch` values (form state) and mutate
 *   via `setValue`. This makes index-keyed rows safe under splice and
 *   removes the `useFieldArray` "one instance per name" constraint.
 */

import { useFormContext, useWatch, type FieldPath } from "react-hook-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Bank, CreditCard, ArrowLineDown, Plus, Trash } from "@phosphor-icons/react";

import { useLoanTransfersContext } from "../loan-transfers-provider";
import { TransferActionMenu } from "./transfer-action-menu";
import { SectionCard, SubSectionHeading } from "./section-card";
import { PerLoanTabs } from "./per-loan-tabs";
import { getSection } from "../sections";
import { useActiveLoan } from "../active-loan-context";
import type { LoanApplicationFormData, EbiReloan, BuyOut, IncomingLoan } from "../schema";

export function OtherObligationsSection() {
    const { loans } = useActiveLoan();
    const section = getSection("other-obligations");

    return (
        <SectionCard
            step={section.step}
            title={section.label}
            description={section.description}
            systemSourced
            contentClassName="p-0 divide-y"
            badge={loans.length > 0 ? <Badge variant="secondary">{loans.length} loan{loans.length === 1 ? "" : "s"}</Badge> : undefined}
        >
            {loans.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                    Select loan numbers in Step 1.3 to declare obligations per loan.
                </div>
            ) : (
                <PerLoanTabs
                    idPrefix="other-obligations"
                    ariaLabel="Obligations per loan"
                    mountStrategy="active-only"
                    renderPanel={(loan, i) => <OtherObligationsFields loanIndex={i} />}
                />
            )}
        </SectionCard>
    );
}

function OtherObligationsFields({ loanIndex }: { loanIndex: number }) {
    const { control, setValue } = useFormContext<LoanApplicationFormData>();
    const { appendRow, removeRow, handleTransfer } = useLoanTransfersContext();

    const P = `loans.${loanIndex}`;

    // Controlled rows: subscribe to form state so inputs re-render on mutation.
    const ebi = (useWatch({ control, name: `${P}.ebiReloans` as FieldPath<LoanApplicationFormData> }) as EbiReloan[] | undefined) ?? [];
    const buyOuts = (useWatch({ control, name: `${P}.buyOuts` as FieldPath<LoanApplicationFormData> }) as BuyOut[] | undefined) ?? [];
    const incoming = (useWatch({ control, name: `${P}.incomingLoans` as FieldPath<LoanApplicationFormData> }) as IncomingLoan[] | undefined) ?? [];

    const setCell = (path: string, value: unknown) =>
        setValue(path as FieldPath<LoanApplicationFormData>, value as never, { shouldDirty: true });

    const addBuyOut = () => appendRow("buyOuts", { pn: "", name: "", amortization: 0, outstandingBalance: 0 });
    const addIncoming = () => appendRow("incomingLoans", { name: "", deductions: 0, remarks: "" });

    return (
        <>
            {/* ── EBI Reloans ─────────────────────────────────────── */}
            <div className="p-4">
                <SubSectionHeading
                    step="5.1"
                    title="EBI Accounts for Reloans"
                    icon={<Bank size={16} weight="bold" className="text-primary" aria-hidden />}
                />
                <Table className="mt-3">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[180px]">PN / Account No.</TableHead>
                            <TableHead className="flex-1 min-w-[140px]">
                                Product Name
                            </TableHead>
                            <TableHead className="text-right flex-1 min-w-[140px]">
                                Existing Deduction
                            </TableHead>
                            <TableHead className="text-right w-[160px]">Pay to Close</TableHead>
                            <TableHead className="w-[50px]">
                                <span className="sr-only">Row actions</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ebi.map((row, i) => (
                            <TableRow key={`ebi-${i}`} className="hover:bg-muted/30">
                                <TableCell className="min-w-0">
                                    <Input
                                        value={row.pn ?? ""}
                                        readOnly
                                        title={row.pn}
                                        className="h-8 text-xs bg-muted/50 min-w-0 overflow-hidden text-ellipsis"
                                    />
                                </TableCell>
                                <TableCell className="min-w-0">
                                    <Input
                                        value={row.name ?? ""}
                                        readOnly
                                        title={row.name}
                                        className="h-8 text-xs bg-muted/50 min-w-0 overflow-hidden text-ellipsis"
                                    />
                                </TableCell>
                                <TableCell className="min-w-0">
                                    <Input
                                        type="number"
                                        value={row.existingDeduction ?? 0}
                                        readOnly
                                        className="h-8 text-right text-xs bg-muted/50"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        inputMode="decimal"
                                        value={row.payToClose ?? 0}
                                        onChange={(e) => setCell(`${P}.ebiReloans.${i}.payToClose`, Number(e.target.value || 0))}
                                        placeholder="0.00"
                                        aria-label={`Pay to close for ${row.name ?? row.pn ?? `row ${i + 1}`}`}
                                        className="h-8 text-right text-xs"
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <TransferActionMenu
                                        currentSection="ebi"
                                        onTransfer={(target) => handleTransfer("ebi", i, target)}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                        {ebi.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="text-center text-xs text-muted-foreground py-4"
                                >
                                    No EBI reloans added. Transfer from Outstanding Loans to add.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ── Buy-Outs from Other FIs ─────────────────────────── */}
            <div className="p-4">
                <SubSectionHeading
                    step="5.2"
                    title="Buy-Out Accounts (Other FIs)"
                    icon={
                        <CreditCard
                            size={16}
                            weight="bold"
                            className="text-primary"
                            aria-hidden
                        />
                    }
                    actions={
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addBuyOut}
                            className="gap-1.5"
                        >
                            <Plus size={14} weight="bold" /> Add Account
                        </Button>
                    }
                />
                <Table className="mt-3">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[120px]">PN / Ref No.</TableHead>
                            <TableHead>Financial Institution / Name</TableHead>
                            <TableHead className="text-right">Monthly Amort</TableHead>
                            <TableHead className="text-right">Outstanding Balance</TableHead>
                            <TableHead className="w-[50px]">
                                <span className="sr-only">Row actions</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {buyOuts.map((row, i) => (
                            <TableRow key={`buyout-${i}`} className="group hover:bg-muted/30">
                                <TableCell>
                                    <Input
                                        value={row.pn ?? ""}
                                        onChange={(e) => setCell(`${P}.buyOuts.${i}.pn`, e.target.value)}
                                        className="h-8 text-xs"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        value={row.name ?? ""}
                                        onChange={(e) => setCell(`${P}.buyOuts.${i}.name`, e.target.value)}
                                        className="h-8 text-xs"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        value={row.amortization ?? 0}
                                        onChange={(e) => setCell(`${P}.buyOuts.${i}.amortization`, Number(e.target.value || 0))}
                                        className="h-8 text-right text-xs"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        value={row.outstandingBalance ?? 0}
                                        onChange={(e) => setCell(`${P}.buyOuts.${i}.outstandingBalance`, Number(e.target.value || 0))}
                                        className="h-8 text-right text-xs"
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => removeRow("buyOuts", i)}
                                        aria-label="Delete buy-out account"
                                    >
                                        <Trash size={14} weight="bold" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {buyOuts.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="text-center text-xs text-muted-foreground py-4"
                                >
                                    No external buy-outs added. Click "Add Account" to declare one.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ── Incoming / Undeducted ───────────────────────────── */}
            <div className="p-4">
                <SubSectionHeading
                    step="5.3"
                    title="Incoming / Undeducted Loans"
                    icon={
                        <ArrowLineDown
                            size={16}
                            weight="bold"
                            className="text-primary"
                            aria-hidden
                        />
                    }
                    actions={
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addIncoming}
                            className="gap-1.5"
                        >
                            <Plus size={14} weight="bold" /> Add Loan
                        </Button>
                    }
                />
                <Table className="mt-3">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Creditor / Name</TableHead>
                            <TableHead className="text-right">Expected Deduction</TableHead>
                            <TableHead>Remarks / Notes</TableHead>
                            <TableHead className="w-[50px]">
                                <span className="sr-only">Row actions</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {incoming.map((row, i) => (
                            <TableRow key={`incoming-${i}`} className="group hover:bg-muted/30">
                                <TableCell>
                                    <Input
                                        value={row.name ?? ""}
                                        onChange={(e) => setCell(`${P}.incomingLoans.${i}.name`, e.target.value)}
                                        className="h-8 text-xs"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        value={row.deductions ?? 0}
                                        onChange={(e) => setCell(`${P}.incomingLoans.${i}.deductions`, Number(e.target.value || 0))}
                                        className="h-8 text-right text-xs"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        value={row.remarks ?? ""}
                                        onChange={(e) => setCell(`${P}.incomingLoans.${i}.remarks`, e.target.value)}
                                        className="h-8 text-xs"
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => removeRow("incomingLoans", i)}
                                        aria-label="Delete incoming loan"
                                    >
                                        <Trash size={14} weight="bold" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {incoming.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={4}
                                    className="text-center text-xs text-muted-foreground py-4"
                                >
                                    No incoming loans declared. Click "Add Loan" to add one.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
