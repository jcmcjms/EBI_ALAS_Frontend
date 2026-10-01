import {
  Bell,
  ChartBar,
  House,
  ListChecks,
  Tray,
  Users,
  type Icon,
} from '@phosphor-icons/react'

export type NavItem = {
  title: string
  url: string
  icon?: Icon
  items?: {
    title: string
    url: string

    requiredPermission?: string
  }[]

  requiredPermission?: string

  requiredPermissions?: string[]
}

export const navMain: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: House,
    requiredPermission: 'loans.view',
  },
  {
    title: 'Loan Creation',
    url: '/loans/create',
    icon: ChartBar,
    requiredPermission: 'loans.create',
  },
  {
    title: 'Review Desk',
    url: '/loans/queue',
    icon: Tray,
    requiredPermissions: ['loans.recommend', 'loans.evaluate', 'loans.approve'],
  },
  {
    title: 'Loan Monitoring',
    url: '/loans/monitoring',
    icon: ListChecks,
    requiredPermission: 'loans.view',
  },
  {
    title: 'Notifications',
    url: '/notifications',
    icon: Bell,
  },
  {
    title: 'Administration',
    url: '#',
    icon: Users,
    items: [
      {
        title: 'Users',
        url: '/admin/users',
        requiredPermission: 'user.view',
      },
      {
        title: 'Loan Products',
        url: '/admin/loan-products',
        requiredPermission: 'loan_product.view',
      },
      {
        title: 'Audit Logs',
        url: '/admin/audit-logs',
        requiredPermission: 'auditLogs.view',
      },
      {
        title: 'Workflow',
        url: '/admin/workflow',
        requiredPermission: 'workflow.manage',
      },
    ],
  },
]

export function getActiveNavTitle(pathname: string): string | null {
  for (const item of navMain) {
    if (item.url === pathname) return item.title
    for (const sub of item.items ?? []) {
      if (sub.url === pathname) return sub.title
    }
  }
  return null
}
