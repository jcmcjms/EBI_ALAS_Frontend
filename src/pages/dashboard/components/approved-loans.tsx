import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { approvedLoansData } from "../data/dummy-data";

export function ApprovedLoans() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                    Approved Loans
                    <Badge variant="success">{approvedLoansData.length}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Branch</TableHead>
                            <TableHead>LAM ID</TableHead>
                            <TableHead>Full Name</TableHead>
                            <TableHead className="text-right">Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {approvedLoansData.map((item) => (
                            <TableRow key={item.lamId}>
                                <TableCell>{item.branch}</TableCell>
                                <TableCell className="font-mono">{item.lamId}</TableCell>
                                <TableCell className="font-medium">{item.fullName}</TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">{item.date}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}