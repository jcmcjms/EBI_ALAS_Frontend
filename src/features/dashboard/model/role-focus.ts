const ROLE_QUEUE_STATUS_KEYS: Record<string, string[]> = {
  Recommender: ['ForRecommendation'],
  Evaluator: ['ForChecking'],
  Approver: ['ForApproval'],
  Encoder: ['OnGoing', 'ForRevision', 'ForIncompleteDocuments'],
  Admin: [],
}

export function workQueueStatusesForRole(role: string): string[] {
  return ROLE_QUEUE_STATUS_KEYS[role] ?? []
}

export function canCreateLoan(role: string): boolean {
  return role === 'Encoder' || role === 'Admin'
}
