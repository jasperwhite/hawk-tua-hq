"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

function GlassCommand({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="glass-command"
      className={cn("flex size-full flex-col overflow-hidden text-(--glass-foreground)", className)}
      {...props}
    />
  )
}

/** ⌘K-style palette on a frosted glass sheet. */
function GlassCommandDialog({
  title = "Command palette",
  description = "Search for a command to run",
  children,
  className,
  commandProps,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root> & {
  title?: string
  description?: string
  className?: string
  commandProps?: React.ComponentProps<typeof CommandPrimitive>
}) {
  return (
    <DialogPrimitive.Root {...props}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/20 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content asChild>
          <LiquidGlass
            data-slot="glass-command-dialog"
            variant="frosted"
            className={cn(
              "fixed top-[18vh] left-1/2 z-50 w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 overflow-hidden rounded-[28px] outline-none",
              "[--glass-enter-scale:0.9] [--glass-exit-scale:0.96] data-[state=open]:animate-[opaline-glass-in_320ms_cubic-bezier(0.34,1.35,0.64,1)] data-[state=closed]:animate-[opaline-glass-out_140ms_ease-in_forwards]",
              className
            )}
          >
            <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              {description}
            </DialogPrimitive.Description>
            <GlassCommand {...commandProps}>{children}</GlassCommand>
          </LiquidGlass>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function GlassCommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="glass-command-input-wrapper"
      className="flex h-14 items-center gap-3 border-b border-current/10 px-5"
    >
      <HugeiconsIcon icon={Search01Icon} className="size-5 shrink-0 opacity-50" />
      <CommandPrimitive.Input
        data-slot="glass-command-input"
        className={cn(
          "h-full w-full bg-transparent text-[17px] tracking-[-0.015em] outline-none placeholder:text-current placeholder:opacity-45 disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
}

function GlassCommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="glass-command-list"
      className={cn(
        "max-h-[min(22rem,60vh)] scroll-py-2 overflow-x-hidden overflow-y-auto p-2",
        className
      )}
      {...props}
    />
  )
}

function GlassCommandEmpty(props: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="glass-command-empty"
      className="py-10 text-center text-sm opacity-55"
      {...props}
    />
  )
}

function GlassCommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="glass-command-group"
      className={cn(
        "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:opacity-55",
        className
      )}
      {...props}
    />
  )
}

function GlassCommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="glass-command-separator"
      className={cn("mx-3 my-1.5 h-px bg-current opacity-10", className)}
      {...props}
    />
  )
}

function GlassCommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="glass-command-item"
      className={cn(
        "relative flex cursor-default items-center gap-3 rounded-[16px] px-3 py-2.5 text-[15px] tracking-[-0.01em] outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40 data-[selected=true]:bg-(--glass-highlight) [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px] [&_svg]:opacity-75",
        className
      )}
      {...props}
    />
  )
}

function GlassCommandShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="glass-command-shortcut"
      className={cn("ml-auto text-xs tracking-widest opacity-50", className)}
      {...props}
    />
  )
}

export {
  GlassCommand,
  GlassCommandDialog,
  GlassCommandInput,
  GlassCommandList,
  GlassCommandEmpty,
  GlassCommandGroup,
  GlassCommandItem,
  GlassCommandShortcut,
  GlassCommandSeparator,
}
