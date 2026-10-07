import * as React from "react"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

const sizes = {
  small: "size-[164px]",
  medium: "h-[164px] w-[344px]",
  large: "size-[344px]",
} as const

type WidgetSize = keyof typeof sizes

/** iOS home-screen widget frame on liquid glass: small, medium or large. */
function GlassWidget({
  size = "small",
  className,
  variant = "frosted",
  ...props
}: React.ComponentProps<typeof LiquidGlass> & { size?: WidgetSize }) {
  return (
    <LiquidGlass
      data-slot="glass-widget"
      data-size={size}
      variant={variant}
      bezel={20}
      className={cn(
        "flex shrink-0 flex-col overflow-hidden rounded-[28px] p-4 text-(--glass-foreground)",
        sizes[size],
        className
      )}
      {...props}
    />
  )
}

export { GlassWidget, type WidgetSize }
