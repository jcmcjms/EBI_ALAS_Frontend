import { TreeStructure } from '@phosphor-icons/react'
import { BranchesTable } from '../components/branches-table'

export function BranchesPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <TreeStructure size={22} weight="bold" className="text-primary" />
            Branch Management
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            Maintain the bank&apos;s branch directory. Codes are permanent and
            match core-banking references; closing or merging a branch is blocked
            while open loans or active users remain assigned.
          </p>
        </div>
      </div>

      <BranchesTable />
    </div>
  )
}
