import { Card } from '@/src/shared/ui/data-display/card'

interface ProductStatsCardsProps {
  totalCount: number
  activeCount: number
  retiredCount: number
}

export function ProductStatsCards({
  totalCount,
  activeCount,
  retiredCount,
}: ProductStatsCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="flex items-center justify-between border p-3 shadow-none">
        <div className="text-sm text-muted-foreground">Total Products</div>
        <div className="text-xl font-bold">{totalCount}</div>
      </Card>
      <Card className="flex items-center justify-between border p-3 shadow-none">
        <div className="text-sm text-muted-foreground">Active</div>
        <div className="text-xl font-bold text-emerald-600">{activeCount}</div>
      </Card>
      <Card className="flex items-center justify-between border p-3 shadow-none">
        <div className="text-sm text-muted-foreground">Retired</div>
        <div className="text-xl font-bold text-red-600">{retiredCount}</div>
      </Card>
    </div>
  )
}
