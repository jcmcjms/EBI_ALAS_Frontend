import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/src/shared/ui/navigation/tabs'
import { OverviewTab } from '../components/overview-tab'
import { SecurityTab } from '../components/security-tab'
import { ActivityTab } from '../components/activity-tab'
import { MyApplicationsTab } from '../components/my-applications-tab'
import { ProfileEditSheet } from '../components/profile-edit-sheet'
import { parseAccountTab, type AccountTab } from '../types'

export function AccountPage() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { tab?: string }
  const tab = parseAccountTab(search.tab ?? null)
  const [editOpen, setEditOpen] = useState(false)

  const setTab = (next: AccountTab) => {
    void navigate({
      to: '/account',
      search: (prev: Record<string, unknown>) => ({ ...prev, tab: next }),
      replace: true,
    })
  }

  return (
    <div className="flex flex-1 flex-col bg-muted/40">
      <div className="container mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">My Account</h1>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => v && setTab(v as AccountTab)}
          className="mt-6"
        >
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="my-applications">My Applications</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              onEditProfile={() => setEditOpen(true)}
              onOpenTab={setTab}
            />
          </TabsContent>

          <TabsContent value="security">
            <SecurityTab onEditProfile={() => setEditOpen(true)} />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTab />
          </TabsContent>

          <TabsContent value="my-applications">
            <MyApplicationsTab />
          </TabsContent>
        </Tabs>
      </div>

      <ProfileEditSheet open={editOpen} onOpenChange={setEditOpen} />
    </div>
  )
}
