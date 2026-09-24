/**
 * Audit log constants — action config, formatting helpers.
 */

import type { ComponentType } from "react";
import {
    ArrowRight,
    FileText,
    Trash,
} from "@phosphor-icons/react";

export interface ActionConfig {
    color: string;
    icon: ComponentType<{ size?: number; weight?: "bold" | "duotone"; className?: string }>;
}

export const ACTION_CONFIG: Record<string, ActionConfig> = {
    Create: {
        color: "bg-green-50 text-green-700 border-green-200",
        icon: FileText,
    },
    Update: {
        color: "bg-blue-50 text-blue-700 border-blue-200",
        icon: ArrowRight,
    },
    StatusChange: {
        color: "bg-purple-50 text-purple-700 border-purple-200",
        icon: FileText,
    },
    Delete: {
        color: "bg-red-50 text-red-700 border-red-200",
        icon: Trash,
    },
};

export const DEFAULT_ACTION_CONFIG: ActionConfig = {
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: ArrowRight,
};

export function formatAuditDate(iso: string): string {
    return new Date(iso).toLocaleString("en-PH", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/** Delay before the search input triggers an API call. */
export const SEARCH_DEBOUNCE_MS = 300;
