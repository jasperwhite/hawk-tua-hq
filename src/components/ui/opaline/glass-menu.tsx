import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckIcon } from "@hugeicons/core-free-icons"
import { DropdownMenu as MenuPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

function GlassMenu(props: React.ComponentProps<typeof MenuPrimitive.Root>) {
  return <MenuPrimitive.Root data-slot="glass-menu" {...props} />
}

function GlassMenuTrigger(
  props: React.ComponentProps<typeof MenuPrimitive.Trigger>
) {
  return <MenuPrimitive.Trigger data-slot="glass-menu-trigger" {...props} />
}

function GlassMenuContent({
  className,
  sideOffset = 8,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content asChild sideOffset={sideOffset} {...props}>
        <LiquidGlass
          data-slot="glass-menu-content"
          variant="frosted"
          className={cn(
            "z-50 min-w-52 origin-(--radix-dropdown-menu-content-transform-origin) rounded-[22px] p-1.5 text-(--glass-foreground) outline-none",
            "[--glass-enter-scale:0.5] [--glass-exit-scale:0.9] data-[state=open]:animate-[opaline-glass-in_320ms_cubic-bezier(0.34,1.35,0.64,1)] data-[state=closed]:animate-[opaline-glass-out_140ms_ease-in_forwards]",
            className
          )}
        >
          {children}
        </LiquidGlass>
      </MenuPrimitive.Content>
    </MenuPrimitive.Portal>
  )
}

const item =
  "relative flex cursor-default items-center gap-2.5 rounded-[14px] px-3 py-2 text-[15px] tracking-[-0.01em] outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-(--glass-highlight) [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px] [&_svg]:opacity-75"

function GlassMenuItem({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Item> & {
  variant?: "default" | "destructive"
}) {
  return (
    <MenuPrimitive.Item
      data-slot="glass-menu-item"
      data-variant={variant}
      className={cn(
        item,
        "data-[variant=destructive]:text-[oklch(0.6_0.22_27)]",
        className
      )}
      {...props}
    />
  )
}

function GlassMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="glass-menu-checkbox-item"
      className={cn(item, "pl-9", className)}
      {...props}
    >
      <span className="absolute left-3 flex size-4 items-center justify-center">
        <MenuPrimitive.ItemIndicator>
          <HugeiconsIcon icon={CheckIcon} className="size-4 !opacity-100" strokeWidth={2.5} />
        </MenuPrimitive.ItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

function GlassMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Label>) {
  return (
    <MenuPrimitive.Label
      data-slot="glass-menu-label"
      className={cn("px-3 pt-2 pb-1 text-xs font-medium opacity-55", className)}
      {...props}
    />
  )
}

function GlassMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator
      data-slot="glass-menu-separator"
      className={cn("mx-3 my-1 h-px bg-current opacity-10", className)}
      {...props}
    />
  )
}

function GlassMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="glass-menu-shortcut"
      className={cn("ml-auto pl-4 text-xs tracking-widest opacity-50", className)}
      {...props}
    />
  )
}

export {
  GlassMenu,
  GlassMenuTrigger,
  GlassMenuContent,
  GlassMenuItem,
  GlassMenuCheckboxItem,
  GlassMenuLabel,
  GlassMenuSeparator,
  GlassMenuShortcut,
}
