import { useFormContext, useFieldArray } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Input } from "@/src/components/ui/input";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Bank, CreditCard, ArrowLineDown } from "@phosphor-icons/react";

export function OtherObligationsSection() {
    const { control, register } = useFormContext();

    const { fields: reloans } = useFieldArray({ control, name: "ebiReloans" });
    const { fields: buyouts } = useFieldArray({ control, name: "buyOuts" });
    const { fields: incoming } = useFieldArray({ control, name: "incomingLoans" });

    return (
        <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
                <CardTitle className="text-lg">5. EBI, Buy-Outs & Incoming Loans</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y">

                {/* EBI Reloans */}
                <div className="p-4">
                    <div className="mb-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Bank size={16} weight="bold" className="text-primary" /> EBI Accounts for Reloans
                        </h3>
                    </div>
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead className="w-[50px]">Pay to Close?</TableHead>
                            <TableHead>PN / Account No.</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead className="text-right">Existing Deduction</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {reloans.map((field, i) => (
                                <TableRow key={field.id}>
                                    <TableCell><Checkbox {...register(`ebiReloans.${i}.payToClose` as const)} /></TableCell>
                                    <TableCell><Input {...register(`ebiReloans.${i}.pn`)} readOnly className="h-8 font-mono text-xs bg-muted/50" /></TableCell>
                                    <TableCell><Input {...register(`ebiReloans.${i}.name`)} readOnly className="h-8 text-xs bg-muted/50" /></TableCell>
                                    <TableCell><Input type="number" {...register(`ebiReloans.${i}.existingDeduction`, { valueAsNumber: true })} readOnly className="h-8 text-right text-xs bg-muted/50" /></TableCell>
                                </TableRow>
                            ))}
                            {reloans.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-4">No EBI reloans added.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>

                {/* Buy-Outs from Other FIs */}
                <div className="p-4">
                    <div className="mb-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <CreditCard size={16} weight="bold" className="text-primary" /> Buy-Out Accounts (Other FIs)
                        </h3>
                    </div>
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead>PN / Ref No.</TableHead>
                            <TableHead>Financial Institution / Name</TableHead>
                            <TableHead className="text-right">Monthly Amort</TableHead>
                            <TableHead className="text-right">Outstanding Balance</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {buyouts.map((field, i) => (
                                <TableRow key={field.id}>
                                    <TableCell><Input {...register(`buyOuts.${i}.pn`)} readOnly className="h-8 font-mono text-xs bg-muted/50" /></TableCell>
                                    <TableCell><Input {...register(`buyOuts.${i}.name`)} readOnly className="h-8 text-xs bg-muted/50" /></TableCell>
                                    <TableCell><Input type="number" {...register(`buyOuts.${i}.amortization`, { valueAsNumber: true })} readOnly className="h-8 text-right text-xs bg-muted/50" /></TableCell>
                                    <TableCell><Input type="number" {...register(`buyOuts.${i}.outstandingBalance`, { valueAsNumber: true })} readOnly className="h-8 text-right text-xs bg-muted/50" /></TableCell>
                                </TableRow>
                            ))}
                            {buyouts.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-4">No external buy-outs added.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>

                {/* Incoming / Undeducted */}
                <div className="p-4">
                    <div className="mb-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <ArrowLineDown size={16} weight="bold" className="text-primary" /> Incoming / Undeducted Loans
                        </h3>
                    </div>
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead>Creditor / Name</TableHead>
                            <TableHead className="text-right">Expected Deduction</TableHead>
                            <TableHead>Remarks / Notes</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {incoming.map((field, i) => (
                                <TableRow key={field.id}>
                                    <TableCell><Input {...register(`incomingLoans.${i}.name`)} readOnly className="h-8 text-xs bg-muted/50" /></TableCell>
                                    <TableCell><Input type="number" {...register(`incomingLoans.${i}.deductions`, { valueAsNumber: true })} readOnly className="h-8 text-right text-xs bg-muted/50" /></TableCell>
                                    <TableCell><Input {...register(`incomingLoans.${i}.remarks`)} className="h-8 text-xs" /></TableCell>
                                </TableRow>
                            ))}
                            {incoming.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-4">No incoming loans declared.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>

            </CardContent>
        </Card>
    );
}
