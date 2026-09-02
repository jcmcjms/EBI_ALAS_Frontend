/**
 * TransferActionMenu
 * ------------------
 * A small dropdown trigger attached to every row in either the
 * Outstanding Loans section or the EBI Reloans section. It lets the
 * AO move a loan between those two tables.
 *
 * ── Why bidirectional between Outstanding and EBI only ────────────────
 * Under the updated data-flow contract, a loan can be transferred
 * *only* between Outstanding and EBI Accounts:
 *
 *   • Outstanding  ↔  EBI   ← allowed
 *   • Outstanding  →  Buy-Outs / Incoming ← rejected (those tables
 *     are now managed directly via Add/Delete buttons)
 *   • Buy-Outs / Incoming  →  anywhere ← rejected
 *
 * Because `TransferActionMenu` is the only UI surface that initiates
 * a transfer, it must enforce it too: it only mounts on rows whose
 * `currentSection` is `"outstanding"` or `"ebi"`, and its single
 * dropdown item points at the *opposite* section.
 *
 * If the component is ever mounted on a non-Outstanding/non-EBI row
 * (a programming error), it renders nothing rather than offering an
 * invalid action, and the hook also rejects the call as a second line
 * of defence.
 *
 * ── Implementation note ──────────────────────────────────────────────
 * This project uses `@base-ui/react`'s `Menu` primitives (see
 * `src/components/ui/dropdown-menu.tsx`), so the trigger composes the
 * underlying `Button` via the `render` prop instead of the Radix-style
 * `asChild`. The label and item live inside a `DropdownMenuGroup` to
 * satisfy base-ui's `MenuGroupContext` contract.
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
     * only meaningful when this is `"outstanding"` or `"ebi"`. The
     * component renders `null` for any other value so a stray mount
     * cannot offer an invalid transfer target.
     */
    currentSection: LoanSection;
    /** Invoked with the chosen target section when the user picks one. */
    onTransfer: (target: LoanSection) => void;
}

/**
 * Sections eligible for the bidirectional transfer menu. Any other
 * value of `currentSection` causes the component to render `null`.
 */
const TRANSFER_ELIGIBLE_SECTIONS = ["outstanding", "ebi"] as const;

export function TransferActionMenu({ currentSection, onTransfer }: TransferActionMenuProps) {
    // Transfers are strictly bidirectional between Outstanding and EBI.
    // Any other section is ineligible — render nothing rather than
    // exposing an invalid target.
    if (
        !(
            (TRANSFER_ELIGIBLE_SECTIONS as readonly string[]).includes(currentSection)
        )
    ) {
        return null;
    }

    const targetSection: LoanSection =
        currentSection === "outstanding" ? "ebi" : "outstanding";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Transfer to ${LOAN_SECTION_LABELS[targetSection]}`}
                    />
                }
            >
                <DotsThreeVertical size={16} weight="bold" className="text-muted-foreground" />
                <span className="sr-only">Open transfer menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Move to</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => onTransfer(targetSection)}
                        className="cursor-pointer"
                    >
                        {LOAN_SECTION_LABELS[targetSection]}
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}