"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

const SWEEP = 270
const START = -135

/** Rotary dial with a liquid glass cap. Drag around it or use the arrow keys. */
function GlassKnob({
  value: valueProp,
  defaultValue = 50,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  size = 132,
  color = "oklch(0.72 0.17 255)",
  label = "Value",
  formatValue = (v: number) => String(Math.round(v)),
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "defaultValue" | "onChange"> & {
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  size?: number
  /** Colour of the active arc. */
  color?: string
  label?: string
  formatValue?: (value: number) => string
}) {
  const [inner, setInner] = React.useState(defaultValue)
  const value = valueProp ?? inner
  const ref = React.useRef<HTMLDivElement>(null)

  const set = (v: number) => {
    const next = Math.min(max, Math.max(min, Math.round(v / step) * step))
    setInner(next)
    onValueChange?.(next)
  }

  const fromPointer = (clientX: number, clientY: number) => {
    const r = ref.current!.getBoundingClientRect()
    const angle =
      (Math.atan2(clientX - (r.left + r.width / 2), -(clientY - (r.top + r.height / 2))) *
        180) /
      Math.PI
    const clamped = Math.min(SWEEP / 2, Math.max(-SWEEP / 2, angle))
    set(min + ((clamped - START) / SWEEP) * (max - min))
  }

  const t = (value - min) / (max - min)
  const angle = START + t * SWEEP
  const r = size / 2 - 6
  const c = 2 * Math.PI * r
  const arc = (SWEEP / 360) * c

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={formatValue(value)}
      data-slot="glass-knob"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        fromPointer(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => e.buttons === 1 && fromPointer(e.clientX, e.clientY)}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowRight") set(value + step)
        else if (e.key === "ArrowDown" || e.key === "ArrowLeft") set(value - step)
        else if (e.key === "Home") set(min)
        else if (e.key === "End") set(max)
        else return
        e.preventDefault()
      }}
      className={cn(
        "group/knob relative grid shrink-0 cursor-grab touch-none place-items-center rounded-full outline-none select-none active:cursor-grabbing focus-visible:ring-[3px] focus-visible:ring-ring/40",
        className
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg
        aria-hidden
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 rotate-[135deg]"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${c}`}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={`${arc * t} ${c}`}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <LiquidGlass
        bezel={size * 0.18}
        className="grid place-items-center rounded-full text-(--glass-foreground) transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-active/knob:scale-[1.04]"
        style={{ width: size * 0.66, height: size * 0.66 }}
      >
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <span
            className="absolute top-[9%] left-1/2 size-1.5 -translate-x-1/2 rounded-full"
            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          />
        </span>
        <span className="text-lg font-semibold tracking-[-0.03em] tabular-nums">
          {formatValue(value)}
        </span>
      </LiquidGlass>
    </div>
  )
}

export { GlassKnob }
