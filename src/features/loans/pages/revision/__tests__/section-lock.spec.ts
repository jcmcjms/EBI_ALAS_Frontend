import { describe, expect, it } from 'vitest'
import {
  ALWAYS_LOCKED_SECTION_IDS,
  buildEditableSectionIds,
  isSectionEditable,
} from '../section-lock'
import type { RevisionRequest } from '../../types/revision-request'

const request = (sections: string[]): RevisionRequest => ({
  id: '1',
  loanApplicationId: 'L1',
  requestedByName: 'Evaluator',
  requestedByRole: 'Evaluator',
  overallComments: 'Please fix',
  fromStatus: 'ForChecking',
  requestedAt: '2026-10-15T00:00:00Z',
  isResolved: false,
  resolvedAt: null,
  sections: sections.map((sectionId) => ({
    sectionId: sectionId as RevisionRequest['sections'][number]['sectionId'],
    sectionLabel: sectionId,
    comments: 'fix this',
  })),
})

describe('section lock', () => {
  it('opens only flagged sections', () => {
    const editable = buildEditableSectionIds([
      request(['loan-params', 'deviations']),
    ])
    expect(isSectionEditable('loan-params', editable)).toBe(true)
    expect(isSectionEditable('deviations', editable)).toBe(true)
    expect(isSectionEditable('personal-info', editable)).toBe(false)
  })

  it('never opens approval-form', () => {
    const editable = buildEditableSectionIds([request(['approval-form'])])
    expect(ALWAYS_LOCKED_SECTION_IDS).toContain('approval-form')
    expect(isSectionEditable('approval-form', editable)).toBe(false)
  })

  it('ignores resolved requests', () => {
    const editable = buildEditableSectionIds([
      {
        ...request(['loan-params']),
        isResolved: true,
        resolvedAt: '2026-10-15T01:00:00Z',
      },
    ])
    expect(editable.size).toBe(0)
  })
})
