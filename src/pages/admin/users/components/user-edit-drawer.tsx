import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/src/components/ui/sheet";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { toast } from "sonner";
import { BRANCHES, type UserResponse } from "@/src/lib/api/types";
import { useRoles } from "@/src/hooks/use-roles";

/** Editable fields — mirrors PUT /api/users/{id} (UpdateUserRequest). */
export interface UserProfileChanges {
    firstName: string;
    middleName: string;
    lastName: string;
    branchId: string;
    role: string;
}

interface UserEditDrawerProps {
    user: UserResponse | null;
    /** Whether the current session holds `user.edit` — gates the Save button. */
    canEdit: boolean;
    onClose: () => void;
    /** Persists changes via the API. Resolves true when saved successfully. */
    onSave: (userId: number, changes: UserProfileChanges) => Promise<boolean>;
    /** Routed to the parent's confirmation flow for sensitive actions. */
    onToggleStatus: (user: UserResponse) => void;
    onResetPassword: (user: UserResponse) => void;
    onForcePasswordReset: (user: UserResponse) => void;
    onRevokeSessions: (user: UserResponse) => void;
}

type EditableProfile = UserProfileChanges;

function profileFrom(user: UserResponse): EditableProfile {
    return {
        firstName: user.firstName,
        middleName: user.middleName ?? "",
        lastName: user.lastName,
        branchId: user.branchId,
        role: user.role,
    };
}

const emptyProfile: EditableProfile = { firstName: "", middleName: "", lastName: "", branchId: "", role: "" };

export function UserEditDrawer({
    user,
    canEdit,
    onClose,
    onSave,
    onToggleStatus,
    onResetPassword,
    onForcePasswordReset,
    onRevokeSessions,
}: UserEditDrawerProps) {
    const { data: roles } = useRoles();
    const [profile, setProfile] = useState<EditableProfile>(emptyProfile);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSyncedUser, setLastSyncedUser] = useState<UserResponse | null>(null);

    // Re-seed local form state whenever a different user is opened (or an
    // update produces a new user object), using the guarded
    // adjust-state-during-render pattern instead of an effect.
    if (user !== lastSyncedUser) {
        setLastSyncedUser(user);
        setProfile(user ? profileFrom(user) : emptyProfile);
        setIsDirty(false);
    }

    const handleFieldChange = <K extends keyof EditableProfile>(field: K, value: EditableProfile[K]) => {
        setProfile(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleSave = async () => {
        if (!user || !isDirty || isSaving) return;

        if (!profile.firstName.trim()) {
            toast.error("First name is required");
            return;
        }
        if (!profile.lastName.trim()) {
            toast.error("Last name is required");
            return;
        }

        setIsSaving(true);
        try {
            const success = await onSave(user.id, {
                firstName: profile.firstName.trim(),
                middleName: profile.middleName.trim(),
                lastName: profile.lastName.trim(),
                branchId: profile.branchId,
                role: profile.role,
            });
            if (success) {
                setIsDirty(false);
                onClose();
            }
        } finally {
            setIsSaving(false);
        }
    };

    const fullName = user ? [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ") : "";

    return (
        <Sheet open={!!user} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="flex flex-col p-0 sm:max-w-[500px]">
                <SheetHeader className="border-b bg-muted/30 p-6 pb-4">
                    <SheetTitle>Edit User{fullName ? `: ${fullName}` : ""}</SheetTitle>
                    <SheetDescription>Manage user profile, roles, and security settings.</SheetDescription>
                </SheetHeader>

                <Tabs defaultValue="profile" className="flex flex-1 flex-col overflow-hidden">
                    <div className="px-6 pt-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="profile">Profile</TabsTrigger>
                            <TabsTrigger value="roles">Roles</TabsTrigger>
                            <TabsTrigger value="security">Security</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="profile" className="mt-0 flex-1 space-y-4 overflow-y-auto p-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-firstName">First Name *</Label>
                                <Input
                                    id="edit-firstName"
                                    value={profile.firstName}
                                    onChange={(e) => handleFieldChange("firstName", e.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-middleName">Middle Name</Label>
                                <Input
                                    id="edit-middleName"
                                    value={profile.middleName}
                                    onChange={(e) => handleFieldChange("middleName", e.target.value)}
                                    className="h-9"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-lastName">Last Name *</Label>
                            <Input
                                id="edit-lastName"
                                value={profile.lastName}
                                onChange={(e) => handleFieldChange("lastName", e.target.value)}
                                className="h-9"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-username">Username</Label>
                                <Input
                                    id="edit-username"
                                    value={user?.username ?? ""}
                                    className="h-9 font-mono"
                                    disabled
                                />
                                <p className="text-xs text-muted-foreground">Usernames cannot be changed.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-created">Created</Label>
                                <Input
                                    id="edit-created"
                                    value={user && !Number.isNaN(new Date(user.createdAt).getTime())
                                        ? new Date(user.createdAt).toLocaleDateString()
                                        : ""}
                                    className="h-9"
                                    disabled
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-branch">Assigned Branch</Label>
                            <Select
                                value={profile.branchId}
                                onValueChange={(value) => handleFieldChange("branchId", value ?? "")}
                            >
                                <SelectTrigger className="h-9 w-full">
                                    <SelectValue placeholder="Select branch" />
                                </SelectTrigger>
                                <SelectContent>
                                    {BRANCHES.map(b => <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </TabsContent>
                    <TabsContent value="roles" className="mt-0 flex-1 space-y-4 overflow-y-auto p-6">
                        <div className="space-y-2">
                            <Label htmlFor="edit-role">Primary Role</Label>
                            <Select
                                value={profile.role}
                                onValueChange={(value) => handleFieldChange("role", value ?? "")}
                            >
                                <SelectTrigger className="h-9 w-full">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map(r => <SelectItem key={r.name} value={r.name}>{r.displayName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Role determines the baseline permissions. The full mapping is visible in the Role Matrix.
                            </p>
                        </div>
                    </TabsContent>

                    <TabsContent value="security" className="mt-0 flex-1 space-y-4 overflow-y-auto p-6">
                        <div className="space-y-4">
                            <Button
                                variant="outline"
                                className="h-9 w-full justify-start text-sm"
                                onClick={() => user && onForcePasswordReset(user)}
                            >
                                Force Password Reset on Next Login
                            </Button>
                            <Button
                                variant="outline"
                                className="h-9 w-full justify-start text-sm"
                                onClick={() => user && onRevokeSessions(user)}
                            >
                                Revoke All Active Sessions
                            </Button>
                            <Button
                                variant="outline"
                                className="h-9 w-full justify-start text-sm"
                                onClick={() => user && onResetPassword(user)}
                            >
                                Send Password Reset Email
                            </Button>
                        </div>

                        <div className="space-y-2 border-t pt-4">
                            <Label className="text-red-600">Danger Zone</Label>
                            {user?.isActive ? (
                                <Button
                                    variant="destructive"
                                    className="h-9 w-full justify-start text-sm"
                                    onClick={() => user && onToggleStatus(user)}
                                >
                                    Suspend Account
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="h-9 w-full justify-start text-sm"
                                    onClick={() => user && onToggleStatus(user)}
                                >
                                    Reactivate Account
                                </Button>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                <SheetFooter className="flex flex-row gap-2 border-t bg-muted/10 p-4">
                    <Button variant="outline" className="h-9" onClick={onClose}>Cancel</Button>
                    {canEdit ? (
                        <Button
                            className="h-9"
                            onClick={handleSave}
                            disabled={!isDirty || isSaving}
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    ) : (
                        <p className="self-center text-xs text-muted-foreground">
                            You don't have permission to edit users.
                        </p>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
