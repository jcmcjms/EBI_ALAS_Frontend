import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    X,
    DownloadSimple,
    Printer,
    WarningCircle,
    ArrowsOut,
    ArrowsIn,
    Spinner as SpinnerIcon,
} from "@phosphor-icons/react";

import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import { canPreviewInline, fetchChecklistDocument } from "@/src/lib/api/loan-review";

interface DocumentPreviewDialogProps {
    open: boolean;
    onClose: () => void;
    doc: { docId: number; fileName: string; contentType: string } | null;
}

/**
 * Inline preview for checklist documents. Bytes arrive through the
 * authenticated API client (Bearer token can't ride on an iframe/img tag),
 * so we render a same-origin blob URL: PDFs get the browser's native viewer
 * (with working in-iframe print), images render directly, Office formats get
 * an honest "download to open" fallback.
 */
export function DocumentPreviewDialog({ open, onClose, doc }: DocumentPreviewDialogProps) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);

    // Fetch (or hit the blob cache) whenever the previewed doc changes.
    const load = useCallback(async () => {
        if (!open || !doc) return;
        setLoading(true);
        setError(false);
        try {
            const blob = await fetchChecklistDocument(doc.docId);
            setObjectUrl(URL.createObjectURL(blob));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [open, doc]);

    useEffect(() => {
        setObjectUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
        void load();
        return () =>
            setObjectUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
            });
    }, [load]);

    // Escape closes; body scroll locks while modal.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, onClose]);

    if (!open || !doc) return null;

    const previewable = canPreviewInline(doc.contentType);
    const isPdf = doc.contentType.toLowerCase() === "application/pdf";

    const handleDownload = () => {
        void (async () => {
            const blob = await fetchChecklistDocument(doc.docId);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = doc.fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        })();
    };

    const handlePrint = () => {
        if (!objectUrl) return;
        if (isPdf && iframeRef.current?.contentWindow) {
            // Same-origin blob URL → the embedded PDF viewer is scriptable.
            try {
                iframeRef.current.contentWindow.focus();
                iframeRef.current.contentWindow.print();
                return;
            } catch {
                /* fall through */
            }
        }
        // Images / fallback: print the document in a clean window so the
        // browser handles scaling + pagination.
        const w = window.open(objectUrl, "_blank", "noopener");
        w?.addEventListener("load", () => setTimeout(() => w.print(), 250));
    };

    return createPortal(
        <div
            className={cn(
                "fixed inset-0 z-[60] flex bg-black/60 backdrop-blur-sm",
                fullscreen ? "items-stretch justify-stretch" : "items-center justify-center",
            )}
            role="dialog"
            aria-modal="true"
            aria-label={`Preview: ${doc.fileName}`}
            onClick={onClose}
        >
            <div
                className={cn(
                    "relative flex flex-col overflow-hidden bg-background shadow-2xl",
                    fullscreen ? "h-full w-full" : "h-[85vh] w-[90vw] max-w-5xl rounded-lg",
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium" title={doc.fileName}>
                            {doc.fileName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{doc.contentType}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        {previewable && (
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                                onClick={() => setFullscreen((f) => !f)}
                            >
                                {fullscreen ? <ArrowsIn size={16} /> : <ArrowsOut size={16} />}
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Print"
                            disabled={!previewable || !objectUrl}
                            title={previewable ? "Print this document" : "Download to print"}
                            onClick={handlePrint}
                        >
                            <Printer size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Download" onClick={handleDownload}>
                            <DownloadSimple size={16} />
                        </Button>
                        <div className="mx-1 h-5 w-px bg-border" aria-hidden />
                        <Button variant="ghost" size="icon" aria-label="Close preview" onClick={onClose}>
                            <X size={16} />
                        </Button>
                    </div>
                </header>

                <div className="relative flex-1 overflow-hidden bg-muted/30">
                    {loading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <SpinnerIcon size={22} className="animate-spin" />
                                <span className="text-xs">Loading document…</span>
                            </div>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                            <WarningCircle size={32} weight="fill" className="text-destructive" />
                            <p className="text-sm">This document could not be loaded.</p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => void load()}>
                                    Retry
                                </Button>
                                <Button size="sm" className="gap-1.5" onClick={handleDownload}>
                                    <DownloadSimple size={14} /> Download instead
                                </Button>
                            </div>
                        </div>
                    )}

                    {!loading && !error && objectUrl && !previewable && (
                        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                            <WarningCircle size={32} weight="fill" className="text-amber-500" />
                            <h3 className="text-sm font-semibold">Preview not available</h3>
                            <p className="max-w-sm text-sm text-muted-foreground">
                                This file type ({doc.contentType}) cannot be rendered in the browser.
                                Download it to open in the appropriate application.
                            </p>
                            <Button className="gap-2" onClick={handleDownload}>
                                <DownloadSimple size={15} /> Download to view
                            </Button>
                        </div>
                    )}

                    {!loading && !error && objectUrl && previewable && (
                        isPdf ? (
                            <iframe
                                ref={iframeRef}
                                src={objectUrl}
                                title={`Preview: ${doc.fileName}`}
                                className="h-full w-full border-0"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center overflow-auto p-4">
                                <img
                                    src={objectUrl}
                                    alt={doc.fileName}
                                    className="max-h-full max-w-full object-contain shadow-md"
                                />
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
