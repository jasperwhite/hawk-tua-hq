import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

function GlassPopover(props: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="glass-popover" {...props} />
}

function GlassPopoverTrigger(
  props: React.ComponentProps<typeof PopoverPrimitive.Trigger>
) {
  return <PopoverPrimitive.Trigger data-slot="glass-popover-trigger" {...props} />
}

function GlassPopoverAnchor(
  props: React.ComponentProps<typeof PopoverPrimitive.Anchor>
) {
  return <PopoverPrimitive.Anchor data-slot="glass-popover-anchor" {...props} />
}

function GlassPopoverClose(
  props: React.ComponentProps<typeof PopoverPrimitive.Close>
) {
  return <PopoverPrimitive.Close data-slot="glass-popover-close" {...props} />
}

function GlassPopoverContent({
  className,
  align = "center",
  sideOffset = 10,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        asChild
        {...props}
      >
        <LiquidGlass
          data-slot="glass-popover-content"
          variant="frosted"
          className={cn(
            "z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-[24px] p-4 text-(--glass-foreground) outline-none",
            "[--glass-enter-scale:0.5] [--glass-exit-scale:0.9] data-[state=open]:animate-[opaline-glass-in_320ms_cubic-bezier(0.34,1.35,0.64,1)] data-[state=closed]:animate-[opaline-glass-out_140ms_ease-in_forwards]",
            className
          )}
        >
          {children}
        </LiquidGlass>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}

export {
  GlassPopover,
  GlassPopoverTrigger,
  GlassPopoverAnchor,
  GlassPopoverClose,
  GlassPopoverContent,
}
