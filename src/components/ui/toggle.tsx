import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import type { VariantProps } from "class-variance-authority"

import { cn } from "@/src/lib/utils"
import { toggleVariants } from "./toggle.variants"

// Re-export so existing imports keep working. The variant declaration
// lives in `toggle.variants.ts` so this file exports only the `Toggle`
// component, satisfying `react-refresh/only-export-components`.
export { toggleVariants }

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle }