import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  columnVisibilityFeature,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  tableFeatures,
} from '@tanstack/react-table'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { SCOPE_LABELS, SEVERITY_LABELS, type ApprovalAuthorityDto } from '../api/approval-authorities'

export type ApprovalAuthoritiesTableMeta = {
  canManage: boolean
  onEdit?: (authority: ApprovalAuthorityDto) => void
  onAssign?: (authority: ApprovalAuthorityDto) => void
  onDeactivate?: (authority: ApprovalAuthorityDto) => void
}

export const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  tableMeta: {} as ApprovalAuthoritiesTableMeta,
})

const columnHelper = createColumnHelper<typeof features, ApprovalAuthorityDto>()

export const columns = columnHelper.columns([
  columnHelper.accessor('displayName', {
    header: 'Authority',
    cell: (info) => (
      <span className="text-sm font-medium">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('tier', {
    header: 'Tier',
    cell: (info) => (
      <span className="text-sm tabular-nums">Tier {info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('scopeType', {
    header: 'Scope',
    cell: (info) => (
      <Badge variant="outline" className="font-normal">
        {SCOPE_LABELS[info.getValue()]}
      </Badge>
    ),
  }),
  columnHelper.accessor('maxTotalExposure', {
    header: 'Max exposure',
    cell: (info) => (
      <span className="text-sm tabular-nums">
        ₱{info.getValue().toLocaleString()}
      </span>
    ),
  }),
  columnHelper.accessor('maxSeverity', {
    header: 'Max severity',
    cell: (info) => (
      <Badge variant="outline" className="font-normal">
        {SEVERITY_LABELS[info.getValue()]}
      </Badge>
    ),
  }),
  columnHelper.accessor((row) => [row.allowNew, row.allowRenewal], {
    id: 'allows',
    header: 'Allows',
    cell: (info) => {
      const [allowNew, allowRenewal] = info.getValue()
      const items = [allowNew && 'New', allowRenewal && 'Renewal']
        .filter(Boolean)
        .join(' · ')
      return (
        <span className="text-xs text-muted-foreground">{items || '—'}</span>
      )
    },
  }),
  columnHelper.accessor('assignedUsers', {
    header: 'Approvers',
    cell: (info) => {
      const users = info.getValue()
      return (
        <div className="flex flex-wrap gap-1">
          {users.length === 0 ? (
            <span className="text-xs text-muted-foreground">None</span>
          ) : (
            users.map((u) => (
              <Badge key={u.userId} variant="outline" className="font-normal">
                {u.name}
              </Badge>
            ))
          )}
        </div>
      )
    },
  }),
])
