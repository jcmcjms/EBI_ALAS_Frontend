import type { ReactNode } from "react";
import {
    Info,
    MagnifyingGlass,
    PencilLine,
    PaperPlaneTilt,
    Receipt,
    Stack,
} from "@phosphor-icons/react";

import { Button } from "@/src/components/ui/button";

interface WorkflowStep {
    title: string;
    body: string;
    icon: ReactNode;
}

/** Mirrors the live workflow: CIS → LAI → loan-number selection (multi-loan,
 *  max 1 per product) → per-loan encoding tabs → review & submit with the
 *  automatic document-completeness gate. */
const STEPS: WorkflowStep[] = [
    {
        title: "Look up the client",
        body: "Enter the CIS number to pull the borrower's profile, agency details and accounts from the core banking system.",
        icon: <MagnifyingGlass size={15} weight="bold" />,
    },
    {
        title: "Pick the account",
        body: "Choose the Loan Application Index (LAI). Outstanding loans and pending preloans load for that account.",
        icon: <Receipt size={15} weight="bold" />,
    },
    {
        title: "Select loan numbers",
        body: "Tick one or more pending loans — at most one per product. Each selected loan gets its own tab across the form.",
        icon: <Stack size={15} weight="bold" />,
    },
    {
        title: "Encode each loan",
        body: "Per loan: proposed terms, obligations (EBI reloans, buy-outs, incoming), verification findings, remarks and deviations.",
        icon: <PencilLine size={15} weight="bold" />,
    },
    {
        title: "Review & submit",
        body: "Check the per-loan approval forms, then submit for recommendation. The stepper tracks readiness as you go.",
        icon: <PaperPlaneTilt size={15} weight="bold" />,
    },
];

/**
 * Pristine-state orientation: a connected numbered stepper (sequence is the
 * message), a CTA on the only actionable step, and one expectation-setting
 * note about the automatic document hold so a held file never looks "lost".
 */
export function WorkflowOverview() {
    const startLookup = () => {
        const section = document.getElementById("cis-lookup");
        section?.scrollIntoView({ behavior: "smooth", block: "center" });
        section?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    };

    return (
        <section
            aria-label="How the application works"
            className="rounded-md border border-border bg-card shadow-none"
        >
            <header className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold tracking-tight">
                    How a loan application flows
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    Five steps from client lookup to submission — the stepper on the
                    left tracks your progress as sections complete.
                </p>
            </header>

            <ol className="grid gap-6 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-8">
                {STEPS.map((step, i) => (
                    <li key={step.title} className="relative">
                        {/* Connector into the next step (desktop only — on stacked
                            layouts the numbering carries the sequence). */}
                        {i < STEPS.length - 1 && (
                            <span
                                aria-hidden
                                className="absolute left-6 -right-8 top-3 hidden h-px bg-border lg:block"
                            />
                        )}
                        <div className="flex items-center gap-2">
                            <span className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-card text-[11px] font-bold tabular-nums text-primary">
                                {i + 1}
                            </span>
                            <span className="text-primary" aria-hidden>
                                {step.icon}
                            </span>
                            <h3 className="text-sm font-medium">{step.title}</h3>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                            {step.body}
                        </p>
                        {i === 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-3 gap-1.5"
                                onClick={startLookup}
                            >
                                <MagnifyingGlass size={14} weight="bold" />
                                Start client lookup
                            </Button>
                        )}
                    </li>
                ))}
            </ol>

            <footer className="flex items-start gap-2 border-t border-border bg-muted/30 px-4 py-3">
                <Info size={14} weight="bold" className="mt-0.5 shrink-0 text-primary" aria-hidden />
                <p className="text-xs text-muted-foreground">
                    After submission, applications with missing requirements are placed in the{" "}
                    <strong className="font-medium text-foreground">Incomplete Documents</strong>{" "}
                    queue automatically and return to the review queue on their own once every
                    document verifies — no manual follow-up needed.
                </p>
            </footer>
        </section>
    );
}
