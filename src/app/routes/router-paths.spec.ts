import { describe, expect, it } from 'vitest'
import { router } from './router'

describe('app router config', () => {
  it('exposes the migrated route paths', () => {
    const paths: string[] = []
    const walk = (route: { fullPath?: string; children?: unknown }) => {
      if (route.fullPath) paths.push(route.fullPath)
      const children = route.children
      if (Array.isArray(children)) {
        for (const child of children) walk(child as { fullPath?: string; children?: unknown })
      } else if (children && typeof children === 'object') {
        for (const child of Object.values(children)) {
          walk(child as { fullPath?: string; children?: unknown })
        }
      }
    }
    walk(router.routeTree as unknown as { fullPath?: string; children?: unknown })

    for (const expected of [
      '/login',
      '/forbidden',
      '/change-password',
      '/dashboard',
      '/loans/monitoring',
      '/loans/create',
      '/loans/queue',
      '/loans/approval/$loanId',
      '/loans/evaluation/$loanId',
      '/notifications',
      '/account',
      '/admin/users',
      '/admin/loan-products',
      '/admin/audit-logs',
      '/admin/workflow',
    ]) {
      expect(paths).toContain(expected)
    }
  })
})
