import type { ReactNode } from "react";
import { CloudCheck } from "@phosphor-icons/react";

import { Badge } from "@/src/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { cn } from "@/src/lib/utils";

interface SectionCardProps {
  step: number;
  title: string;
  description?: string;
  icon?: ReactNode;
  /**
   * Section is populated from an upstream system (CIS / preloan /
   * approval-document generator) and needs no Account-Officer action.
   * Surfaces a "System sourced" badge next to the title so the user
   * sees at a glance that nothing here is editable.
   */
  systemSourced?: boolean;
  /** Right-aligned element in the title row (custom badges, totals…). */
  badge?: ReactNode;
  contentClassName?: string;
  children: ReactNode;
}

/**
 * Shared shell for every wizard section.
 *
 * - Heading is focusable (`tabIndex=-1`, `[data-section-heading]`) so
 *   the stepper can move screen-reader focus when navigating.
 * - `scroll-mt-24` reserves room for the sticky page header when the
 *   page-level `scrollToSection` scrolls into view.
 * - Section number and label come from `sections.ts` so the stepper
 *   list, the mobile nav, and the on-page heading can never drift.
 */
export function SectionCard({
  step,
  title,
  description,
  icon,
  systemSourced,
  badge,
  contentClassName,
  children,
}: SectionCardProps) {
  return (
    <Card className="scroll-mt-24">
      <CardHeader className="border-b bg-muted/30 pb-3">
        <CardTitle
          tabIndex={-1}
          data-section-heading
          className="flex flex-wrap items-center gap-2 rounded-md text-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {icon}
          <span className="flex items-center gap-2">
            <span className="tabular-nums text-muted-foreground">{step}.</span>
            <span>{title}</span>
          </span>
          {systemSourced && (
            <Badge variant="outline" className="gap-1 text-xs font-normal">
              <CloudCheck size={12} weight="bold" />
              System sourced
            </Badge>
          )}
          {badge}
        </CardTitle>
        {description && (
          <CardDescription className="pt-1 text-xs">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className={cn("space-y-6 pt-6", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * Decimal sub-heading (1.1, 1.2 …) for nested blocks inside a section.
 * Keeps nesting visually obvious without competing with the section's
 * own step number.
 */
export function SubSectionHeading({
  step,
  title,
  actions,
}: {
  step: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-baseline gap-1.5 text-sm font-semibold">
        <span className="tabular-nums text-muted-foreground">{step}</span>
        <span>{title}</span>
      </h3>
      {actions}
    </div>
  );
}

/**
 * Read-only key/value pair.
 *
 * System-verified data renders as text, not as a disabled input — a
 * grey box reads as "field you forgot to fill in" and forces the AO to
 * verify whether the value is editable.
 */
export function ReadOnlyField({
  label,
  value,
  hint,
}: {
  label: string;
  value?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">
        {value?.trim() ? (
          value
        ) : (
          <span className="font-normal text-muted-foreground">—</span>
        )}
      </dd>
      {hint && (
        <p className="text-[11px] text-muted-foreground/80">{hint}</p>
      )}
    </div>
  );
}