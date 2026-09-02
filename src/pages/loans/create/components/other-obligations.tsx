import { useFormContext, useWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Input } from "@/src/components/ui/input";
import { Bank, CreditCard, ArrowLineDown } from "@phosphor-icons/react";

import { useLoanTransfers } from "../hooks/useLoanTransfers";
import { TransferActionMenu } from "./transfer-action-menu";

type EbiRow = { pn?: string; name?: string; existingDeduction?: number; outstandingBalance?: number };
type BuyOutRow = { pn?: string; name?: string; amortization?: number; outstandingBalance?: number };
type IncomingRow = { name?: string; deductions?: number; remarks?: string };

export function OtherObligationsSection() {
    const { control, register } = useFormContext();
    const { arrays, handleTransfer } = useLoanTransfers();

    const watchedReloans = (useWatch({ control, name: "ebiReloans" }) as EbiRow[]) || [];
    const watchedBuyouts = (useWatch({ control, name: "buyOuts" }) as BuyOutRow[]) || [];
    const watchedIncoming = (useWatch({ control, name: "incomingLoans" }) as IncomingRow[]) || [];

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
                                <TableRow key={arrays.ebi.fields[i]?.id ?? i}>
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
                                        No EBI reloans added.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* ── Buy-Outs from Other FIs ─────────────────────────── */}
                <div className="p-4">
                    <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
                        <CreditCard size={16} weight="bold" className="text-primary" /> Buy-Out
                        Accounts (Other FIs)
                    </h3>
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
                                <TableRow key={arrays.buyOut.fields[i]?.id ?? i}>
                                    <TableCell>
                                        <Input
                                            {...register(`buyOuts.${i}.pn`)}
                                            defaultValue={loan?.pn}
                                            readOnly
                                            className="h-8 font-mono text-xs bg-muted/50"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            {...register(`buyOuts.${i}.name`)}
                                            defaultValue={loan?.name}
                                            readOnly
                                            className="h-8 text-xs bg-muted/50"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            {...register(`buyOuts.${i}.amortization`, {
                                                valueAsNumber: true,
                                            })}
                                            defaultValue={loan?.amortization}
                                            readOnly
                                            className="h-8 text-right text-xs bg-muted/50"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            {...register(`buyOuts.${i}.outstandingBalance`, {
                                                valueAsNumber: true,
                                            })}
                                            defaultValue={loan?.outstandingBalance}
                                            readOnly
                                            className="h-8 text-right text-xs bg-muted/50"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <TransferActionMenu
                                            currentSection="buyout"
                                            onTransfer={(target) =>
                                                handleTransfer(
                                                    "buyout",
                                                    arrays.buyOut.fields[i]?.id ?? "",
                                                    target,
                                                )
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {watchedBuyouts.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        className="text-center text-xs text-muted-foreground py-4"
                                    >
                                        No external buy-outs added.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* ── Incoming / Undeducted ───────────────────────────── */}
                <div className="p-4">
                    <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
                        <ArrowLineDown size={16} weight="bold" className="text-primary" />{" "}
                        Incoming / Undeducted Loans
                    </h3>
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
                                <TableRow key={arrays.incoming.fields[i]?.id ?? i}>
                                    <TableCell>
                                        <Input
                                            {...register(`incomingLoans.${i}.name`)}
                                            defaultValue={loan?.name}
                                            readOnly
                                            className="h-8 text-xs bg-muted/50"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            {...register(`incomingLoans.${i}.deductions`, {
                                                valueAsNumber: true,
                                            })}
                                            defaultValue={loan?.deductions}
                                            readOnly
                                            className="h-8 text-right text-xs bg-muted/50"
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
                                        <TransferActionMenu
                                            currentSection="incoming"
                                            onTransfer={(target) =>
                                                handleTransfer(
                                                    "incoming",
                                                    arrays.incoming.fields[i]?.id ?? "",
                                                    target,
                                                )
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {watchedIncoming.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="text-center text-xs text-muted-foreground py-4"
                                    >
                                        No incoming loans declared.
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
