import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import type { VariantProps } from "class-variance-authority"

import { cn } from "@/src/lib/utils"
import { badgeVariants } from "./badge.variants"

// Re-export the CVA variants so existing imports (`import { badgeVariants } from "./badge"`) keep working.
// The variant declaration itself lives in `badge.variants.ts` so this file
// exports only the `Badge` component, satisfying
// `react-refresh/only-export-components`.
export { badgeVariants }

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge }