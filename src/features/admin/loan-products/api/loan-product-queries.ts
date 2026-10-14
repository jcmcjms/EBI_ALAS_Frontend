export const loanProductKeys = {
  all: ['loan-products'] as const,
  list: (params: { isActive?: boolean; code?: string } = {}) =>
    ['loan-products', 'list', params] as const,
  detail: (code: string) => ['loan-products', 'detail', code] as const,
  documentRequirements: (code: string) =>
    ['loan-products', 'detail', code, 'document-requirements'] as const,
} as const
