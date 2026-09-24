/**
 * Shared loading/empty/error states for the Account feature.
 *
 * These are presentation-only — they receive no hooks or data.
 */

import type { ComponentType, ReactNode } from "react";
import { ArrowClockwise, CircleDashed, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
    return (
        <div
            role="status"
            className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"
        >
            <Spinner className="h-4 w-4" />
            <span>{label}</span>
        </div>
    );
}

interface EmptyStateProps {
    title: string;
    hint?: string;
    action?: ReactNode;
    icon?: ComponentType<{ size?: number; weight?: "bold" | "duotone"; className?: string }>;
}

export function EmptyState({
    title,
    hint,
    action,
    icon: Icon = CircleDashed,
}: EmptyStateProps) {
    return (
        <div role="status" className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <Icon size={20} weight="duotone" className="text-muted-foreground" />
            </div>
            <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{title}</p>
                {hint && (
                    <p className="mx-auto max-w-[320px] text-xs text-muted-foreground">
                        {hint}
                    </p>
                )}
            </div>
            {action}
        </div>
    );
}

export function ErrorState({
    message,
    onRetry,
}: {
    message: string;
    onRetry: () => void;
}) {
    return (
        <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <WarningCircle size={20} weight="duotone" className="text-muted-foreground" />
            </div>
            <p className="mx-auto max-w-[320px] text-xs text-muted-foreground">{message}</p>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onRetry}>
                <ArrowClockwise size={14} weight="bold" /> Try again
            </Button>
        </div>
    );
}
