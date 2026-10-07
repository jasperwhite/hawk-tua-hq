import * as React from "react"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

function GlassBadge({
  className,
  dot,
  children,
  ...props
}: React.ComponentProps<typeof LiquidGlass> & {
  /** Colour of an optional status dot, e.g. `#34c759`. */
  dot?: string
}) {
  return (
    <LiquidGlass
      data-slot="glass-badge"
      bezel={8}
      className={cn(
        "inline-flex h-7 w-fit items-center gap-1.5 rounded-full px-3 text-xs font-medium tracking-[-0.005em] whitespace-nowrap text-(--glass-foreground) [&_svg]:size-3.5",
        className
      )}
      {...props}
    >
      {dot ? (
        <span
          className="relative size-1.5 rounded-full"
          style={{ background: dot, boxShadow: `0 0 8px ${dot}` }}
        />
      ) : null}
      {children}
    </LiquidGlass>
  )
}

export { GlassBadge }
