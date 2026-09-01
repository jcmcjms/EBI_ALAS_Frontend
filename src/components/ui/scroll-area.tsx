import * as React from "react"
import { cn } from "@/src/lib/utils"

const ScrollArea = React.forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<"div">
>(({ className, children, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        {...props}
    >
        <div className="h-full w-full overflow-y-auto overflow-x-hidden">
            {children}
        </div>
    </div>
))
ScrollArea.displayName = "ScrollArea"

export { ScrollArea }
