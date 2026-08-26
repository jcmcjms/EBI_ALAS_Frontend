import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { pushBackData } from "../data/dummy-data";

export function PushBack() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                    Push Back
                    <Badge variant="destructive">{pushBackData.length}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">#</TableHead>
                            <TableHead>LAM ID</TableHead>
                            <TableHead>Branch</TableHead>
                            <TableHead className="text-right">Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pushBackData.map((item) => (
                            <TableRow key={item.lamId}>
                                <TableCell className="font-medium">#{item.number}</TableCell>
                                <TableCell className="font-mono">{item.lamId}</TableCell>
                                <TableCell>{item.branch}</TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">{item.date}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}