import {
  ArrowRight,
  CheckCircle,
  ClipboardText,
  Clock,
  FloppyDisk,
  LockSimple,
  SignIn,
} from '@phosphor-icons/react'
import type { Activity } from '../api/account'
import { formatRelativeTime } from '@/src/shared/lib/format'
import type { ActivityKind } from '../types'

export interface TimelineItem {
  id: string
  kind: ActivityKind
  title: string
  clientName?: string
  fromStatus?: string
  toStatus?: string
  createdAt: string
  comments?: string
  isInformal?: boolean
}

const ICON_MAP: Record<ActivityKind, typeof Clock> = {
  application: ClipboardText,
  approval: CheckCircle,
  security: LockSimple,
  draft: FloppyDisk,
  login: SignIn,
}

export function toTimelineItems(records: Activity[]): TimelineItem[] {
  return records.map((a) => {
    const action = (a.action ?? '').toLowerCase()

    let kind: ActivityKind = 'application'
    if (
      action.includes('password') ||
      action.includes('login') ||
      action.includes('sign')
    ) {
      kind = action.includes('password') ? 'security' : 'login'
    } else if (action.includes('draft') || action.includes('saved')) {
      kind = 'draft'
    } else if (
      action.includes('recommend') ||
      action.includes('approv') ||
      action.includes('release')
    ) {
      kind = 'approval'
    }

    return {
      id: String(a.id),
      kind,
      title: `${a.lamId} — ${a.action}`,
      clientName: a.loanClientName || undefined,
      fromStatus: a.fromStatus || undefined,
      toStatus: a.toStatus || undefined,
      createdAt: a.actionDate,
      comments: a.comments,
      isInformal: a.isInformal,
    }
  })
}

export function ActivityTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative space-y-6 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-border">
      {items.map((item) => {
        const KindIcon = ICON_MAP[item.kind]
        return (
          <li key={item.id} className="relative flex gap-4">
            <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground">
              <KindIcon size={14} weight="bold" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold">
                  {item.title}
                </p>
                <span
                  className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
                  title={new Date(item.createdAt).toLocaleString()}
                >
                  <Clock size={12} weight="bold" />
                  {formatRelativeTime(item.createdAt)}
                </span>
              </div>
              {item.clientName ? (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {item.clientName}
                </p>
              ) : null}
              {item.fromStatus || item.toStatus ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {item.fromStatus ? <span>{item.fromStatus}</span> : null}
                  {item.fromStatus && item.toStatus ? (
                    <ArrowRight size={11} weight="bold" aria-hidden="true" />
                  ) : null}
                  {item.toStatus ? (
                    <span className="text-foreground/80">{item.toStatus}</span>
                  ) : null}
                </p>
              ) : null}
              {item.comments ? (
                <p
                  className={
                    item.isInformal
                      ? 'mt-1.5 border-l-2 border-border pl-2.5 text-sm italic text-muted-foreground'
                      : 'mt-1.5 border-l-2 border-border pl-2.5 text-sm text-muted-foreground'
                  }
                >
                  {item.comments}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
