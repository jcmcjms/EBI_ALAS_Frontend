/**
 * TransferActionMenu
 * ------------------
 * A small dropdown trigger attached to every loan row in the four
 * sections of the loan creation wizard. It exposes the three
 * "Transfer to ..." targets that are not the row's current section.
 *
 * Implementation note: this project uses `@base-ui/react`'s `Menu`
 * primitives (see `src/components/ui/dropdown-menu.tsx`), so the
 * trigger composes the underlying `Button` via the `render` prop
 * instead of the Radix-style `asChild`.
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
    /** The section this row currently lives in. */
    currentSection: LoanSection;
    /** Invoked with the chosen target section when the user picks one. */
    onTransfer: (target: LoanSection) => void;
}

const ALL_TARGETS: { id: LoanSection; label: string }[] = [
    { id: "outstanding", label: LOAN_SECTION_LABELS.outstanding },
    { id: "ebi", label: LOAN_SECTION_LABELS.ebi },
    { id: "buyout", label: LOAN_SECTION_LABELS.buyout },
    { id: "incoming", label: LOAN_SECTION_LABELS.incoming },
];

export function TransferActionMenu({ currentSection, onTransfer }: TransferActionMenuProps) {
    const targets = ALL_TARGETS.filter((t) => t.id !== currentSection);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Transfer loan to another section"
                    />
                }
            >
                <DotsThreeVertical size={16} weight="bold" className="text-muted-foreground" />
                <span className="sr-only">Open transfer menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Transfer to</DropdownMenuLabel>
                    {targets.map((target) => (
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
