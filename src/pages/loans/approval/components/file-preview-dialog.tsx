import { useEffect, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
    X,
    DownloadSimple,
    Printer,
    WarningCircle,
    ArrowsOut,
    ArrowsIn,
    CircleNotch,
} from "@phosphor-icons/react";

import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import { attachmentUrl } from "@/src/lib/api/loan-review";

interface FilePreviewDialogProps {
    open: boolean;
    onClose: () => void;
    attachment: {
        id: number;
        fileName: string;
        contentType: string;
    } | null;
}

export function FilePreviewDialog({
    open,
    onClose,
    attachment,
}: FilePreviewDialogProps) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);

    // Reset state whenever the previewed file changes.
    useEffect(() => {
        if (open) {
            setLoaded(false);
            setLoadError(false);
            setFullscreen(false);
        }
    }, [open, attachment?.id]);

    if (!attachment) return null;

    const isPdf =
        attachment.contentType.toLowerCase() === "application/pdf";
    const isImage = /^image\/(png|jpe?g|gif)$/i.test(attachment.contentType);
    const previewable = isPdf || isImage;
    const inlineUrl = attachmentUrl(attachment.id, "inline");
    const downloadUrl = attachmentUrl(attachment.id, "attachment");

    const handlePrint = () => {
        if (isPdf && iframeRef.current?.contentWindow) {
            try {
                iframeRef.current.contentWindow.focus();
                iframeRef.current.contentWindow.print();
            } catch {
                window.open(downloadUrl, "_blank", "noopener");
            }
        } else {
            const w = window.open(downloadUrl, "_blank", "noopener");
            w?.addEventListener("load", () => {
                setTimeout(() => w.print(), 250);
            });
        }
    };

    const handleDownload = () => {
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = attachment.fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    return (
        <DialogPrimitive.Root
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) onClose();
            }}
        >
            <DialogPrimitive.Portal>
                <DialogPrimitive.Backdrop
                    className={cn(
                        "fixed inset-0 z-[60] bg-black/60 text-xs/relaxed transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-sm",
                    )}
                />
                <DialogPrimitive.Viewport
                    className={cn(
                        "fixed inset-0 z-[60] flex items-center justify-center p-4",
                        fullscreen && "items-stretch justify-stretch p-0",
                    )}
                >
                    <DialogPrimitive.Popup
                        className={cn(
                            "relative flex flex-col overflow-hidden bg-popover text-popover-foreground shadow-2xl outline-none transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0",
                            fullscreen
                                ? "h-full w-full"
                                : "h-[85vh] w-[90vw] max-w-5xl rounded-lg",
                        )}
                    >
                        {/* Header */}
                        <header className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
                            <div className="min-w-0 flex-1">
                                <p
                                    className="truncate text-sm font-medium"
                                    title={attachment.fileName}
                                >
                                    {attachment.fileName}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    {attachment.contentType}
                                </p>
                            </div>

                            <div className="flex items-center gap-1">
                                {previewable && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={
                                            fullscreen
                                                ? "Exit fullscreen"
                                                : "Fullscreen"
                                        }
                                        onClick={() =>
                                            setFullscreen((f) => !f)
                                        }
                                    >
                                        {fullscreen ? (
                                            <ArrowsIn size={16} />
                                        ) : (
                                            <ArrowsOut size={16} />
                                        )}
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Print"
                                    disabled={!previewable}
                                    onClick={handlePrint}
                                    title={
                                        previewable
                                            ? "Print this file"
                                            : "Download to print"
                                    }
                                >
                                    <Printer size={16} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Download"
                                    onClick={handleDownload}
                                >
                                    <DownloadSimple size={16} />
                                </Button>
                                <div
                                    className="mx-1 h-5 w-px bg-border"
                                    aria-hidden
                                />
                                <DialogPrimitive.Close
                                    render={
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label="Close preview"
                                        />
                                    }
                                >
                                    <X size={16} />
                                </DialogPrimitive.Close>
                            </div>
                        </header>

                        {/* Body */}
                        <div className="relative flex-1 overflow-hidden bg-muted/30">
                            {!previewable ? (
                                <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                                    <WarningCircle
                                        size={32}
                                        weight="fill"
                                        className="text-amber-500"
                                    />
                                    <h3 className="text-sm font-semibold">
                                        Preview not available
                                    </h3>
                                    <p className="max-w-sm text-sm text-muted-foreground">
                                        This file type ({attachment.contentType}
                                        ) cannot be previewed in the browser.
                                        Download to open it in the appropriate
                                        application.
                                    </p>
                                    <Button
                                        className="gap-2"
                                        onClick={handleDownload}
                                    >
                                        <DownloadSimple size={15} /> Download
                                        to view
                                    </Button>
                                </div>
                            ) : isPdf ? (
                                <>
                                    {!loaded && !loadError && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <CircleNotch
                                                    size={22}
                                                    className="animate-spin"
                                                />
                                                <span className="text-xs">
                                                    Loading preview…
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    <iframe
                                        ref={iframeRef}
                                        src={inlineUrl}
                                        title={`Preview: ${attachment.fileName}`}
                                        className={cn(
                                            "h-full w-full border-0",
                                            !loaded && "invisible",
                                        )}
                                        onLoad={() => setLoaded(true)}
                                        onError={() => setLoadError(true)}
                                    />
                                    {loadError && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background">
                                            <WarningCircle
                                                size={32}
                                                weight="fill"
                                                className="text-destructive"
                                            />
                                            <p className="text-sm">
                                                Preview could not be loaded.
                                            </p>
                                            <Button
                                                variant="outline"
                                                className="gap-2"
                                                onClick={handleDownload}
                                            >
                                                <DownloadSimple size={15} />{" "}
                                                Download instead
                                            </Button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex h-full items-center justify-center overflow-auto p-4">
                                    <img
                                        src={inlineUrl}
                                        alt={attachment.fileName}
                                        className="max-h-full max-w-full object-contain shadow-md"
                                        onLoad={() => setLoaded(true)}
                                        onError={() => setLoadError(true)}
                                    />
                                </div>
                            )}
                        </div>
                    </DialogPrimitive.Popup>
                </DialogPrimitive.Viewport>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
