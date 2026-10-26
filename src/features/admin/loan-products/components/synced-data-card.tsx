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
          Synced from WebLoan (read-only)
        </CardTitle>
        <CardDescription>
          Code, description, and status come from the WebLoan catalog. Use
          Sync now to refresh them.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 pt-0">
        <ReadOnlyField label="Product code" value={product?.code ?? '—'} />
        <ReadOnlyField
          label="Description"
          value={product?.description ?? '—'}
        />
        <ReadOnlyField label="Last synced" value={lastSyncedDisplay} />
        <ReadOnlyField
          label="Retirement"
          value={
            product
              ? product.isRetired
                ? 'Retired (WebLoan marked it expired)'
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