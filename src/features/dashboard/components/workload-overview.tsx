import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/src/shared/ui/navigation/tabs'
import { ApprovedLoans } from './approved-loans'
import { NowServing } from './now-serving'
import { PendingQueueTable } from './pending-queue'
import type { DashboardData } from '../types'

const PENDING_QUEUES = [
  { key: 'ForRecommendation', title: 'For Recommendation', requiresRecommendation: true },
  { key: 'ForChecking', title: 'For Checking', requiresRecommendation: false },
  { key: 'ForApproval', title: 'For Approval', requiresRecommendation: false },
] as const

export function WorkloadOverview({ data }: { data: DashboardData }) {
  const queues = PENDING_QUEUES.filter(
    (q) => !q.requiresRecommendation || data.requireRecommendation,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Workload overview</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="text-xs sm:text-sm">
              Pending ({data.summary.totalPending})
            </TabsTrigger>
            <TabsTrigger value="in-progress" className="text-xs sm:text-sm">
              In Progress ({data.nowServing.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="text-xs sm:text-sm">
              Approved ({data.approvedLoans.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-0 min-h-[120px] space-y-5">
            {queues.map((queue) => (
              <PendingQueueTable
                key={queue.key}
                status={queue.key}
                title={queue.title}
              />
            ))}
          </TabsContent>
          <TabsContent value="in-progress" className="mt-0 min-h-[120px]">
            <NowServing data={data.nowServing} compact />
          </TabsContent>
          <TabsContent value="approved" className="mt-0 min-h-[120px]">
            <ApprovedLoans data={data.approvedLoans} compact />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
