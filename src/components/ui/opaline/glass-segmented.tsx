import * as React from "react"

import { cn } from "@/lib/utils"
import { useActiveIndicator } from "@/hooks/use-active-indicator"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

type SegmentedContextValue = {
  value: string | undefined
  select: (value: string) => void
}

const SegmentedContext = React.createContext<SegmentedContextValue | null>(null)

/**
 * Icon segmented picker. The glass bubble travels like a drop of liquid: its
 * leading edge races ahead and the trailing edge catches up.
 */
function GlassSegmented({
  className,
  children,
  value: valueProp,
  defaultValue,
  onValueChange,
  "aria-label": ariaLabel,
  ...props
}: Omit<React.ComponentProps<"div">, "defaultValue"> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  const [inner, setInner] = React.useState(defaultValue)
  const value = valueProp ?? inner
  const select = React.useCallback(
    (next: string) => {
      setInner(next)
      onValueChange?.(next)
    },
    [onValueChange]
  )

  const ref = React.useRef<HTMLDivElement>(null)
  const rect = useActiveIndicator(ref, '[data-state="active"]')
  const previous = React.useRef(rect)
  const direction = rect && previous.current ? Math.sign(rect.left - previous.current.left) : 0
  React.useEffect(() => {
    previous.current = rect
  }, [rect])

  const containerWidth = ref.current?.offsetWidth ?? 0
  const fast = "320ms cubic-bezier(0.3, 1.35, 0.6, 1)"
  const slow = "640ms cubic-bezier(0.5, 0, 0.2, 1.12) 60ms"

  return (
    <SegmentedContext.Provider value={{ value, select }}>
      <LiquidGlass
        role="radiogroup"
        aria-label={ariaLabel}
        data-slot="glass-segmented"
        className={cn("inline-flex rounded-[22px] p-1 text-(--glass-foreground)", className)}
        onKeyDown={(e) => {
          if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return
          const items = [
            ...(ref.current?.querySelectorAll<HTMLButtonElement>("[data-slot=glass-segmented-item]:not(:disabled)") ?? []),
          ]
          const i = items.findIndex((el) => el.dataset.state === "active")
          const next = items[(i + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length]
          next?.focus()
          next?.click()
          e.preventDefault()
        }}
        {...props}
      >
        <div ref={ref} className="relative flex">
          {rect ? (
            <LiquidGlass
              aria-hidden
              shadow={false}
              bezel={12}
              tint="var(--glass-highlight)"
              className="absolute rounded-[18px]"
              style={{
                top: rect.top,
                height: rect.height,
                left: rect.left,
                right: containerWidth - rect.left - rect.width,
                transition:
                  direction >= 0
                    ? `right ${fast}, left ${slow}`
                    : `left ${fast}, right ${slow}`,
              }}
            />
          ) : null}
          {children}
        </div>
      </LiquidGlass>
    </SegmentedContext.Provider>
  )
}

function GlassSegmentedItem({
  className,
  value,
  icon,
  label,
  onClick,
  ...props
}: Omit<React.ComponentProps<"button">, "value"> & {
  value: string
  icon?: React.ReactNode
  label?: React.ReactNode
}) {
  const ctx = React.useContext(SegmentedContext)
  const active = ctx?.value === value
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      tabIndex={active ? 0 : -1}
      data-slot="glass-segmented-item"
      data-state={active ? "active" : "inactive"}
      onClick={(e) => {
        ctx?.select(value)
        onClick?.(e)
      }}
      className={cn(
        "relative z-10 flex min-w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-[18px] px-3 py-2 text-[11px] font-semibold tracking-[0.01em] opacity-60 transition-[opacity,transform] duration-300 outline-none hover:opacity-85 focus-visible:ring-[3px] focus-visible:ring-ring/40 active:scale-95 disabled:pointer-events-none disabled:opacity-30 data-[state=active]:opacity-100 [&_svg]:size-5 [&_svg]:transition-transform [&_svg]:duration-500 [&_svg]:ease-[cubic-bezier(0.34,1.56,0.64,1)] data-[state=active]:[&_svg]:scale-110",
        className
      )}
      {...props}
    >
      {icon}
      {label ? <span>{label}</span> : null}
    </button>
  )
}

export { GlassSegmented, GlassSegmentedItem }
