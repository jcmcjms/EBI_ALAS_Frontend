import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function ObligationsSection() {
    const { control, register } = useFormContext();

    // Manage the array of outstanding loans
    const { fields: outstandingLoans } = useFieldArray({
        control,
        name: "outstandingLoans",
    });

    // Watch the array to calculate totals dynamically
    const watchedLoans = useWatch({ control, name: "outstandingLoans" });

    const totalOutstanding = watchedLoans?.reduce((sum, loan) => sum + (loan.outstandingBalance || 0), 0) || 0;
    const totalSelectedPayoff = watchedLoans?.reduce((sum, loan) => sum + (loan.payToClose ? (loan.outstandingBalance || 0) : 0), 0) || 0;

    return (
        <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">4. Existing Obligations & Consolidation</CardTitle>
                    <div className="flex gap-4 text-sm">
                        <div className="text-muted-foreground">Total Outstanding: <span className="font-bold text-foreground">₱{totalOutstanding.toLocaleString()}</span></div>
                        <div className="text-muted-foreground">Selected for Payoff: <span className="font-bold text-red-600">₱{totalSelectedPayoff.toLocaleString()}</span></div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow>
                            <TableHead className="w-[50px]">Payoff?</TableHead>
                            <TableHead>Promissory Note (PN)</TableHead>
                            <TableHead>Principal Balance</TableHead>
                            <TableHead>Amortization</TableHead>
                            <TableHead>Outstanding Balance</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {outstandingLoans.map((field, index) => (
                            <TableRow key={field.id} className="hover:bg-muted/30">
                                <TableCell>
                                    <Checkbox {...register(`outstandingLoans.${index}.payToClose` as const)} />
                                </TableCell>
                                <TableCell className="font-mono text-xs">{field.pn}</TableCell>
                                <TableCell>₱{field.principalBalance?.toLocaleString()}</TableCell>
                                <TableCell>₱{field.amortization?.toLocaleString()}</TableCell>
                                <TableCell className="font-semibold">₱{field.outstandingBalance?.toLocaleString()}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="font-normal text-xs">{field.status}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}