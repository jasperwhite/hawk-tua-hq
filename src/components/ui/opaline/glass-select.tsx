"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckIcon, UnfoldMoreIcon } from "@hugeicons/core-free-icons"
import { Select as SelectPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

function GlassSelect(props: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="glass-select" {...props} />
}

function GlassSelectGroup(
  props: React.ComponentProps<typeof SelectPrimitive.Group>
) {
  return <SelectPrimitive.Group data-slot="glass-select-group" {...props} />
}

function GlassSelectValue(
  props: React.ComponentProps<typeof SelectPrimitive.Value>
) {
  return <SelectPrimitive.Value data-slot="glass-select-value" {...props} />
}

function GlassSelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <LiquidGlass
      asChild
      className={cn(
        "flex h-11 w-full min-w-44 cursor-pointer items-center justify-between gap-2 rounded-full pr-3 pl-4 text-[15px] tracking-[-0.01em] text-(--glass-foreground) transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] outline-none active:scale-[0.97] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:[&>span]:opacity-55 [&>span]:truncate",
        className
      )}
    >
      <SelectPrimitive.Trigger data-slot="glass-select-trigger" {...props}>
        {children}
        <SelectPrimitive.Icon asChild>
          <HugeiconsIcon icon={UnfoldMoreIcon} className="size-4 shrink-0 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
    </LiquidGlass>
  )
}

function GlassSelectContent({
  className,
  children,
  position = "popper",
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="glass-select-content"
        position={position}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-(--radix-select-trigger-width) origin-(--radix-select-content-transform-origin)",
          "[--glass-enter-scale:0.75] [--glass-exit-scale:0.9] data-[state=open]:animate-[opaline-glass-in_320ms_cubic-bezier(0.34,1.35,0.64,1)] data-[state=closed]:animate-[opaline-glass-out_140ms_ease-in_forwards]",
          className
        )}
        {...props}
      >
        <LiquidGlass
          variant="frosted"
          className="rounded-[22px] p-1.5 text-(--glass-foreground)"
        >
          <SelectPrimitive.Viewport className="max-h-72 scroll-py-1.5">
            {children}
          </SelectPrimitive.Viewport>
        </LiquidGlass>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function GlassSelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="glass-select-label"
      className={cn("px-3 pt-2 pb-1 text-xs font-medium opacity-55", className)}
      {...props}
    />
  )
}

function GlassSelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="glass-select-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-[14px] py-2 pr-9 pl-3 text-[15px] tracking-[-0.01em] outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-(--glass-highlight) [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute right-3 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <HugeiconsIcon icon={CheckIcon} className="size-4" strokeWidth={2.5} />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  )
}

function GlassSelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="glass-select-separator"
      className={cn("mx-3 my-1 h-px bg-current opacity-10", className)}
      {...props}
    />
  )
}

export {
  GlassSelect,
  GlassSelectGroup,
  GlassSelectValue,
  GlassSelectTrigger,
  GlassSelectContent,
  GlassSelectLabel,
  GlassSelectItem,
  GlassSelectSeparator,
}
