import { useState } from 'react'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { useNavigate } from '@tanstack/react-router'
import { useBranches, findBranchName } from '@/src/shared/lib/api/branches'
import { Plus } from '@phosphor-icons/react'
import { Button } from '@/src/shared/ui/primitives/button'
import { DatePicker } from '@/src/shared/ui/forms/date-picker'
import { Skeleton } from '@/src/shared/ui/feedback/skeleton'
import { ErrorState } from '@/src/shared/ui/feedback/empty-state'

import { ActionRequired } from '../components/action-required'
import { DashboardSummary } from '../components/dashboard-summary'
import { WeeklyTrend } from '../components/weekly-trend'
import { WorkloadOverview } from '../components/workload-overview'
import { manilaTodayIso } from '../api/dashboard'
import { useDashboardData } from '../hooks/use-dashboard-data'

export function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const [asOfDay, setAsOfDay] = useState(() => manilaTodayIso())
  const { data, isLoading, isError, dataUpdatedAt, refetch } =
    useDashboardData(asOfDay)
  const { data: branches } = useBranches()

  const asOf = dataUpdatedAt ? new Date(dataUpdatedAt) : new Date()
  const branchName = user?.branchId
    ? findBranchName(branches, user.branchId)
    : null
  const isToday = asOfDay === manilaTodayIso()

  return (
    <div className="flex min-h-full flex-1 flex-col gap-6 bg-muted/30 p-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {asOf.toLocaleDateString('en-PH', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
            {branchName && <span className="mx-1.5">•</span>}
            {branchName && <span>{branchName}</span>}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DatePicker
            id="dashboard-as-of"
            label=""
            value={asOfDay}
            onChange={setAsOfDay}
            className="min-w-[12rem]"
          />
          <span className="hidden text-xs tabular-nums text-muted-foreground sm:block">
            Updated{' '}
            {asOf.toLocaleTimeString('en-PH', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {user?.role === 'Encoder' && (
            <Button size="sm" onClick={() => navigate({ to: '/loans/create' })}>
              <Plus size={16} weight="bold" className="mr-1.5" />
              Create Loan
            </Button>
          )}
        </div>
      </header>

      {isError ? (
        <ErrorState
          message="Couldn't load your queues and totals."
          onRetry={() => void refetch()}
          className="h-64"
        />
      ) : isLoading ? (
        <DashboardSkeleton />
      ) : data ? (
        <div className="flex flex-col gap-6">
          <ActionRequired
            pushBacks={data.pushBacks}
            incompleteDocs={data.incompleteDocsQueue}
          />
          <DashboardSummary
            data={data.summary}
            asOfDay={asOfDay}
            isToday={isToday}
          />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <WorkloadOverview data={data} />
            </div>
            <div>
              {data.weeklyTrend.some((d) => d.approved > 0 || d.pushBacks > 0) && (
                <WeeklyTrend data={data.weeklyTrend} />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 w-full rounded-lg lg:col-span-2" />
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    </div>
  )
}
