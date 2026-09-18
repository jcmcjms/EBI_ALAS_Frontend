import { useState, type ChangeEvent } from "react";
import { toastSuccess, toastError } from "@/src/components/ui/toast";
import { FileArrowUp, Download } from "@phosphor-icons/react";
import { Button } from "@/src/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/src/components/ui/sheet";
import { Badge } from "@/src/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { downloadImportTemplate, importUsers, type UserImportValidationError } from "@/src/lib/api/users";
import { getErrorMessage } from "@/src/lib/apiClient";

interface ImportUsersSheetProps {
    open: boolean;
    onClose: () => void;
}

export function ImportUsersSheet({ open, onClose }: ImportUsersSheetProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [result, setResult] = useState<{
        totalRows: number;
        successfulImports: number;
        failedImports: number;
        errors: UserImportValidationError[];
        createdUsernames: string[];
    } | null>(null);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;

        if (!selected.name.endsWith(".xlsx")) {
            toastError("Only .xlsx files are supported");
            return;
        }

        if (selected.size > 10 * 1024 * 1024) {
            toastError("File size exceeds 10 MB limit");
            return;
        }

        setFile(selected);
        setResult(null);
    };

    const handleImport = async () => {
        if (!file) return;

        setIsImporting(true);
        try {
            const importResult = await importUsers(file);
            setResult(importResult);

            if (importResult.successfulImports > 0) {
                toastSuccess(`Successfully imported ${importResult.successfulImports} users`, {
                    timeout: 5000,
                });
            }

            if (importResult.failedImports > 0) {
                toastError(`${importResult.failedImports} users failed to import`, {
                    description: "Review the error report below",
                    timeout: 10000,
                });
            }
        } catch (error) {
            toastError(getErrorMessage(error));
        } finally {
            setIsImporting(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            await downloadImportTemplate();
            toastSuccess("Template downloaded");
        } catch (error) {
            toastError(getErrorMessage(error));
        }
    };

    const handleClose = () => {
        setFile(null);
        setResult(null);
        onClose();
    };

    const handleDownloadErrorReport = () => {
        if (!result || result.errors.length === 0) return;

        const headers = ["Row", "Field", "Error"];
        const rows = result.errors.map((e) => [
            String(e.rowNumber),
            e.field,
            e.error,
        ]);

        const csvContent =
            "\uFEFF" + [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\r\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `import-errors-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
            <SheetContent side="right" className="sm:max-w-2xl">
                <SheetHeader>
                    <SheetTitle>Import Users</SheetTitle>
                    <SheetDescription>
                        Upload an Excel file to import multiple users at once. All imported users will be required to
                        change their password on first login.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-6">
                    {!result && (
                        <>
                            <div className="rounded-lg border border-dashed p-6 text-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                                        <FileArrowUp size={24} weight="duotone" className="text-muted-foreground" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">
                                            {file ? file.name : "No file selected"}
                                        </p>
                                        {file && (
                                            <p className="text-xs text-muted-foreground">
                                                {(file.size / 1024).toFixed(2)} KB
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                                            <Download size={14} className="mr-1" /> Download Template
                                        </Button>
                                        <label className="cursor-pointer">
                                            <Button variant="outline" size="sm" type="button" onClick={() => document.getElementById('file-upload')?.click()}>
                                                <FileArrowUp size={14} className="mr-1" /> Choose File
                                            </Button>
                                            <input
                                                id="file-upload"
                                                type="file"
                                                accept=".xlsx"
                                                className="hidden"
                                                onChange={handleFileChange}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground">
                                <p className="mb-2 font-semibold text-foreground">Requirements:</p>
                                <ul className="list-disc space-y-1 pl-4">
                                    <li>File must be .xlsx format (Excel)</li>
                                    <li>Maximum file size: 10 MB</li>
                                    <li>Required fields: Username, First Name, Last Name, Branch Code, Role</li>
                                    <li>Approvers require a valid Job Title (approval authority key)</li>
                                    <li>Duplicate usernames will be skipped</li>
                                    <li>Passwords are auto-generated; users must change on first login</li>
                                </ul>
                            </div>
                        </>
                    )}

                    {result && (
                        <div className="space-y-4">
                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="rounded-lg border p-4 text-center">
                                    <div className="text-2xl font-bold">{result.totalRows}</div>
                                    <div className="text-xs text-muted-foreground">Total Rows</div>
                                </div>
                                <div className="rounded-lg border border-emerald-600/25 bg-emerald-500/10 p-4 text-center">
                                    <div className="text-2xl font-bold text-emerald-700">
                                        {result.successfulImports}
                                    </div>
                                    <div className="text-xs text-emerald-700">Successful</div>
                                </div>
                                <div className="rounded-lg border border-red-600/25 bg-red-500/10 p-4 text-center">
                                    <div className="text-2xl font-bold text-red-700">{result.failedImports}</div>
                                    <div className="text-xs text-red-700">Failed</div>
                                </div>
                            </div>

                            {/* Created usernames */}
                            {result.createdUsernames.length > 0 && (
                                <div>
                                    <p className="mb-2 text-sm font-medium">Created Users:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {result.createdUsernames.slice(0, 10).map((username) => (
                                            <Badge key={username} variant="outline" className="text-xs">
                                                @{username}
                                            </Badge>
                                        ))}
                                        {result.createdUsernames.length > 10 && (
                                            <Badge variant="outline" className="text-xs">
                                                +{result.createdUsernames.length - 10} more
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Errors */}
                            {result.errors.length > 0 && (
                                <div>
                                    <div className="mb-2 flex items-center justify-between">
                                        <p className="text-sm font-medium">Validation Errors:</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleDownloadErrorReport}
                                            className="text-xs"
                                        >
                                            <Download size={12} className="mr-1" /> Download Report
                                        </Button>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto rounded-lg border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[60px]">Row</TableHead>
                                                    <TableHead className="w-[120px]">Field</TableHead>
                                                    <TableHead>Error</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {result.errors.slice(0, 20).map((error, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell className="text-xs">{error.rowNumber}</TableCell>
                                                        <TableCell className="text-xs font-medium">
                                                            {error.field}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-destructive">
                                                            {error.error}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        {result.errors.length > 20 && (
                                            <div className="border-t px-4 py-2 text-center text-xs text-muted-foreground">
                                                Showing 20 of {result.errors.length} errors
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <SheetFooter className="gap-2">
                    <Button variant="outline" onClick={handleClose}>
                        {result ? "Close" : "Cancel"}
                    </Button>
                    {!result && (
                        <Button onClick={handleImport} disabled={!file || isImporting}>
                            {isImporting ? "Importing..." : "Import Users"}
                        </Button>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
