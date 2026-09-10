import { Button as ButtonPrimitive } from "@base-ui/react/button"
import type { VariantProps } from "class-variance-authority"

import { cn } from "@/src/lib/utils"
import { buttonVariants } from "./button.variants"

// Re-export so existing imports (`import { buttonVariants } from "./button"`) keep working.
// The variant declaration lives in `button.variants.ts` so this file
// exports only the `Button` component, satisfying
// `react-refresh/only-export-components`.
export { buttonVariants }

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button }