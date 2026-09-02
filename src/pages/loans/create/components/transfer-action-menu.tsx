/**
 * TransferActionMenu
 * ------------------
 * A small dropdown trigger attached to every row in the Outstanding
 * Loans section. It lets the AO reclassify a loan from the
 * backend-sourced "Outstanding" list into one of the three
 * user-managed reclassification tables in section 5
 * (EBI Reloans / Buy-Outs / Incoming).
 *
 * ── Why only on Outstanding, and only targeting section 5 ───────────
 * Outstanding Loans is the single source of truth — it is populated
 * from the backend and is treated as read-only by the wizard. The
 * three section-5 tables are the AO's reclassification of those
 * obligations: each row in those tables corresponds to an Outstanding
 * row that the AO has decided should be tracked a different way.
 *
 * Because of that relationship, the reclassification is intentionally
 * one-way:
 *   • Only Outstanding rows expose the transfer menu.
 *   • The only valid targets are the three section-5 sections
 *     (EBI / Buy-Outs / Incoming). A reclassification is never
 *     "back" into Outstanding — Outstanding is always the canonical
 *     source, and re-merging would just duplicate data.
 *
 * If the component is ever mounted on a non-Outstanding row (a
 * programming error), it renders nothing rather than offering an
 * invalid action, and the hook also rejects the call as a second
 * line of defense.
 *
 * ── Implementation note ──────────────────────────────────────────────
 * This project uses `@base-ui/react`'s `Menu` primitives (see
 * `src/components/ui/dropdown-menu.tsx`), so the trigger composes
 * the underlying `Button` via the `render` prop instead of the
 * Radix-style `asChild`. The label and items live inside a
 * `DropdownMenuGroup` to satisfy base-ui's `MenuGroupContext`
 * contract.
 */

import { DotsThreeVertical } from "@phosphor-icons/react";

import { Button } from "@/src/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";

import { LOAN_SECTION_LABELS, type LoanSection } from "../utils/loan-transfer-utils";

interface TransferActionMenuProps {
    /**
     * The section this row currently lives in. The transfer action is
     * only meaningful when this is `"outstanding"`. The component
     * renders `null` for any other value so a stray mount cannot
     * offer an invalid transfer target.
     */
    currentSection: LoanSection;
    /** Invoked with the chosen target section when the user picks one. */
    onTransfer: (target: LoanSection) => void;
}

/**
 * The set of valid transfer destinations. Section-5 only.
 * Ordered to match the order in which they appear on the wizard page.
 */
const SECTION5_TARGETS: { id: LoanSection; label: string }[] = [
    { id: "ebi", label: LOAN_SECTION_LABELS.ebi },
    { id: "buyout", label: LOAN_SECTION_LABELS.buyout },
    { id: "incoming", label: LOAN_SECTION_LABELS.incoming },
];

export function TransferActionMenu({ currentSection, onTransfer }: TransferActionMenuProps) {
    // Reclassifications are one-way: only Outstanding rows can be
    // reclassified, and only into the three section-5 tables.
    if (currentSection !== "outstanding") {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Reclassify loan into another section"
                    />
                }
            >
                <DotsThreeVertical size={16} weight="bold" className="text-muted-foreground" />
                <span className="sr-only">Open reclassify menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Move to</DropdownMenuLabel>
                    {SECTION5_TARGETS.map((target) => (
                        <DropdownMenuItem
                            key={target.id}
                            onClick={() => onTransfer(target.id)}
                            className="cursor-pointer"
                        >
                            {target.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
