import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/src/components/ui/sheet";
import { Button } from "@/src/components/ui/button";
import { WarningCircle } from "@phosphor-icons/react";

interface ConfirmActionSheetProps {
    open: boolean;
    onClose: () => void;
    title: string;
    description: string;
    actionLabel: string;
    /** Renders destructive styling and a warning icon. */
    destructive?: boolean;
    onConfirm: () => void;
}

export function ConfirmActionSheet({
    open,
    onClose,
    title,
    description,
    actionLabel,
    destructive = false,
    onConfirm,
}: ConfirmActionSheetProps) {
    return (
        <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
            <SheetContent side="right" showCloseButton={false} className="flex flex-col p-0 sm:max-w-[420px]">
                <SheetHeader className={destructive ? "p-6 pb-4" : "p-6 pb-4 border-b bg-muted/30"}>
                    <div className="flex items-start gap-3">
                        {destructive && (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                                <WarningCircle size={20} weight="fill" className="text-red-600 dark:text-red-400" />
                            </div>
                        )}
                        <div>
                            <SheetTitle>{title}</SheetTitle>
                            <SheetDescription className="mt-1">{description}</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <SheetFooter className="flex flex-row gap-2 border-t bg-muted/10 p-4">
                    <Button variant="outline" className="h-9" onClick={onClose}>Cancel</Button>
                    <Button
                        variant={destructive ? "destructive" : "default"}
                        className="h-9"
                        onClick={onConfirm}
                    >
                        {actionLabel}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
