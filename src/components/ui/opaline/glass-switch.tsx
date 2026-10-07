import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

/** Thumb travel in px: track width minus padding minus thumb width. */
const TRAVEL = 20
/** Drag distance that counts as a slide instead of a tap. */
const DRAG_THRESHOLD = 6
/** Hard cap on how far the thumb may stray past either end, in px. */
const MAX_OVERSHOOT = 10

/**
 * iOS-style switch with a liquid glass thumb.
 *
 * Like the kube.io reference, the thumb uses a `lip` bezel, swells while
 * held (fast grow, slow overshoot settle), follows the pointer on
 * hold-and-slide, and refracts harder while pressed. Releasing past the
 * halfway point commits the new state; a plain tap toggles as usual.
 */
function GlassSwitch({
  className,
  checked: checkedProp,
  defaultChecked,
  onCheckedChange,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  const [innerChecked, setInnerChecked] = React.useState(defaultChecked ?? false)
  const checked = checkedProp ?? innerChecked
  const [pressed, setPressed] = React.useState(false)
  const [dragOffset, setDragOffset] = React.useState(0)
  const startX = React.useRef(0)
  const dragged = React.useRef(false)

  const setChecked = React.useCallback(
    (next: boolean) => {
      if (checkedProp === undefined) setInnerChecked(next)
      onCheckedChange?.(next)
    },
    [checkedProp, onCheckedChange]
  )

  const baseX = checked ? TRAVEL : 0
  const thumbX = baseX + dragOffset

  const settle = React.useCallback(() => {
    setPressed(false)
    setDragOffset(0)
  }, [])

  return (
    <SwitchPrimitive.Root
      data-slot="glass-switch"
      checked={checked}
      onCheckedChange={setChecked}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return
        startX.current = e.clientX
        dragged.current = false
        setPressed(true)
        setDragOffset(0)
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          // Pointer capture unavailable — moves still tracked on the root.
        }
      }}
      onPointerMove={(e) => {
        if (!pressed) return
        const dx = e.clientX - startX.current
        if (Math.abs(dx) > 3) dragged.current = true
        // Short, stiff leash past the ends: strong rubber-band plus a hard
        // cap so the swollen thumb never detaches from the track.
        const rubber = (over: number) =>
          Math.max(-MAX_OVERSHOOT, Math.min(MAX_OVERSHOOT, over * 0.12))
        const pos = baseX + dx
        const clamped = pos < 0 ? rubber(pos) : pos > TRAVEL ? TRAVEL + rubber(pos - TRAVEL) : pos
        setDragOffset(clamped - baseX)
      }}
      onPointerUp={(e) => {
        if (!pressed) return
        const dx = e.clientX - startX.current
        if (dragged.current && Math.abs(dx) > DRAG_THRESHOLD) {
          const next = baseX + dx > TRAVEL / 2
          if (next !== checked) setChecked(next)
        }
        settle()
      }}
      onPointerCancel={settle}
      onClickCapture={(e) => {
        // A slide already committed its state — swallow the trailing click
        // so Radix doesn't toggle a second time.
        if (dragged.current) {
          e.preventDefault()
          e.stopPropagation()
          dragged.current = false
        }
      }}
      className={cn(
        "peer group/switch relative inline-flex h-8 w-[60px] shrink-0 cursor-pointer touch-none items-center rounded-full p-[3px] transition-colors duration-500 outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
        "shadow-[inset_0_1px_2px_rgb(0_0_0/0.12)] data-[state=checked]:bg-[oklch(0.72_0.19_148)] data-[state=unchecked]:bg-[oklch(0.5_0.01_286/0.22)] dark:data-[state=unchecked]:bg-[oklch(1_0_0/0.16)]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb asChild>
        <LiquidGlass
          data-slot="glass-switch-thumb"
          bezel={10}
          thickness={2.1}
          surface="lip"
          refraction={pressed ? 30 : 18}
          dispersion={0.05}
          className={cn(
            "pointer-events-none block h-[26px] w-[34px] rounded-full transition-transform outline-none will-change-transform",
            pressed
              ? "duration-150 ease-out"
              : "duration-[600ms] ease-[cubic-bezier(0.22,1.4,0.36,1)]"
          )}
          style={{
            transform: `translateX(${thumbX}px) scale(${pressed ? 1.25 : 1})`,
          }}
        >
          <span
            className={cn(
              "absolute inset-0 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.2)] transition-opacity duration-300",
              pressed && "opacity-0"
            )}
          />
        </LiquidGlass>
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  )
}

export { GlassSwitch }
