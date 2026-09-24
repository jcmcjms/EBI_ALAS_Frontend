/**
 * Account page — thin shell that composes the tab components.
 *
 * This file owns:
 * - Tab state
 * - Profile edit sheet open/close state
 * - Layout (header + tabs)
 *
 * All data fetching and business logic lives in the tab components and hooks.
 */

import { useState } from "react";
import { GearSix } from "@phosphor-icons/react";
import { Button } from "@/src/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { OverviewTab } from "../components/overview-tab";
import { SecurityTab } from "../components/security-tab";
import { ActivityTab } from "../components/activity-tab";
import { MyApplicationsTab } from "../components/my-applications-tab";
import { ProfileEditSheet } from "../components/profile-edit-sheet";
import type { AccountTab } from "../types";

export function AccountPage() {
    const [tab, setTab] = useState<AccountTab>("overview");
    const [editOpen, setEditOpen] = useState(false);

    return (
        <div className="flex flex-1 flex-col bg-muted/40">
            <div className="container mx-auto w-full max-w-7xl flex-1 px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        My Account
                    </h1>
                    <Button className="gap-2" onClick={() => setTab("security")}>
                        <GearSix size={16} weight="bold" />
                        Settings
                    </Button>
                </div>

                {/* Tabs */}
                <Tabs
                    value={tab}
                    onValueChange={(v) => v && setTab(v as AccountTab)}
                    className="mt-6"
                >
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="security">Security</TabsTrigger>
                        <TabsTrigger value="activity">Activity</TabsTrigger>
                        <TabsTrigger value="my-applications">
                            My Applications
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <OverviewTab
                            onEditProfile={() => setEditOpen(true)}
                            onOpenTab={setTab}
                        />
                    </TabsContent>

                    <TabsContent value="security">
                        <SecurityTab />
                    </TabsContent>

                    <TabsContent value="activity">
                        <ActivityTab />
                    </TabsContent>

                    <TabsContent value="my-applications">
                        <MyApplicationsTab />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Profile edit sheet — mounted once, toggled by open prop */}
            <ProfileEditSheet open={editOpen} onOpenChange={setEditOpen} />
        </div>
    );
}
