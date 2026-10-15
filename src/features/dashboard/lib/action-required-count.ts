import type { IncompleteDocsQueueItem, PushBackItem } from '../types'

export function actionRequiredTaskCount(
  pushBacks: PushBackItem[],
  incompleteDocs: IncompleteDocsQueueItem[],
): number {
  return pushBacks.length + incompleteDocs.length
}
