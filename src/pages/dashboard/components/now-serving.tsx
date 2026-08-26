import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { nowServingData } from "../data/dummy-data";

export function NowServing() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                    Now Serving
                    <Badge variant="success">{nowServingData.length}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">#</TableHead>
                            <TableHead>Checker</TableHead>
                            <TableHead className="text-right">LAM ID</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {nowServingData.map((item) => (
                            <TableRow key={item.lamId}>
                                <TableCell className="font-medium">#{item.number}</TableCell>
                                <TableCell>{item.checker}</TableCell>
                                <TableCell className="text-right font-mono">{item.lamId}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}