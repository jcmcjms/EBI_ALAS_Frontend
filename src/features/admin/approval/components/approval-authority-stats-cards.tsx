import { Card } from '@/src/shared/ui/data-display/card'

interface ApprovalAuthorityStatsCardsProps {
  totalCount: number
  branchCount: number
  globalCount: number
}

export function ApprovalAuthorityStatsCards({
  totalCount,
  branchCount,
  globalCount,
}: ApprovalAuthorityStatsCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="flex items-center justify-between border p-3 shadow-none">
        <div className="text-sm text-muted-foreground">Total Authorities</div>
        <div className="text-xl font-bold">{totalCount}</div>
      </Card>
      <Card className="flex items-center justify-between border p-3 shadow-none">
        <div className="text-sm text-muted-foreground">Branch / Area</div>
        <div className="text-xl font-bold text-emerald-600">{branchCount}</div>
      </Card>
      <Card className="flex items-center justify-between border p-3 shadow-none">
        <div className="text-sm text-muted-foreground">Global</div>
        <div className="text-xl font-bold text-blue-600">{globalCount}</div>
      </Card>
    </div>
  )
}
