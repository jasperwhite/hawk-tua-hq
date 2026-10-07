import * as React from "react"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

/**
 * A draggable liquid glass lens. Place it inside a `relative` container —
 * it refracts whatever sits beneath it.
 */
function GlassLens({
  className,
  size = 140,
  defaultPosition = { x: 24, y: 24 },
  style,
  ...props
}: React.ComponentProps<typeof LiquidGlass> & {
  size?: number
  defaultPosition?: { x: number; y: number }
}) {
  const [pos, setPos] = React.useState(defaultPosition)
  const [dragging, setDragging] = React.useState(false)
  const offset = React.useRef({ x: 0, y: 0 })
  const ref = React.useRef<HTMLDivElement>(null)

  const clamp = React.useCallback(
    (x: number, y: number) => {
      const parent = ref.current?.offsetParent as HTMLElement | null
      if (!parent) return { x, y }
      return {
        x: Math.min(Math.max(0, x), parent.clientWidth - size),
        y: Math.min(Math.max(0, y), parent.clientHeight - size),
      }
    },
    [size]
  )

  // Keep the lens inside its container when the layout changes.
  React.useLayoutEffect(() => {
    const parent = ref.current?.offsetParent as HTMLElement | null
    if (!parent) return
    const fit = () =>
      setPos((p) => {
        const next = clamp(p.x, p.y)
        return next.x === p.x && next.y === p.y ? p : next
      })
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [clamp])

  return (
    <LiquidGlass
      ref={ref}
      data-slot="glass-lens"
      role="presentation"
      bezel={size * 0.5}
      thickness={1}
      blur={0}
      dispersion={0.05}
      tint="transparent"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
        setDragging(true)
      }}
      onPointerMove={(e) => {
        if (!dragging) return
        setPos(clamp(e.clientX - offset.current.x, e.clientY - offset.current.y))
      }}
      onPointerUp={() => setDragging(false)}
      className={cn(
        "absolute cursor-grab touch-none rounded-full transition-[scale] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] select-none",
        dragging && "scale-105 cursor-grabbing",
        className
      )}
      style={{ width: size, height: size, left: pos.x, top: pos.y, ...style }}
      {...props}
    />
  )
}

export { GlassLens }
