import { Card } from '@/src/shared/ui/data-display/card'

interface BranchStatsCardsProps {
  totalCount: number
  activeCount: number
  inactiveCount: number
}

export function BranchStatsCards({
  totalCount,
  activeCount,
  inactiveCount,
}: BranchStatsCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="flex items-center justify-between border p-3 shadow-none">
        <div className="text-sm text-muted-foreground">Total Branches</div>
        <div className="text-xl font-bold">{totalCount}</div>
      </Card>
      <Card className="flex items-center justify-between border p-3 shadow-none">
        <div className="text-sm text-muted-foreground">Active</div>
        <div className="text-xl font-bold text-emerald-600">{activeCount}</div>
      </Card>
      <Card className="flex items-center justify-between border p-3 shadow-none">
        <div className="text-sm text-muted-foreground">Inactive</div>
        <div className="text-xl font-bold text-red-600">{inactiveCount}</div>
      </Card>
    </div>
  )
}
