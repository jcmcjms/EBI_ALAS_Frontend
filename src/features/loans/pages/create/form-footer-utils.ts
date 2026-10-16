import type { SectionId } from '@/src/features/loans/constants/sections'

export function formFooterMode(
  activeSection: SectionId,
  visibleSectionIds: SectionId[],
): { isFirst: boolean; isLast: boolean; primary: 'continue' | 'submit' } {
  const index = visibleSectionIds.indexOf(activeSection)
  const isFirst = index <= 0
  const isLast = index >= 0 && index === visibleSectionIds.length - 1
  return { isFirst, isLast, primary: isLast ? 'submit' : 'continue' }
}
