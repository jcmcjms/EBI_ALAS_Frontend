import { ArrowLeft, Globe } from '@phosphor-icons/react'
import { Badge } from '@/src/shared/ui/badge'
import { Button } from '@/src/shared/ui/button'

interface DeskHeaderProps {
  deskLabel: string
  scopeDescription?: string | null
  onBack: () => void
}

export function DeskHeader({ deskLabel, scopeDescription, onBack }: DeskHeaderProps) {
  return (
    <header className="sticky top-[var(--header-height)] z-30 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center gap-3 px-6">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label="Back to monitoring"
        >
          <ArrowLeft size={16} weight="bold" />
        </Button>
        <h1 className="text-sm font-semibold tracking-tight">Review Desk</h1>
        <Badge variant="secondary">{deskLabel}</Badge>
        {scopeDescription && (
          <span className="ml-auto flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
            <Globe size={12} weight="bold" className="shrink-0" />
            <span className="truncate">{scopeDescription}</span>
          </span>
        )}
      </div>
    </header>
  )
}