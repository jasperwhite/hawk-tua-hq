"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { XIcon } from "@hugeicons/core-free-icons"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

function GlassDialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="glass-dialog" {...props} />
}

function GlassDialogTrigger(
  props: React.ComponentProps<typeof DialogPrimitive.Trigger>
) {
  return <DialogPrimitive.Trigger data-slot="glass-dialog-trigger" {...props} />
}

function GlassDialogClose(
  props: React.ComponentProps<typeof DialogPrimitive.Close>
) {
  return <DialogPrimitive.Close data-slot="glass-dialog-close" {...props} />
}

function GlassDialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="glass-dialog-overlay"
        className="fixed inset-0 z-50 bg-black/20 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
      />
      {/* Transform-only motion: filter/opacity animations would cut off the backdrop. */}
      <DialogPrimitive.Content asChild {...props}>
        <LiquidGlass
          data-slot="glass-dialog-content"
          variant="frosted"
          className={cn(
            "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[32px] p-6 text-(--glass-foreground) outline-none sm:max-w-md",
            "[--glass-enter-scale:0.75] [--glass-exit-scale:0.9] data-[state=open]:animate-[opaline-glass-in_420ms_cubic-bezier(0.34,1.35,0.64,1)] data-[state=closed]:animate-[opaline-glass-out_140ms_ease-in_forwards]",
            className
          )}
        >
          {children}
          {showCloseButton ? (
            <DialogPrimitive.Close className="absolute top-4 right-4 grid size-8 cursor-pointer place-items-center rounded-full bg-(--glass-highlight) opacity-80 transition-[opacity,transform] outline-none hover:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/40 active:scale-90 [&_svg]:size-4">
              <HugeiconsIcon icon={XIcon} strokeWidth={2.25} />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          ) : null}
        </LiquidGlass>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function GlassDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-dialog-header"
      className={cn("flex flex-col gap-1.5 pr-8", className)}
      {...props}
    />
  )
}

function GlassDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function GlassDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="glass-dialog-title"
      className={cn(
        "text-xl leading-tight font-semibold tracking-[-0.025em]",
        className
      )}
      {...props}
    />
  )
}

function GlassDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="glass-dialog-description"
      className={cn("text-sm leading-relaxed opacity-70", className)}
      {...props}
    />
  )
}

export {
  GlassDialog,
  GlassDialogTrigger,
  GlassDialogClose,
  GlassDialogContent,
  GlassDialogHeader,
  GlassDialogFooter,
  GlassDialogTitle,
  GlassDialogDescription,
}
