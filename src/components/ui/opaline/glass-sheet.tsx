import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { XIcon } from "@hugeicons/core-free-icons"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

type SheetContextValue = { setOpen: (open: boolean) => void }
const SheetContext = React.createContext<SheetContextValue>({ setOpen: () => {} })

/** Floating glass sheet. Use `side="bottom"` for a drag-to-dismiss drawer. */
function GlassSheet({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const [inner, setInner] = React.useState(defaultOpen)
  const open = openProp ?? inner
  const setOpen = React.useCallback(
    (next: boolean) => {
      setInner(next)
      onOpenChange?.(next)
    },
    [onOpenChange]
  )
  return (
    <SheetContext.Provider value={{ setOpen }}>
      <DialogPrimitive.Root
        data-slot="glass-sheet"
        open={open}
        onOpenChange={setOpen}
        {...props}
      />
    </SheetContext.Provider>
  )
}

function GlassSheetTrigger(
  props: React.ComponentProps<typeof DialogPrimitive.Trigger>
) {
  return <DialogPrimitive.Trigger data-slot="glass-sheet-trigger" {...props} />
}

function GlassSheetClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="glass-sheet-close" {...props} />
}

const sides = {
  right:
    "inset-y-3 right-3 w-[min(24rem,calc(100%-1.5rem))] [--glass-enter-x:110%] [--glass-exit-x:110%]",
  left: "inset-y-3 left-3 w-[min(24rem,calc(100%-1.5rem))] [--glass-enter-x:-110%] [--glass-exit-x:-110%]",
  top: "inset-x-3 top-3 mx-auto max-w-2xl [--glass-enter-y:-110%] [--glass-exit-y:-110%]",
  bottom:
    "inset-x-3 bottom-3 mx-auto max-h-[85vh] max-w-2xl [--glass-enter-y:110%] [--glass-exit-y:110%]",
}

function GlassSheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  style,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: keyof typeof sides
  showCloseButton?: boolean
}) {
  const { setOpen } = React.useContext(SheetContext)
  const [drag, setDrag] = React.useState(0)
  const start = React.useRef<number | null>(null)
  const drawer = side === "bottom"

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="glass-sheet-overlay"
        className="fixed inset-0 z-50 bg-black/20 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
      />
      {/* Transform-only motion: filter/opacity animations would cut off the backdrop. */}
      <DialogPrimitive.Content asChild {...props}>
        <LiquidGlass
          data-slot="glass-sheet-content"
          data-side={side}
          variant="frosted"
          className={cn(
            "fixed z-50 flex flex-col gap-4 rounded-[32px] p-6 text-(--glass-foreground) outline-none",
            "data-[state=open]:animate-[opaline-glass-in_500ms_cubic-bezier(0.32,0.72,0,1)] data-[state=closed]:animate-[opaline-glass-out_280ms_cubic-bezier(0.32,0.72,0,1)_forwards]",
            drawer && "pt-3",
            sides[side],
            className
          )}
          style={
            drawer && drag > 0
              ? { transform: `translateY(${drag}px)`, transition: start.current === null ? "transform 0.3s" : "none", ...style }
              : style
          }
        >
          {drawer ? (
            <div
              aria-hidden
              className="-mt-1 flex cursor-grab touch-none justify-center py-2 active:cursor-grabbing"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                start.current = e.clientY
              }}
              onPointerMove={(e) => {
                if (start.current !== null) setDrag(Math.max(0, e.clientY - start.current))
              }}
              onPointerUp={() => {
                start.current = null
                if (drag > 110) setOpen(false)
                setDrag(0)
              }}
            >
              <span className="h-1.5 w-10 rounded-full bg-current opacity-25" />
            </div>
          ) : null}
          {children}
          {showCloseButton && !drawer ? (
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

function GlassSheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-sheet-header"
      className={cn("flex flex-col gap-1.5 pr-8", className)}
      {...props}
    />
  )
}

function GlassSheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}

function GlassSheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="glass-sheet-title"
      className={cn("text-xl leading-tight font-semibold tracking-[-0.025em]", className)}
      {...props}
    />
  )
}

function GlassSheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="glass-sheet-description"
      className={cn("text-sm leading-relaxed opacity-70", className)}
      {...props}
    />
  )
}

export {
  GlassSheet,
  GlassSheetTrigger,
  GlassSheetClose,
  GlassSheetContent,
  GlassSheetHeader,
  GlassSheetFooter,
  GlassSheetTitle,
  GlassSheetDescription,
}
