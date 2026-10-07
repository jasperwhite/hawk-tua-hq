"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { useActiveIndicator } from "@/hooks/use-active-indicator"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

function GlassTabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="glass-tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

/** Segmented control with a liquid glass bubble that glides between tabs. */
function GlassTabsList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const ref = React.useRef<HTMLDivElement>(null)
  const rect = useActiveIndicator(ref)

  return (
    <TabsPrimitive.List asChild {...props}>
      <LiquidGlass
        ref={ref}
        data-slot="glass-tabs-list"
        className={cn(
          "inline-flex h-11 w-fit items-center rounded-full p-1 text-(--glass-foreground)",
          className
        )}
      >
        {rect ? (
          <LiquidGlass
            aria-hidden
            shadow={false}
            bezel={12}
            tint="var(--glass-highlight)"
            className="absolute rounded-full transition-[left,width] duration-500 ease-[cubic-bezier(0.34,1.3,0.64,1)]"
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            }}
          />
        ) : null}
        {children}
      </LiquidGlass>
    </TabsPrimitive.List>
  )
}

function GlassTabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="glass-tabs-trigger"
      className={cn(
        "relative z-10 inline-flex h-full flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium tracking-[-0.01em] whitespace-nowrap opacity-65 transition-opacity duration-300 outline-none hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-35 data-[state=active]:opacity-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function GlassTabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="glass-tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { GlassTabs, GlassTabsList, GlassTabsTrigger, GlassTabsContent }
