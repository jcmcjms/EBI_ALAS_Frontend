import { Database } from '@phosphor-icons/react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { Label } from '@/src/shared/ui/primitives/label'
import type { LoanProductResponse } from '@/src/shared/lib/api/types'

interface SyncedDataCardProps {
  product: LoanProductResponse | null
  lastSyncedDisplay: string
}

export function SyncedDataCard({
  product,
  lastSyncedDisplay,
}: SyncedDataCardProps) {
  return (
    <Card className="border bg-muted/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Database
            size={14}
            weight="bold"
            className="text-muted-foreground"
          />
          Synced from webloan (read-only)
        </CardTitle>
        <CardDescription>
          Code, description, and retirement status are mirrored from the webloan
          catalog by the background sync. Run a manual sync to refresh.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 pt-0">
        <ReadOnlyField label="Product Code" value={product?.code ?? '—'} />
        <ReadOnlyField
          label="Description"
          value={product?.description ?? '—'}
        />
        <ReadOnlyField label="Last Synced" value={lastSyncedDisplay} />
        <ReadOnlyField
          label="Retirement"
          value={
            product
              ? product.isRetired
                ? 'Retired (webloan marked this product expired)'
                : 'Active'
              : '—'
          }
        />
      </CardContent>
    </Card>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="rounded-md border bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground/80">
        {value}
      </div>
    </div>
  )
}