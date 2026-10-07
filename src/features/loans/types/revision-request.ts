export type RevisionSectionId =
  | 'cis-lookup'
  | 'personal-info'
  | 'loan-params'
  | 'obligations'
  | 'other-obligations'
  | 'verification'
  | 'deviations'

export interface RevisionSectionFeedback {
  sectionId: RevisionSectionId
  sectionLabel: string
  comments: string
}

export interface RevisionRequest {
  id: number
  loanApplicationId: number
  requestedByName: string
  requestedByRole: string
  overallComments: string
  fromStatus: string
  requestedAt: string
  isResolved: boolean
  resolvedAt: string | null
  sections: RevisionSectionFeedback[]
}

export interface CreateRevisionRequestPayload {
  sections: { sectionId: RevisionSectionId; comments: string }[]
  overallComments: string
}
