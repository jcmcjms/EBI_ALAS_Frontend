import { DotsThreeVertical } from '@phosphor-icons/react'

import { Button } from '@/src/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu'

import {
  LOAN_SECTION_LABELS,
  type LoanSection,
} from '@/src/features/loans/utils/loan-transfer-utils'

interface TransferActionMenuProps {
  currentSection: LoanSection

  onTransfer: (target: LoanSection) => void
}

const TRANSFER_ELIGIBLE_SECTIONS = ['outstanding', 'ebi'] as const

export function TransferActionMenu({
  currentSection,
  onTransfer,
}: TransferActionMenuProps) {
  if (
    !(TRANSFER_ELIGIBLE_SECTIONS as readonly string[]).includes(currentSection)
  ) {
    return null
  }

  const targetSection: LoanSection =
    currentSection === 'outstanding' ? 'ebi' : 'outstanding'

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
        <DotsThreeVertical
          size={16}
          weight="bold"
          className="text-muted-foreground"
        />
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
  )
}
