/**
 * OtherObligationsSection
 * -----------------------
 * Section 5 of the loan creation wizard. Renders three tables:
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
 */

import { useFormContext, useWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { Bank, CreditCard, ArrowLineDown, Plus, Trash } from "@phosphor-icons/react";

import { useLoanTransfers } from "../hooks/useLoanTransfers";
import { TransferActionMenu } from "./transfer-action-menu";

type EbiRow = { pn?: string; name?: string; existingDeduction?: number };
type BuyOutRow = { pn?: string; name?: string; amortization?: number; outstandingBalance?: number };
type IncomingRow = { name?: string; deductions?: number; remarks?: string };

export function OtherObligationsSection() {
    const { control, register } = useFormContext();
    // `arrays` is consumed for RHF row ids (React keys) and for the
    // append/remove helpers used by the Add/Delete buttons. The
    // bidirectional transfer hook (`handleTransfer`) is wired up to
    // the EBI rows below.
    const { arrays, handleTransfer } = useLoanTransfers();

    const watchedReloans = (useWatch({ control, name: "ebiReloans" }) as EbiRow[]) || [];
    const watchedBuyouts = (useWatch({ control, name: "buyOuts" }) as BuyOutRow[]) || [];
    const watchedIncoming = (useWatch({ control, name: "incomingLoans" }) as IncomingRow[]) || [];

    // ── Add-row handlers ────────────────────────────────────────────────
    // We seed each new row with empty strings / zeros rather than
    // undefined so the schema's `.default(...)` constraints are happy
    // and the inputs render a stable initial DOM node.
    const addBuyOut = () => {
        arrays.buyOut.append({ pn: "", name: "", amortization: 0, outstandingBalance: 0 });
    };

    const addIncoming = () => {
        arrays.incoming.append({ name: "", deductions: 0, remarks: "" });
    };

    return (
        <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
                <CardTitle className="text-lg">5. EBI, Buy-Outs & Incoming Loans</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y">

                {/* ── EBI Reloans ─────────────────────────────────────── */}
                <div className="p-4">
                    <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
                        <Bank size={16} weight="bold" className="text-primary" /> EBI Accounts for
                        Reloans
                    </h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">PN / Account No.</TableHead>
                                <TableHead>Product Name</TableHead>
                                <TableHead className="text-right">Existing Deduction</TableHead>
                                <TableHead className="w-[50px]">
                                    <span className="sr-only">Row actions</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {watchedReloans.map((loan, i) => (
                                <TableRow
                                    key={arrays.ebi.fields[i]?.id ?? i}
                                    className="hover:bg-muted/30"
                                >
                                    <TableCell>
                                        <Input
                                            {...register(`ebiReloans.${i}.pn`)}
                                            defaultValue={loan?.pn}
                                            readOnly
                                            className="h-8 font-mono text-xs bg-muted/50"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            {...register(`ebiReloans.${i}.name`)}
                                            defaultValue={loan?.name}
                                            readOnly
                                            className="h-8 text-xs bg-muted/50"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            {...register(`ebiReloans.${i}.existingDeduction`, {
                                                valueAsNumber: true,
                                            })}
                                            defaultValue={loan?.existingDeduction}
                                            readOnly
                                            className="h-8 text-right text-xs bg-muted/50"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <TransferActionMenu
                                            currentSection="ebi"
                                            onTransfer={(target) =>
                                                handleTransfer(
                                                    "ebi",
                                                    arrays.ebi.fields[i]?.id ?? "",
                                                    target,
                                                )
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {watchedReloans.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
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
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <CreditCard size={16} weight="bold" className="text-primary" /> Buy-Out
                            Accounts (Other FIs)
                        </h3>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addBuyOut}
                            className="gap-1.5"
                        >
                            <Plus size={14} weight="bold" /> Add Account
                        </Button>
                    </div>
                    <Table>
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
                            {watchedBuyouts.map((loan, i) => (
                                <TableRow
                                    key={arrays.buyOut.fields[i]?.id ?? i}
                                    className="group hover:bg-muted/30"
                                >
                                    <TableCell>
                                        <Input
                                            {...register(`buyOuts.${i}.pn`)}
                                            defaultValue={loan?.pn}
                                            className="h-8 font-mono text-xs"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            {...register(`buyOuts.${i}.name`)}
                                            defaultValue={loan?.name}
                                            className="h-8 text-xs"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            {...register(`buyOuts.${i}.amortization`, {
                                                valueAsNumber: true,
                                            })}
                                            defaultValue={loan?.amortization}
                                            className="h-8 text-right text-xs"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            {...register(`buyOuts.${i}.outstandingBalance`, {
                                                valueAsNumber: true,
                                            })}
                                            defaultValue={loan?.outstandingBalance}
                                            className="h-8 text-right text-xs"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => arrays.buyOut.remove(i)}
                                            aria-label="Delete buy-out account"
                                        >
                                            <Trash size={14} weight="bold" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {watchedBuyouts.length === 0 && (
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
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <ArrowLineDown size={16} weight="bold" className="text-primary" />{" "}
                            Incoming / Undeducted Loans
                        </h3>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addIncoming}
                            className="gap-1.5"
                        >
                            <Plus size={14} weight="bold" /> Add Loan
                        </Button>
                    </div>
                    <Table>
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
                            {watchedIncoming.map((loan, i) => (
                                <TableRow
                                    key={arrays.incoming.fields[i]?.id ?? i}
                                    className="group hover:bg-muted/30"
                                >
                                    <TableCell>
                                        <Input
                                            {...register(`incomingLoans.${i}.name`)}
                                            defaultValue={loan?.name}
                                            className="h-8 text-xs"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            {...register(`incomingLoans.${i}.deductions`, {
                                                valueAsNumber: true,
                                            })}
                                            defaultValue={loan?.deductions}
                                            className="h-8 text-right text-xs"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            {...register(`incomingLoans.${i}.remarks`)}
                                            defaultValue={loan?.remarks}
                                            className="h-8 text-xs"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => arrays.incoming.remove(i)}
                                            aria-label="Delete incoming loan"
                                        >
                                            <Trash size={14} weight="bold" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {watchedIncoming.length === 0 && (
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

            </CardContent>
        </Card>
    );
}