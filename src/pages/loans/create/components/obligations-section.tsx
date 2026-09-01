import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";

export function ObligationsSection() {
    const { control } = useFormContext();

    // Manage the array of outstanding loans
    const { fields: outstandingLoans } = useFieldArray({
        control,
        name: "outstandingLoans",
    });

    // Watch the array to calculate totals dynamically
    const watchedLoans = useWatch({ control, name: "outstandingLoans" });

    const totalOutstanding = watchedLoans?.reduce((sum, loan) => sum + (loan.outstandingBalance || 0), 0) || 0;

    return (
        <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">4. Outstanding Loans</CardTitle>
                    <div className="text-sm text-muted-foreground">
                        Total Outstanding: <span className="font-bold text-foreground">₱{totalOutstanding.toLocaleString()}</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow>
                            <TableHead>PN</TableHead>
                            <TableHead>Principal Balance</TableHead>
                            <TableHead>Amortization</TableHead>
                            <TableHead>Outstanding Balance</TableHead>
                            <TableHead>Date Granted</TableHead>
                            <TableHead>Date Maturity</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {outstandingLoans.map((field) => (
                            <TableRow key={field.id} className="hover:bg-muted/30">
                                <TableCell className="font-mono text-xs">{field.pn}</TableCell>
                                <TableCell>₱{field.principalBalance?.toLocaleString()}</TableCell>
                                <TableCell>₱{field.amortization?.toLocaleString()}</TableCell>
                                <TableCell className="font-semibold">₱{field.outstandingBalance?.toLocaleString()}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {field.dateGranted ? new Date(field.dateGranted).toLocaleDateString() : "—"}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {field.dateMaturity ? new Date(field.dateMaturity).toLocaleDateString() : "—"}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="font-normal text-xs">{field.status}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        {outstandingLoans.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-4">
                                    No outstanding loans found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
