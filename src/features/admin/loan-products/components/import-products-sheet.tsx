import { useRef, useState, type ChangeEvent } from "react";
import { toastSuccess, toastError } from "@/src/components/ui/toast";
import { Download, FileArrowUp, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/src/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/src/components/ui/sheet";
import { Spinner } from "@/src/components/ui/spinner";
import {
    downloadLoanProductTemplate,
    importLoanProducts,
    type LoanProductImportResult,
} from "../api/loan-products";
import { getErrorMessage } from "@/src/lib/apiClient";
import { cn } from "@/src/shared/lib/utils";

/** 10 MB ceiling — matches the "Up to 10 MB" copy in the upload UI. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** Error list cap — the full set is always available via the CSV report. */
const VISIBLE_ERRORS = 50;

interface ImportProductsSheetProps {
    open: boolean;
    onClose: () => void;
}

export function ImportProductsSheet({ open, onClose }: ImportProductsSheetProps) {
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<LoanProductImportResult | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const reset = () => {
        setFile(null);
        setResult(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const selected = event.target.files?.[0];
        if (!selected) return;
        if (!selected.name.endsWith(".xlsx")) {
            toastError("Only .xlsx files are supported.");
            return;
        }
        if (selected.size > MAX_FILE_BYTES) {
            toastError("File size exceeds the 10 MB limit.");
            return;
        }
        setFile(selected);
    };

    const handleDownloadTemplate = async () => {
        try {
            await downloadLoanProductTemplate();
        } catch (error) {
            toastError(getErrorMessage(error));
        }
    };

    const handleImport = async () => {
        if (!file) return;
        setIsImporting(true);
        try {
            const importResult = await importLoanProducts(file);
            setResult(importResult);
            if (importResult.created + importResult.updated > 0)
                toastSuccess(
                    `Imported ${importResult.created + importResult.updated} product${
                        importResult.created + importResult.updated === 1 ? "" : "s"
                    } (${importResult.created} created, ${importResult.updated} updated).`
                );
            if (importResult.failed > 0)
                toastError(
                    `${importResult.failed} row${importResult.failed === 1 ? "" : "s"} skipped — see the report in the sheet.`
                );
        } catch (error) {
            toastError(getErrorMessage(error));
        } finally {
            setIsImporting(false);
        }
    };

    const handleDownloadErrorReport = () => {
        if (!result || result.errors.length === 0) return;
        const headers = ["Row", "Field", "Error"];
        const rows = result.errors.map((e: { rowNumber: number; field: string; error: string }) => [String(e.rowNumber), e.field, e.error]);
        // BOM prefix forces Excel to interpret the file as UTF-8.
        const csv =
            "\uFEFF" +
            [headers, ...rows]
                .map((r: string[]) => r.map((c: string) => `"${c.replace(/"/g, '""')}"`).join(","))
                .join("\r\n");
        const url = URL.createObjectURL(
            new Blob([csv], { type: "text/csv;charset=utf-8;" })
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = `product-import-errors-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
            <SheetContent side="right" className="sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Import loan products</SheetTitle>
                    <SheetDescription>
                        Upload an Excel file to create or update multiple loan products. Existing
                        codes are updated; new codes are created. Checklist documents must be
                        configured separately.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pt-2 pb-4">
                    {result ? (
                        <div role="status" className="flex flex-col gap-6">
                            <div className="grid grid-cols-2 gap-3">
                                <SummaryCard
                                    label="Created"
                                    value={result.created}
                                    tone="success"
                                />
                                <SummaryCard
                                    label="Updated"
                                    value={result.updated}
                                    tone="info"
                                />
                            </div>

                            {result.errors.length > 0 && (
                                <section className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="flex items-center gap-1.5 text-sm font-medium">
                                            <WarningCircle
                                                size={14}
                                                weight="fill"
                                                className="text-destructive"
                                            />
                                            Skipped rows
                                        </h3>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5 text-xs"
                                            onClick={handleDownloadErrorReport}
                                        >
                                            <Download size={12} weight="bold" /> Error report
                                        </Button>
                                    </div>
                                    <ul className="divide-y rounded-md border">
                                        {result.errors
                                            .slice(0, VISIBLE_ERRORS)
                                            .map((error: { rowNumber: number; field: string; error: string }) => (
                                                <li
                                                    key={`${error.rowNumber}-${error.field}`}
                                                    className="space-y-0.5 px-3 py-2"
                                                >
                                                    <p className="text-xs font-medium">
                                                        Excel row {error.rowNumber}{" "}
                                                        <span className="font-normal text-muted-foreground">
                                                            · {error.field}
                                                        </span>
                                                    </p>
                                                    <p className="break-words text-xs text-destructive">
                                                        {error.error}
                                                    </p>
                                                </li>
                                            ))}
                                    </ul>
                                    {result.errors.length > VISIBLE_ERRORS && (
                                        <p className="text-center text-xs text-muted-foreground">
                                            Showing {VISIBLE_ERRORS} of {result.errors.length}{" "}
                                            — download the report for the full list.
                                        </p>
                                    )}
                                </section>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center transition-colors hover:bg-muted/40">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx"
                                    className="sr-only"
                                    onChange={handleFileChange}
                                />
                                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                                    <FileArrowUp
                                        size={20}
                                        weight="duotone"
                                        className="text-muted-foreground"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">
                                        {file ? file.name : "Choose an .xlsx file"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {file
                                            ? `${(file.size / 1024).toFixed(0)} KB — ready to import`
                                            : "Up to 10 MB. Use the template for the correct columns."}
                                    </p>
                                </div>
                            </label>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 self-center text-xs"
                                onClick={handleDownloadTemplate}
                            >
                                <Download size={14} weight="bold" /> Download template
                            </Button>

                            <ul className="space-y-1 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                                <li>
                                    Required: code, description, min/max amounts, min/max term days.
                                </li>
                                <li>
                                    Optional: fees, rates, amortization mode, charge advance interest (default to 0/DIM/No).
                                </li>
                                <li>Existing codes are updated; new codes are created.</li>
                                <li>Updating an existing code: blank cells keep the current value.</li>
                                <li>Empty rows in the file are ignored.</li>
                                <li>Row numbers in errors match the Excel file (header is row 1).</li>
                                <li>
                                    Checklist documents are not imported — configure after import.
                                </li>
                            </ul>
                        </div>
                    )}
                </div>

                <SheetFooter className="-mx-4 mt-auto gap-2 border-t bg-muted/30">
                    {result ? (
                        <>
                            <Button variant="outline" onClick={reset}>
                                Import another file
                            </Button>
                            <Button onClick={handleClose}>Done</Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={!file || isImporting}
                            >
                                {isImporting && <Spinner className="mr-1.5 h-4 w-4" />}
                                {isImporting ? "Importing…" : "Import products"}
                            </Button>
                        </>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

function SummaryCard({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone?: "success" | "info" | "danger";
}) {
    return (
        <div
            className={cn(
                "flex min-w-0 flex-col items-center gap-0.5 rounded-md border px-2 py-3",
                tone === "success" && "border-emerald-600/25 bg-emerald-500/10",
                tone === "info" && "border-blue-600/25 bg-blue-500/10",
                tone === "danger" && "border-red-600/25 bg-red-500/10"
            )}
        >
            <span
                className={cn(
                    "text-xl font-semibold tabular-nums",
                    tone === "success" && "text-emerald-700 dark:text-emerald-400",
                    tone === "info" && "text-blue-700 dark:text-blue-400",
                    tone === "danger" && "text-red-700 dark:text-red-400"
                )}
            >
                {value}
            </span>
            <span className="truncate text-xs text-muted-foreground">{label}</span>
        </div>
    );
}
