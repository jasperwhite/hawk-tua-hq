"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

type StackOptions = {
  /** Distance from the top of the scroller where cards stick, in px. */
  stackTop: number
  /** Extra offset for each stacked card, so their tops peek out, in px. */
  stackGap: number
  /** How much a card shrinks for each card stacked on top of it. */
  scaleStep: number
  /** Smallest scale a buried card reaches. */
  minScale: number
}

const StackContext = React.createContext<{ index: number; options: StackOptions } | null>(null)

/**
 * Cards that pin and pile up as you scroll: each one sticks below the last,
 * and the ones underneath shrink and dim as new cards land on them. Set
 * `height` to scroll inside the stack; leave it out to use the page scroll.
 */
function GlassScrollStack({
  height,
  stackTop = 24,
  stackGap = 14,
  scaleStep = 0.045,
  minScale = 0.8,
  className,
  children,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  /** Makes the stack its own scroll container of this height. */
  height?: number | string
} & Partial<StackOptions>) {
  const ref = React.useRef<HTMLDivElement>(null)
  const options = React.useMemo(
    () => ({ stackTop, stackGap, scaleStep, minScale }),
    [stackTop, stackGap, scaleStep, minScale]
  )

  React.useEffect(() => {
    const root = ref.current
    if (!root) return
    const scroller: HTMLElement | Window = height !== undefined ? root : window
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let frame = 0

    const update = () => {
      frame = 0
      const cards = [...root.querySelectorAll<HTMLElement>(":scope > [data-slot=glass-scroll-stack-item]")]
      const top = scroller === window ? 0 : root.getBoundingClientRect().top
      const rects = cards.map((c) => c.getBoundingClientRect())
      cards.forEach((card, i) => {
        // How far the following cards have slid over this one (0 – n).
        let depth = 0
        for (let j = i + 1; j < cards.length; j++) {
          const pinnedAt = top + options.stackTop + j * options.stackGap
          const travel = rects[i].height * 0.9
          depth += Math.min(1, Math.max(0, 1 - (rects[j].top - pinnedAt) / travel))
        }
        const scale = Math.max(options.minScale, 1 - depth * options.scaleStep)
        const inner = card.firstElementChild as HTMLElement | null
        if (inner) inner.style.transform = reduce ? "" : `scale(${scale})`
        card.style.setProperty("--stack-depth", String(Math.min(depth, 3)))
      })
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    scroller.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      cancelAnimationFrame(frame)
      scroller.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [height, options])

  const items = React.Children.toArray(children)

  return (
    <div
      ref={ref}
      data-slot="glass-scroll-stack"
      className={cn(
        "relative flex w-full flex-col",
        height !== undefined && "overflow-y-auto overscroll-contain [scrollbar-width:none]",
        className
      )}
      style={{ height, ...style }}
      {...props}
    >
      {items.map((child, index) => (
        <StackContext.Provider key={index} value={{ index, options }}>
          {child}
        </StackContext.Provider>
      ))}
      {/* Room to scroll the last card into place. */}
      <div aria-hidden className="h-[45vh] shrink-0" />
    </div>
  )
}

/** One card in the stack. Glass by default; any content inside. */
function GlassScrollStackItem({
  className,
  children,
  spacing = 160,
  ...props
}: React.ComponentProps<typeof LiquidGlass> & {
  /** Scroll distance before the next card arrives, in px. */
  spacing?: number
}) {
  const ctx = React.useContext(StackContext)
  const index = ctx?.index ?? 0
  const options = ctx?.options

  return (
    <div
      data-slot="glass-scroll-stack-item"
      className="sticky shrink-0 [--stack-depth:0]"
      style={{
        top: options ? options.stackTop + index * options.stackGap : 0,
        marginBottom: spacing,
      }}
    >
      {/* Scale goes on this wrapper: transforms on a glass ancestor are safe. */}
      <div className="origin-top will-change-transform">
        <LiquidGlass
          variant="frosted"
          className={cn("relative overflow-hidden rounded-[30px] p-7 text-(--glass-foreground)", className)}
          {...props}
        >
          {children}
          {/* Dims buried cards without touching the glass's opacity. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] bg-black"
            style={{ opacity: "calc(var(--stack-depth) * 0.08)" }}
          />
        </LiquidGlass>
      </div>
    </div>
  )
}

export { GlassScrollStack, GlassScrollStackItem }
