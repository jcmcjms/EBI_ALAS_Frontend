import { Users } from "@phosphor-icons/react";

import { useAuthStore } from "@/src/store/authStore";
import { useOnlineUsers } from "@/src/lib/signalr/use-presence";
import { PresenceDot } from "@/src/components/system/presence-dot";
import { Avatar, AvatarFallback, AvatarGroup } from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/src/components/ui/popover";
import { ScrollArea } from "@/src/components/ui/scroll-area";

/**
 * Returns up to 2 initials from a full name.
 */
function initialsOf(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
}

/**
 * Header avatar stack + popover directory of online users.
 *
 * Shows up to 4 avatars in a stack, a "+N" overflow count, and a
 * Users icon. Clicking opens a popover with the full online directory.
 *
 * Reads from the presence store — zero network requests.
 */
export function OnlineUsers() {
    const online = useOnlineUsers();
    const me = useAuthStore((s) => Number(s.user?.userId));

    return (
        <Popover>
            <PopoverTrigger
                render={(props) => (
                    <button
                        {...props}
                        type="button"
                        className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted cursor-pointer"
                        aria-label={`${online.length} users online`}
                    >
                        <AvatarGroup className="-space-x-1.5">
                            {online.slice(0, 4).map((u) => (
                                <Avatar key={u.userId} size="sm">
                                    <AvatarFallback className="text-[9px]">
                                        {initialsOf(u.name)}
                                    </AvatarFallback>
                                </Avatar>
                            ))}
                        </AvatarGroup>
                        {online.length > 4 && (
                            <span className="text-xs text-muted-foreground">
                                +{online.length - 4}
                            </span>
                        )}
                        <Users size={14} className="ml-1 text-muted-foreground" />
                    </button>
                )}
            />
            <PopoverContent className="w-64" side="bottom" align="end">
                <p className="mb-2 text-xs font-semibold">
                    {online.length} online now
                </p>
                <ScrollArea className="max-h-64">
                    <ul className="space-y-2">
                        {online.map((u) => (
                            <li
                                key={u.userId}
                                className="flex items-center gap-2 text-xs"
                            >
                                <PresenceDot userId={u.userId} />
                                <span className="truncate font-medium">
                                    {u.name}
                                    {u.userId === me && " (you)"}
                                </span>
                                <Badge
                                    variant="outline"
                                    className="ml-auto text-[10px]"
                                >
                                    {u.role}
                                </Badge>
                            </li>
                        ))}
                    </ul>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
