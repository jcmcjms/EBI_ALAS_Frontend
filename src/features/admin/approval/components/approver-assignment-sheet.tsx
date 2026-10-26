import { useState, useMemo } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/src/shared/ui/navigation/sheet'
import { Button } from '@/src/shared/ui/primitives/button'
import { Checkbox } from '@/src/shared/ui/primitives/checkbox'
import { Input } from '@/src/shared/ui/primitives/input'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import { ScrollArea } from '@/src/shared/ui/data-display/scroll-area'
import { MagnifyingGlass } from '@phosphor-icons/react'
import type { ApprovalAuthorityDto } from '../api/approval-authorities'

interface ApproverAssignmentSheetProps {
  authority: ApprovalAuthorityDto | null
  users: { id: string; name: string }[]
  isLoading: boolean
  isPending: boolean
  onClose: () => void
  onSave: (userIds: string[]) => Promise<void>
}

export function ApproverAssignmentSheet(props: ApproverAssignmentSheetProps) {
  const { authority } = props
  if (!authority) return null
  return (
    <ApproverAssignmentSheetInner
      key={authority.key}
      authority={authority}
      users={props.users}
      isLoading={props.isLoading}
      isPending={props.isPending}
      onClose={props.onClose}
      onSave={props.onSave}
    />
  )
}

function ApproverAssignmentSheetInner({
  authority,
  users,
  isLoading,
  isPending,
  onClose,
  onSave,
}: ApproverAssignmentSheetProps & { authority: ApprovalAuthorityDto }) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(authority.assignedUsers.map((u) => u.userId)),
  )
  const [search, setSearch] = useState('')

  const filteredUsers = useMemo(
    () => users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase())),
    [users, search],
  )

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleSave = async () => {
    await onSave(Array.from(selected))
  }

  return (
    <Sheet open onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent side="right" showCloseButton className="sm:max-w-[460px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Assign approvers</SheetTitle>
          <SheetDescription>
            Choose which users with the Approver role can act on the{' '}
            {authority.displayName} tier.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="px-6 py-4">
            <div className="relative mb-4">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search approvers…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[calc(100%-80px)]">
              <div className="flex flex-col gap-1 px-6 py-4">
              {isLoading ? (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Spinner className="size-4" /> Loading approvers…
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  {search ? 'No approvers match your search.' : 'No users have the Approver role yet.'}
                </p>
              ) : (
                filteredUsers.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={selected.has(u.id)}
                      onCheckedChange={() => toggle(u.id)}
                    />
                    <span className="text-sm">{u.name}</span>
                  </label>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
        </div>
        <SheetFooter className="mt-auto border-t bg-muted/10 p-4">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending || isLoading}>
            {isPending ? 'Saving…' : 'Save assignment'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
