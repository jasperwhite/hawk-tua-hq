import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckIcon, ChevronRightIcon } from "@hugeicons/core-free-icons"
import { ContextMenu as ContextMenuPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

function GlassContextMenu(props: React.ComponentProps<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root data-slot="glass-context-menu" {...props} />
}

function GlassContextMenuTrigger(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>
) {
  return <ContextMenuPrimitive.Trigger data-slot="glass-context-menu-trigger" {...props} />
}

const surface =
  "z-50 min-w-56 origin-(--radix-context-menu-content-transform-origin) rounded-[22px] p-1.5 text-(--glass-foreground) outline-none [--glass-enter-scale:0.6] [--glass-exit-scale:0.92] data-[state=open]:animate-[opaline-glass-in_340ms_cubic-bezier(0.34,1.4,0.64,1)] data-[state=closed]:animate-[opaline-glass-out_120ms_ease-in_forwards]"

/** Springs open from the cursor on right-click or long-press. */
function GlassContextMenuContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content asChild {...props}>
        <LiquidGlass data-slot="glass-context-menu-content" variant="frosted" className={cn(surface, className)}>
          {children}
        </LiquidGlass>
      </ContextMenuPrimitive.Content>
    </ContextMenuPrimitive.Portal>
  )
}

/** A row of round quick actions (Copy, Share, Delete…) above the list. */
function GlassContextMenuActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="group"
      data-slot="glass-context-menu-actions"
      className={cn("mb-1 flex items-start justify-between gap-1 px-1 pt-1 pb-1.5", className)}
      {...props}
    />
  )
}

function GlassContextMenuAction({
  className,
  icon,
  label,
  variant = "default",
  ...props
}: Omit<React.ComponentProps<typeof ContextMenuPrimitive.Item>, "children"> & {
  icon: React.ReactNode
  label: string
  variant?: "default" | "destructive"
}) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="glass-context-menu-action"
      data-variant={variant}
      aria-label={label}
      className={cn(
        "group/action flex w-14 cursor-default flex-col items-center gap-1 rounded-[16px] outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        className
      )}
      {...props}
    >
      <span className="grid size-11 place-items-center rounded-full bg-(--glass-highlight) transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-data-[highlighted]/action:scale-110 group-data-[highlighted]/action:bg-[oklch(0.62_0.19_255)] group-data-[highlighted]/action:text-white group-data-[variant=destructive]/action:text-[oklch(0.6_0.22_27)] group-data-[variant=destructive]/action:group-data-[highlighted]/action:bg-[oklch(0.62_0.22_27)] group-data-[variant=destructive]/action:group-data-[highlighted]/action:text-white [&_svg]:size-[19px]">
        {icon}
      </span>
      <span className="text-[11px] font-medium opacity-75">{label}</span>
    </ContextMenuPrimitive.Item>
  )
}

const item =
  "relative flex cursor-default items-center gap-2.5 rounded-[14px] px-3 py-2 text-[15px] tracking-[-0.01em] outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-(--glass-highlight) data-[state=open]:bg-(--glass-highlight) [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px] [&_svg]:opacity-75"

function GlassContextMenuItem({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & { variant?: "default" | "destructive" }) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="glass-context-menu-item"
      data-variant={variant}
      className={cn(item, "data-[variant=destructive]:text-[oklch(0.6_0.22_27)]", className)}
      {...props}
    />
  )
}

function GlassContextMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="glass-context-menu-checkbox-item"
      className={cn(item, "pl-9", className)}
      {...props}
    >
      <span className="absolute left-3 flex size-4 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <HugeiconsIcon icon={CheckIcon} className="size-4 !opacity-100" strokeWidth={2.5} />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  )
}

function GlassContextMenuSub(props: React.ComponentProps<typeof ContextMenuPrimitive.Sub>) {
  return <ContextMenuPrimitive.Sub data-slot="glass-context-menu-sub" {...props} />
}

function GlassContextMenuSubTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger>) {
  return (
    <ContextMenuPrimitive.SubTrigger
      data-slot="glass-context-menu-sub-trigger"
      className={cn(item, className)}
      {...props}
    >
      {children}
      <HugeiconsIcon icon={ChevronRightIcon} className="ml-auto size-4" />
    </ContextMenuPrimitive.SubTrigger>
  )
}

function GlassContextMenuSubContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.SubContent asChild sideOffset={6} {...props}>
        <LiquidGlass variant="frosted" className={cn(surface, "min-w-44", className)}>
          {children}
        </LiquidGlass>
      </ContextMenuPrimitive.SubContent>
    </ContextMenuPrimitive.Portal>
  )
}

function GlassContextMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Label>) {
  return (
    <ContextMenuPrimitive.Label
      data-slot="glass-context-menu-label"
      className={cn("px-3 pt-2 pb-1 text-xs font-medium opacity-55", className)}
      {...props}
    />
  )
}

function GlassContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="glass-context-menu-separator"
      className={cn("mx-3 my-1 h-px bg-current opacity-10", className)}
      {...props}
    />
  )
}

function GlassContextMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="glass-context-menu-shortcut"
      className={cn("ml-auto pl-4 text-xs tracking-widest opacity-50", className)}
      {...props}
    />
  )
}

export {
  GlassContextMenu,
  GlassContextMenuTrigger,
  GlassContextMenuContent,
  GlassContextMenuActions,
  GlassContextMenuAction,
  GlassContextMenuItem,
  GlassContextMenuCheckboxItem,
  GlassContextMenuSub,
  GlassContextMenuSubTrigger,
  GlassContextMenuSubContent,
  GlassContextMenuLabel,
  GlassContextMenuSeparator,
  GlassContextMenuShortcut,
}
