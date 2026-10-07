import * as React from "react"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

type DockContextValue = {
  size: number
  register: (el: HTMLElement | null) => void
}

const DockContext = React.createContext<DockContextValue>({
  size: 48,
  register: () => {},
})

/**
 * macOS-style dock. Magnification runs in a requestAnimationFrame loop that
 * writes sizes straight to the DOM (no React re-render per pointer move), and
 * the dock keeps a fixed height — magnified icons rise above the glass.
 */
function GlassDock({
  className,
  children,
  size = 48,
  magnification = 1.55,
  distance = 140,
  style,
  onPointerMove,
  onPointerLeave,
  ...props
}: React.ComponentProps<"div"> & {
  /** Resting icon size in px. */
  size?: number
  /** Scale of the icon directly under the cursor. */
  magnification?: number
  /** Radius of influence in px. */
  distance?: number
}) {
  const items = React.useRef(new Set<HTMLElement>())
  const pointer = React.useRef<number | null>(null)
  const frame = React.useRef(0)

  const update = React.useCallback(() => {
    frame.current = 0
    const x = pointer.current
    for (const el of items.current) {
      let px = size
      if (x !== null) {
        const r = el.getBoundingClientRect()
        const t = Math.max(0, 1 - Math.abs(x - (r.left + r.width / 2)) / distance)
        // Smooth cosine falloff like the macOS dock.
        px = size * (1 + (magnification - 1) * (0.5 - 0.5 * Math.cos(Math.PI * t)))
      }
      el.style.width = `${px}px`
      el.style.height = `${px}px`
    }
  }, [size, magnification, distance])

  const schedule = () => {
    if (!frame.current) frame.current = requestAnimationFrame(update)
  }

  React.useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const register = React.useCallback((el: HTMLElement | null) => {
    if (el) items.current.add(el)
  }, [])

  // Drop detached items on every render pass.
  React.useEffect(() => {
    for (const el of items.current) if (!el.isConnected) items.current.delete(el)
  })

  return (
    <DockContext.Provider value={{ size, register }}>
      <LiquidGlass
        data-slot="glass-dock"
        role="toolbar"
        onPointerMove={(e) => {
          if (e.pointerType === "mouse") {
            pointer.current = e.clientX
            schedule()
          }
          onPointerMove?.(e)
        }}
        onPointerLeave={(e) => {
          pointer.current = null
          schedule()
          onPointerLeave?.(e)
        }}
        className={cn(
          "flex w-fit items-end gap-2 rounded-[18px] px-2 pb-2",
          className
        )}
        style={{ height: size + 16, ...style }}
        {...props}
      >
        {children}
      </LiquidGlass>
    </DockContext.Provider>
  )
}

function GlassDockItem({
  className,
  children,
  label,
  active,
  style,
  ...props
}: React.ComponentProps<"button"> & {
  label?: string
  /** Shows the running-app indicator dot. */
  active?: boolean
}) {
  const { size, register } = React.useContext(DockContext)

  return (
    <button
      ref={register}
      type="button"
      data-slot="glass-dock-item"
      aria-label={label}
      className={cn(
        "group/dock-item relative flex shrink-0 cursor-pointer items-end justify-center outline-none",
        "transition-[width,height] duration-100 ease-out will-change-[width,height]",
        className
      )}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      {label ? (
        <LiquidGlass
          variant="frosted"
          bezel={8}
          className="pointer-events-none absolute -top-10 left-1/2 origin-bottom -translate-x-1/2 scale-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap text-(--glass-foreground) transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/dock-item:scale-100 group-focus-visible/dock-item:scale-100"
        >
          {label}
        </LiquidGlass>
      ) : null}
      <span className="flex size-full items-center justify-center overflow-hidden rounded-[22.5%] shadow-[0_2px_6px_rgb(0_0_0/0.15)] transition-transform duration-200 group-active/dock-item:scale-90 group-focus-visible/dock-item:ring-2 group-focus-visible/dock-item:ring-ring [&>*]:size-full">
        {children}
      </span>
      {active ? (
        <span className="absolute -bottom-[5px] left-1/2 size-1 -translate-x-1/2 rounded-full bg-(--glass-foreground) opacity-70" />
      ) : null}
    </button>
  )
}

function GlassDockSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      data-slot="glass-dock-separator"
      className={cn(
        "mx-1 mb-1 h-[calc(100%-16px)] w-px self-end bg-(--glass-foreground) opacity-15",
        className
      )}
      {...props}
    />
  )
}

export { GlassDock, GlassDockItem, GlassDockSeparator }
