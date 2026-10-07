"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

/**
 * A deck of glass cards. Swipe or drag the top card sideways to send it to
 * the back; use ← / → when focused.
 */
function GlassStack({
  className,
  children,
  onIndexChange,
  ...props
}: React.ComponentProps<"div"> & {
  /** Called with the index of the card now on top. */
  onIndexChange?: (index: number) => void
}) {
  const cards = React.Children.toArray(children)
  const [order, setOrder] = React.useState(() => cards.map((_, i) => i))
  const [dx, setDx] = React.useState(0)
  const [dragging, setDragging] = React.useState(false)
  const [leaving, setLeaving] = React.useState(false)
  const start = React.useRef(0)

  React.useEffect(() => {
    setOrder((o) => (o.length === cards.length ? o : cards.map((_, i) => i)))
  }, [cards.length])

  const cycle = (direction: 1 | -1) => {
    if (leaving) return
    setLeaving(true)
    setDx(direction * 520)
    setTimeout(() => {
      setOrder((o) => {
        const next = [...o.slice(1), o[0]]
        onIndexChange?.(next[0])
        return next
      })
      setDx(0)
      setLeaving(false)
    }, 260)
  }

  return (
    <div
      data-slot="glass-stack"
      tabIndex={0}
      role="group"
      aria-roledescription="card stack"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") cycle(1)
        if (e.key === "ArrowLeft") cycle(-1)
      }}
      className={cn(
        "relative h-52 w-80 rounded-[28px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
        className
      )}
      {...props}
    >
      {order.map((cardIndex, depth) => {
        const top = depth === 0
        const style: React.CSSProperties = top
          ? {
              transform: `translateX(${dx}px) rotate(${dx / 18}deg)`,
              transition: dragging ? "none" : undefined,
              zIndex: cards.length,
            }
          : {
              transform: `translateY(${Math.min(depth, 3) * 12}px) scale(${1 - Math.min(depth, 3) * 0.06})`,
              zIndex: cards.length - depth,
              opacity: depth > 2 ? 0 : 1,
            }
        return (
          <div
            key={cardIndex}
            aria-hidden={!top}
            className={cn(
              "absolute inset-0 origin-bottom transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)]",
              top && "cursor-grab touch-pan-y active:cursor-grabbing"
            )}
            style={style}
            onPointerDown={
              top
                ? (e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    start.current = e.clientX
                    setDragging(true)
                  }
                : undefined
            }
            onPointerMove={
              top && dragging ? (e) => setDx(e.clientX - start.current) : undefined
            }
            onPointerUp={
              top
                ? () => {
                    setDragging(false)
                    if (Math.abs(dx) > 90) cycle(dx > 0 ? 1 : -1)
                    else setDx(0)
                  }
                : undefined
            }
          >
            {cards[cardIndex]}
          </div>
        )
      })}
    </div>
  )
}

function GlassStackCard({
  className,
  variant = "frosted",
  ...props
}: React.ComponentProps<typeof LiquidGlass>) {
  return (
    <LiquidGlass
      data-slot="glass-stack-card"
      variant={variant}
      className={cn(
        "flex size-full flex-col rounded-[28px] p-6 text-(--glass-foreground) select-none",
        className
      )}
      {...props}
    />
  )
}

export { GlassStack, GlassStackCard }
