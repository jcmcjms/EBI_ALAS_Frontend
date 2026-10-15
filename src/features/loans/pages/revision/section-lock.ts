import type { SectionId } from '@/src/features/loans/constants/sections'
import type {
  RevisionRequest,
  RevisionSectionId,
} from '@/src/features/loans/types/revision-request'

export const ALWAYS_LOCKED_SECTION_IDS: readonly SectionId[] = [
  'approval-form',
]

export function buildEditableSectionIds(
  requests: RevisionRequest[],
): Set<RevisionSectionId> {
  const ids = new Set<RevisionSectionId>()
  for (const request of requests) {
    if (request.isResolved) continue
    for (const section of request.sections) {
      ids.add(section.sectionId)
    }
  }
  for (const locked of ALWAYS_LOCKED_SECTION_IDS) {
    ids.delete(locked as RevisionSectionId)
  }
  return ids
}

export function isSectionEditable(
  sectionId: SectionId,
  editable: Set<RevisionSectionId>,
): boolean {
  if (ALWAYS_LOCKED_SECTION_IDS.includes(sectionId)) return false
  return editable.has(sectionId as RevisionSectionId)
}
