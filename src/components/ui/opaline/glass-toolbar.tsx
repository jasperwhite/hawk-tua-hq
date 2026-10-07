"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

/** Floating capsule toolbar — groups icon actions like iOS 26 toolbars. */
function GlassToolbar({
  className,
  ...props
}: React.ComponentProps<typeof LiquidGlass>) {
  return (
    <LiquidGlass
      role="toolbar"
      data-slot="glass-toolbar"
      className={cn(
        "flex h-13 w-fit items-center gap-0.5 rounded-full px-1.5 text-(--glass-foreground)",
        className
      )}
      {...props}
    />
  )
}

function GlassToolbarButton({
  className,
  active,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      data-slot="glass-toolbar-button"
      data-active={active ? "" : undefined}
      aria-pressed={active}
      className={cn(
        "grid size-10 cursor-pointer place-items-center rounded-full transition-[background-color,transform] duration-200 outline-none hover:bg-(--glass-highlight) focus-visible:ring-[3px] focus-visible:ring-ring/40 active:scale-90 data-[active]:bg-(--glass-highlight) data-[active]:text-[oklch(0.6_0.2_255)] dark:data-[active]:text-[oklch(0.74_0.15_255)] [&_svg]:size-5",
        className
      )}
      {...props}
    />
  )
}

function GlassToolbarSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      data-slot="glass-toolbar-separator"
      className={cn("mx-1 h-6 w-px bg-current opacity-15", className)}
      {...props}
    />
  )
}

export { GlassToolbar, GlassToolbarButton, GlassToolbarSeparator }
