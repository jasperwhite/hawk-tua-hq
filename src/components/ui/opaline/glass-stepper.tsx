"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { MinusIcon, PlusIcon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]

/** Odometer digits for the stepper value — each digit rolls to its new value. */
function RollingNumber({
  value,
  locale = "en-US",
  format,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  value: number
  /** Defaults to en-US so server and client format identically. */
  locale?: string
  format?: Intl.NumberFormatOptions
}) {
  const text = new Intl.NumberFormat(locale, format).format(value)
  const chars = text.split("")

  return (
    <span
      data-slot="rolling-number"
      className={cn(
        "relative inline-flex overflow-hidden leading-[1.15] tabular-nums",
        className
      )}
      {...props}
    >
      <span className="sr-only">{text}</span>
      {chars.map((char, i) => {
        // Key from the right so columns keep their identity as length changes.
        const key = chars.length - i
        const digit = DIGITS.indexOf(char)
        if (digit === -1) {
          return (
            <span key={`s${key}`} aria-hidden>
              {char}
            </span>
          )
        }
        return (
          <span
            key={key}
            aria-hidden
            className="relative inline-block h-[1.15em] overflow-hidden"
          >
            <span
              className="flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.22,1.25,0.36,1)]"
              style={{ transform: `translateY(${-digit * 1.15}em)` }}
            >
              {DIGITS.map((d) => (
                <span key={d} className="h-[1.15em]">
                  {d}
                </span>
              ))}
            </span>
          </span>
        )
      })}
    </span>
  )
}

/**
 * Capsule stepper. Digits roll to the new value, the capsule nudges in the
 * direction you step, holding a button accelerates, and hitting a limit
 * gives a little shake.
 */
function GlassStepper({
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  format,
  label = "Value",
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "defaultValue" | "onChange"> & {
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Intl.NumberFormat options for the displayed value. */
  format?: Intl.NumberFormatOptions
  /** Accessible name. */
  label?: string
}) {
  const [inner, setInner] = React.useState(defaultValue)
  const value = valueProp ?? inner
  const valueRef = React.useRef(value)
  valueRef.current = value
  const [nudge, setNudge] = React.useState(0)
  const [shake, setShake] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  const change = React.useCallback(
    (direction: 1 | -1) => {
      const next = Math.min(max, Math.max(min, +(valueRef.current + direction * step).toFixed(10)))
      if (next === valueRef.current) {
        setShake(true)
        setTimeout(() => setShake(false), 360)
        return false
      }
      valueRef.current = next
      setInner(next)
      onValueChange?.(next)
      setNudge(direction * 4)
      setTimeout(() => setNudge(0), 120)
      return true
    },
    [min, max, step, onValueChange]
  )

  const stop = () => clearTimeout(timer.current)
  const hold = (direction: 1 | -1) => {
    stop()
    if (!change(direction)) return
    let delay = 380
    const repeat = () => {
      if (!change(direction)) return
      delay = Math.max(45, delay * 0.8)
      timer.current = setTimeout(repeat, delay)
    }
    timer.current = setTimeout(repeat, delay)
  }
  React.useEffect(() => stop, [])

  const button =
    "grid size-10 shrink-0 cursor-pointer place-items-center rounded-full transition-[background-color,transform,opacity] duration-200 outline-none hover:bg-(--glass-highlight) focus-visible:ring-[3px] focus-visible:ring-ring/40 active:scale-85 disabled:cursor-not-allowed disabled:opacity-30 [&_svg]:size-[18px]"

  return (
    <LiquidGlass
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={Number.isFinite(min) ? min : undefined}
      aria-valuemax={Number.isFinite(max) ? max : undefined}
      data-slot="glass-stepper"
      onKeyDown={(e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowRight") change(1)
        else if (e.key === "ArrowDown" || e.key === "ArrowLeft") change(-1)
        else return
        e.preventDefault()
      }}
      className={cn(
        "inline-flex h-12 items-center gap-1 rounded-full px-1 text-(--glass-foreground) transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
        shake && "animate-[opaline-shake_0.36s_ease-in-out]",
        className
      )}
      style={{ translate: `${nudge}px 0` }}
      {...props}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Decrease"
        disabled={value <= min}
        onPointerDown={() => hold(-1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        className={button}
      >
        <HugeiconsIcon icon={MinusIcon} strokeWidth={2.5} />
      </button>
      <RollingNumber
        value={value}
        format={format}
        className="min-w-12 justify-center px-1 text-[17px] font-semibold tracking-[-0.02em]"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Increase"
        disabled={value >= max}
        onPointerDown={() => hold(1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        className={button}
      >
        <HugeiconsIcon icon={PlusIcon} strokeWidth={2.5} />
      </button>
    </LiquidGlass>
  )
}

export { GlassStepper }
