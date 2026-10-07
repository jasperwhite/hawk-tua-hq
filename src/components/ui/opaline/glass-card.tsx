import * as React from "react"

import { cn } from "@/lib/utils"
import { LiquidGlass, type LiquidGlassProps } from "@/components/ui/opaline/liquid-glass"

function GlassCard({
  className,
  variant = "frosted",
  ...props
}: LiquidGlassProps) {
  return (
    <LiquidGlass
      data-slot="glass-card"
      variant={variant}
      className={cn(
        "flex flex-col gap-5 rounded-[28px] py-6 text-(--glass-foreground)",
        className
      )}
      {...props}
    />
  )
}

function GlassCardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-card-header"
      className={cn(
        "grid auto-rows-min items-start gap-1 px-6 has-data-[slot=glass-card-action]:grid-cols-[1fr_auto]",
        className
      )}
      {...props}
    />
  )
}

function GlassCardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-card-title"
      className={cn(
        "text-[17px] leading-tight font-semibold tracking-[-0.02em]",
        className
      )}
      {...props}
    />
  )
}

function GlassCardDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-card-description"
      className={cn("text-sm opacity-65", className)}
      {...props}
    />
  )
}

function GlassCardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function GlassCardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function GlassCardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-card-footer"
      className={cn("flex items-center gap-2 px-6", className)}
      {...props}
    />
  )
}

export {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardAction,
  GlassCardContent,
  GlassCardFooter,
}
