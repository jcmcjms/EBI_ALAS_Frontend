import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GitBranch, Warning } from '@phosphor-icons/react'
import { toastSuccess, toastError } from '@/src/shared/ui/feedback/toast'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { Switch } from '@/src/shared/ui/primitives/switch'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Skeleton } from '@/src/shared/ui/feedback/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/src/shared/ui/feedback/alert-dialog'
import { cn } from '@/src/shared/lib/utils'
import { formatRelativeTime } from '@/src/shared/lib/format'

import {
  getLoanCountByStatus,
  updateWorkflowConfiguration,
  workflowKeys,
} from '../api/workflow'
import { useWorkflowConfiguration } from '../hooks/use-workflow'
import { LOAN_STATUS_META } from '@/src/shared/lib/api/types'

const PIPELINE_ROLES = ['Encoder', 'Recommender', 'Evaluator', 'Approver']

function RoleChip({
  name,
  state,
}: {
  name: string
  state?: 'added' | 'skipped'
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-normal',
        state === 'added' && 'border-primary/40 bg-primary/5 font-medium',
        state === 'skipped' && 'text-muted-foreground opacity-60 line-through',
      )}
    >
      {name}
    </Badge>
  )
}

function PipelinePreview({
  requireRecommendation,
  diff,
}: {
  requireRecommendation: boolean
  diff?: 'added' | 'removed'
}) {
  const active = PIPELINE_ROLES.filter(
    (r) => requireRecommendation || r !== 'Recommender',
  )

  return (
    <div
      role="img"
      aria-label={`Loan pipeline: ${active.join(', ')}, then Approved${
        diff === 'removed' ? '. Recommendation step skipped' : ''
      }`}
      className="flex flex-wrap items-center gap-1.5"
    >
      {PIPELINE_ROLES.map((role, i) => {
        const isRecommender = role === 'Recommender'
        if (isRecommender && !requireRecommendation && diff !== 'removed') {
          return null
        }
        return (
          <span key={role} className="flex items-center gap-1.5">
            {i > 0 && (
              <span className="text-muted-foreground" aria-hidden>
                →
              </span>
            )}
            <RoleChip
              name={role}
              state={
                isRecommender
                  ? diff === 'added'
                    ? 'added'
                    : diff === 'removed'
                      ? 'skipped'
                      : undefined
                  : undefined
              }
            />
          </span>
        )
      })}
      <span className="flex items-center gap-1.5">
        <span className="text-muted-foreground" aria-hidden>
          →
        </span>
        <Badge
          variant="outline"
          className={cn('font-normal', LOAN_STATUS_META.Approved.className)}
        >
          {LOAN_STATUS_META.Approved.label}
        </Badge>
      </span>
    </div>
  )
}

export function WorkflowSettingsContent() {
  const qc = useQueryClient()
  const config = useWorkflowConfiguration()
  const [pending, setPending] = useState<boolean | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const backlog = useQuery({
    queryKey: ['loans', 'count', 'ForRecommendation'],
    queryFn: () => getLoanCountByStatus('ForRecommendation'),
    enabled: dialogOpen && pending === false,
  })

  const save = useMutation({
    mutationFn: updateWorkflowConfiguration,
    onSuccess: (_d, value) => {
      toastSuccess(
        value ? 'Recommendation step enabled.' : 'Recommendation step disabled.',
      )
      setDialogOpen(false)
      setPending(null)
      qc.invalidateQueries({ queryKey: workflowKeys.configuration })
    },
    onError: (e: Error) => {
      toastError(e.message)
      setPending(null)
    },
  })

  const current = config.data?.requireRecommendation ?? true
  const changedAt = config.data?.updatedAt
    ? new Date(config.data.updatedAt).toLocaleString()
    : null

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold tracking-tight">
        Workflow settings
      </h1>

      <Card className="max-w-2xl">
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch size={18} weight="bold" className="text-primary" />
            Branch head recommendation
          </CardTitle>
          <CardDescription className="pt-1 text-xs">
            Decides whether the branch head (Recommender) reviews new
            applications before credit evaluation.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {config.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    Require recommendation before evaluation
                    <Badge
                      className={
                        current
                          ? 'border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'border-transparent bg-muted text-muted-foreground'
                      }
                    >
                      {current ? 'On' : 'Off'}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Changing this only affects new applications. Loans already
                    in progress keep their current route.
                  </p>
                  <p
                    className="text-xs text-muted-foreground"
                    title={changedAt ?? undefined}
                  >
                    {config.data?.source === 'Database' &&
                    config.data.updatedByName
                      ? `Changed by ${config.data.updatedByName}${
                          config.data.updatedAt
                            ? ` · ${formatRelativeTime(config.data.updatedAt)}`
                            : ''
                        }`
                      : 'Using the built-in default.'}
                  </p>
                </div>
                <Switch
                  checked={current}
                  disabled={save.isPending}
                  aria-label="Require recommendation before evaluation"
                  onCheckedChange={(v) => {
                    setPending(v)
                    setDialogOpen(true)
                  }}
                />
              </div>

              <div className="space-y-1.5 border-t pt-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Current pipeline
                </p>
                <PipelinePreview requireRecommendation={current} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) setPending(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending ? 'Enable' : 'Disable'} the recommendation step?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? 'New applications will go to the branch head before credit evaluation.'
                : 'New applications will skip the branch head and go straight to the Evaluator.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <PipelinePreview
              requireRecommendation={pending ?? current}
              diff={dialogOpen ? (pending ? 'added' : 'removed') : undefined}
            />
            {!pending && backlog.isLoading && (
              <p className="text-xs text-muted-foreground">
                Checking for waiting applications…
              </p>
            )}
            {!pending && (backlog.data ?? 0) > 0 && (
              <p className="flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
                <Warning size={14} weight="fill" className="mt-0.5 shrink-0" />
                {backlog.data}{' '}
                {backlog.data === 1 ? 'application is' : 'applications are'}{' '}
                waiting for recommendation. Recommenders can still process
                them.
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                pending ? '' : 'bg-amber-600 text-white hover:bg-amber-700'
              }
              disabled={save.isPending}
              onClick={() => pending !== null && save.mutate(pending)}
            >
              {save.isPending
                ? 'Saving…'
                : pending
                  ? 'Enable step'
                  : 'Disable step'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
