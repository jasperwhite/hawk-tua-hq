import * as React from "react"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

function GlassInput({
  className,
  inputClassName,
  startIcon,
  endAdornment,
  ...props
}: React.ComponentProps<"input"> & {
  inputClassName?: string
  /** Leading icon, e.g. a search glyph. */
  startIcon?: React.ReactNode
  /** Trailing element, e.g. a mic button or keyboard shortcut. */
  endAdornment?: React.ReactNode
}) {
  return (
    <LiquidGlass
      data-slot="glass-input"
      className={cn(
        "flex h-12 w-full items-center gap-2.5 rounded-full px-4 text-(--glass-foreground) transition-[box-shadow] duration-200 has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/35 [&_svg:not([class*='size-'])]:size-[18px] [&_svg]:shrink-0 [&_svg]:opacity-60",
        className
      )}
    >
      {startIcon}
      <input
        className={cn(
          "h-full w-full min-w-0 bg-transparent text-[15px] tracking-[-0.01em] outline-none placeholder:text-current placeholder:opacity-50 disabled:cursor-not-allowed",
          inputClassName
        )}
        {...props}
      />
      {endAdornment}
    </LiquidGlass>
  )
}

export { GlassInput }
