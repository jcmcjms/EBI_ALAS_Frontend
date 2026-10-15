import { richTextToPlainText } from '@/src/shared/lib/rich-text'
import type { ActionRequiredItem, DashboardData } from '../types'
import { workQueueStatusesForRole } from './role-focus'

export function buildActionRequired(
  data: DashboardData,
  role: string,
): ActionRequiredItem[] {
  const items: ActionRequiredItem[] = []

  for (const p of data.pushBacks) {
    items.push({
      kind: 'Returned',
      lamId: p.lamId,
      reason: richTextToPlainText(p.reason) || 'Returned for correction',
      occurredAt: p.date,
      canAct: true,
    })
  }

  for (const f of data.incompleteDocsQueue) {
    items.push({
      kind: 'FlaggedDocuments',
      lamId: f.lamId,
      reason: `${f.missingCount} missing document${f.missingCount === 1 ? '' : 's'}`,
      occurredAt: f.waitingSinceUtc,
      canAct: true,
    })
  }

  const statusKeys = new Set(workQueueStatusesForRole(role))
  for (const q of data.pendingQueue) {
    if (statusKeys.size === 0 || statusKeys.has(q.statusKey)) {
      items.push({
        kind: 'AwaitingMyAction',
        lamId: q.lamId,
        reason: q.status,
        occurredAt: q.date,
        canAct: true,
      })
    }
  }

  const kindRank: Record<ActionRequiredItem['kind'], number> = {
    Returned: 0,
    FlaggedDocuments: 1,
    AwaitingMyAction: 2,
  }

  items.sort((a, b) => {
    const rank = kindRank[a.kind] - kindRank[b.kind]
    if (rank !== 0) return rank
    return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  })
  return items
}
