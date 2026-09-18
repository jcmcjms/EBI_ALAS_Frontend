import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PencilSimple } from "@phosphor-icons/react";
import { Button } from "@/src/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { parseAccountTab, type AccountTab } from "./types";
import { OverviewTab } from "./components/overview-tab";
import { SecurityTab } from "./components/security-tab";
import { ActivityTab } from "./components/activity-tab";
import { MyApplicationsTab } from "./components/my-applications-tab";
import { ProfileEditSheet } from "./components/profile-edit-sheet";

export function AccountPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = parseAccountTab(searchParams.get("tab"));
    const [editOpen, setEditOpen] = useState(false);

    // URL is the single source of truth for the active tab: refresh, share
    // and back/forward all preserve the view without extra state.
    const openTab = (next: AccountTab) => {
        setSearchParams((prev) => {
            const params = new URLSearchParams(prev);
            if (next === "overview") params.delete("tab");
            else params.set("tab", next);
            return params;
        });
    };

    return (
        <div className="flex flex-1 flex-col bg-muted/40">
            <div className="container mx-auto w-full max-w-7xl flex-1 px-6 py-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">My Account</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage your profile, security settings and activity history.
                        </p>
                    </div>
                    <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
                        <PencilSimple size={16} weight="bold" />
                        Edit profile
                    </Button>
                </div>

                <Tabs value={tab} onValueChange={(v) => v && openTab(parseAccountTab(v))} className="mt-6">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="security">Security</TabsTrigger>
                        <TabsTrigger value="activity">Activity</TabsTrigger>
                        <TabsTrigger value="my-applications">My Applications</TabsTrigger>
                    </TabsList>

                    {/* TabsContent unmounts inactive tabs, so each tab's queries
                        fire on first visit only — react-query cache covers returns. */}
                    <TabsContent value="overview">
                        <OverviewTab onEditProfile={() => setEditOpen(true)} onOpenTab={openTab} />
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

            <ProfileEditSheet open={editOpen} onOpenChange={setEditOpen} />
        </div>
    );
}
