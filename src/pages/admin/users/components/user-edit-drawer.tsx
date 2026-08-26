import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/src/components/ui/sheet";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Checkbox } from "@/src/components/ui/checkbox";
import { branches, roles, type AdminUser } from "../../data/dummy-admin";

interface UserEditDrawerProps {
    user: AdminUser | null;
    onClose: () => void;
}

export function UserEditDrawer({ user, onClose }: UserEditDrawerProps) {
    return (
        <Sheet open={!!user} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="sm:max-w-[500px] p-0 flex flex-col">
                <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
                    <SheetTitle>Edit User: {user?.fullName}</SheetTitle>
                    <SheetDescription>Manage user profile, roles, and security settings.</SheetDescription>
                </SheetHeader>

                <Tabs defaultValue="profile" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 pt-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="profile">Profile</TabsTrigger>
                            <TabsTrigger value="roles">Roles</TabsTrigger>
                            <TabsTrigger value="security">Security</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="profile" className="flex-1 overflow-y-auto p-6 space-y-4 mt-0">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input id="fullName" defaultValue={user?.fullName} className="h-9" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="empId">Employee ID</Label>
                                <Input id="empId" defaultValue={user?.employeeId} className="h-9 font-mono" disabled />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" type="email" defaultValue={user?.email} className="h-9" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="branch">Assigned Branch</Label>
                            <Select defaultValue={user?.branch}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select branch" />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </TabsContent>

                    <TabsContent value="roles" className="flex-1 overflow-y-auto p-6 space-y-4 mt-0">
                        <div className="space-y-2">
                            <Label>Primary Role</Label>
                            <Select defaultValue={user?.role}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Role determines the baseline permissions. Fine-grained overrides can be set in the Matrix.</p>
                        </div>

                        <div className="space-y-2 pt-4 border-t">
                            <Label>Special Overrides</Label>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="override-1" />
                                <label htmlFor="override-1" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Allow Cross-Branch Loan Encoding
                                </label>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="security" className="flex-1 overflow-y-auto p-6 space-y-4 mt-0">
                        <div className="space-y-4">
                            <Button variant="outline" className="w-full justify-start h-9 text-sm">
                                Force Password Reset on Next Login
                            </Button>
                            <Button variant="outline" className="w-full justify-start h-9 text-sm">
                                Revoke All Active Sessions
                            </Button>
                        </div>

                        <div className="pt-4 border-t space-y-2">
                            <Label className="text-red-600">Danger Zone</Label>
                            <Button variant="destructive" className="w-full justify-start h-9 text-sm">
                                Suspend Account
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>

                <SheetFooter className="p-4 border-t bg-muted/10 flex gap-2">
                    <Button variant="outline" onClick={onClose} className="h-9">Cancel</Button>
                    <Button className="h-9">Save Changes</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}