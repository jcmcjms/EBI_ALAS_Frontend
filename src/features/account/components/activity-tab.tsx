/**
 * Activity tab — full activity history with "Show more" pagination.
 */

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { useAccountActivity } from "../hooks/use-account";
import { ActivityTimeline, toTimelineItems } from "./activity-timeline";
import { EmptyState, ErrorState, LoadingState } from "./account-states";

export function ActivityTab() {
    const [limit, setLimit] = useState(10);
    const activityQuery = useAccountActivity(limit);
    const items = toTimelineItems(activityQuery.data ?? []);

    return (
        <Card>
            <CardHeader className="border-b bg-muted/30 py-3">
                <CardTitle className="text-sm">Activity History</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                {activityQuery.isLoading ? (
                    <LoadingState label="Loading activity…" />
                ) : activityQuery.isError ? (
                    <ErrorState
                        message="Failed to load activity history."
                        onRetry={() => activityQuery.refetch()}
                    />
                ) : items.length === 0 ? (
                    <EmptyState
                        title="No activity recorded yet"
                        hint="Every action you take on a loan application is logged here for audit."
                    />
                ) : (
                    <>
                        <ActivityTimeline items={items} />
                        {/* Backend returns at most `limit` rows with no total —
                            a short page means we've reached the end. */}
                        {items.length >= limit && (
                            <div className="mt-6 text-center">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLimit((l) => l + 10)}
                                >
                                    Show more
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
