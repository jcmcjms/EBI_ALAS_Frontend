import * as React from "react";
import { Dialog as AlertDialogPrimitive } from "@base-ui/react/dialog";

import { cn } from "@/src/lib/utils";
import { buttonVariants } from "@/src/components/ui/button";

function AlertDialog({ ...props }: AlertDialogPrimitive.Root.Props) {
    return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({ ...props }: AlertDialogPrimitive.Trigger.Props) {
    return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal({ ...props }: AlertDialogPrimitive.Portal.Props) {
    return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

function AlertDialogOverlay({
    className,
    ...props
}: AlertDialogPrimitive.Backdrop.Props) {
    return (
        <AlertDialogPrimitive.Backdrop
            data-slot="alert-dialog-overlay"
            className={cn(
                "fixed inset-0 z-50 bg-black/40 text-xs/relaxed transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
                className
            )}
            {...props}
        />
    );
}

function AlertDialogContent({
    className,
    children,
    ...props
}: AlertDialogPrimitive.Popup.Props) {
    return (
        <AlertDialogPortal>
            <AlertDialogOverlay />
            <AlertDialogPrimitive.Viewport
                data-slot="alert-dialog-viewport"
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <AlertDialogPrimitive.Popup
                    data-slot="alert-dialog-content"
                    className={cn(
                        "relative grid w-full max-w-lg gap-3 rounded-lg border bg-popover p-6 shadow-lg text-xs/relaxed text-popover-foreground outline-none transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0",
                        className
                    )}
                    {...props}
                >
                    {children}
                </AlertDialogPrimitive.Popup>
            </AlertDialogPrimitive.Viewport>
        </AlertDialogPortal>
    );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="alert-dialog-header"
            className={cn("flex flex-col gap-1 text-left", className)}
            {...props}
        />
    );
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="alert-dialog-footer"
            className={cn(
                "mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2",
                className
            )}
            {...props}
        />
    );
}

function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props) {
    return (
        <AlertDialogPrimitive.Title
            data-slot="alert-dialog-title"
            className={cn(
                "font-heading text-base font-semibold text-foreground",
                className
            )}
            {...props}
        />
    );
}

function AlertDialogDescription({
    className,
    ...props
}: AlertDialogPrimitive.Description.Props) {
    return (
        <AlertDialogPrimitive.Description
            data-slot="alert-dialog-description"
            className={cn("text-xs/relaxed text-muted-foreground", className)}
            {...props}
        />
    );
}

/**
 * Visual + a11y wrapper for the destructive confirm button.
 * Renders an unstyled <button> styled with our Button variants so it
 * inherits theme + disabled handling. base-ui `Dialog.Close` semantics
 * still apply because the parent primitive closes on outside/escape.
 */
const AlertDialogAction = React.forwardRef<
    HTMLButtonElement,
    React.ComponentProps<"button">
>(({ className, ...props }, ref) => (
    <button
        ref={ref}
        data-slot="alert-dialog-action"
        className={cn(buttonVariants(), className)}
        {...props}
    />
));
AlertDialogAction.displayName = "AlertDialogAction";

/**
 * Cancel button — closes the dialog without performing the action.
 */
function AlertDialogClose({ ...props }: AlertDialogPrimitive.Close.Props) {
    return <AlertDialogPrimitive.Close data-slot="alert-dialog-close" {...props} />;
}

const AlertDialogCancel = React.forwardRef<
    HTMLButtonElement,
    React.ComponentProps<"button">
>(({ className, ...props }, ref) => (
    <AlertDialogClose
        render={
            <button
                ref={ref}
                className={cn(buttonVariants({ variant: "outline" }), className)}
                {...props}
            />
        }
    />
));
AlertDialogCancel.displayName = "AlertDialogCancel";

export {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogPortal,
    AlertDialogOverlay,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogClose,
};