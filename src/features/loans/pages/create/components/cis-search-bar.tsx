import {
  ArrowCounterClockwise,
  MagnifyingGlass,
  WarningCircle,
} from '@phosphor-icons/react'
import { Button } from '@/src/shared/ui/button'
import { Input } from '@/src/shared/ui/input'
import { Skeleton } from '@/src/shared/ui/skeleton'
import { SubSectionHeading } from './section-card'

interface CisSearchBarProps {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  isLoading: boolean
  isLoaded: boolean
  lookupError: string | null
  onLookup: () => void
}

export function CisSearchBar({
  searchQuery,
  onSearchQueryChange,
  isLoading,
  isLoaded,
  lookupError,
  onLookup,
}: CisSearchBarProps) {
  return (
    <div className="space-y-4">
      <SubSectionHeading step="1.1" title="Client lookup (CIS number)" />

      <div className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <MagnifyingGlass
            size={16}
            weight="bold"
            className="absolute left-3 top-3 text-muted-foreground"
          />
          <Input
            placeholder="Enter CIS number…"
            aria-label="CIS number"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onLookup()}
            className="h-10 pl-9 tabular-nums"
            disabled={isLoading}
          />
        </div>
        <Button
          onClick={onLookup}
          disabled={isLoading || !searchQuery.trim()}
          className="h-10 shrink-0 px-6"
        >
          {isLoading ? 'Fetching…' : 'Fetch Profile'}
        </Button>
      </div>

      {lookupError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <div className="flex items-start gap-2">
            <WarningCircle
              size={16}
              weight="fill"
              className="mt-0.5 shrink-0"
            />
            <div>
              <p className="font-medium">Unable to load client profile</p>
              <p className="text-xs opacity-90">{lookupError}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 gap-1.5 text-destructive"
            onClick={onLookup}
          >
            <ArrowCounterClockwise size={14} weight="bold" />
            Retry
          </Button>
        </div>
      )}

      {isLoading && (
        <div
          className="space-y-4 rounded-md border bg-muted/20 p-4"
          aria-label="Loading client profile"
          aria-busy="true"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
        </div>
      )}

      {!isLoaded && !isLoading && !lookupError && (
        <p className="text-xs text-muted-foreground">
          Profile, branch routing and existing obligations are pulled
          automatically from the CIS.
        </p>
      )}
    </div>
  )
}