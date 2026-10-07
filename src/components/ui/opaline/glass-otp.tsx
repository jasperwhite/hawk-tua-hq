"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useActiveIndicator } from "@/hooks/use-active-indicator"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

const patterns = {
  digits: { test: /[0-9]/, inputMode: "numeric" },
  alphanumeric: { test: /[a-zA-Z0-9]/, inputMode: "text" },
} as const

type GlassOTPProps = Omit<
  React.ComponentProps<"input">,
  "value" | "defaultValue" | "onChange" | "pattern" | "size"
> & {
  /** Number of characters. */
  length?: number
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Called once every cell is filled. */
  onComplete?: (value: string) => void
  /** Which characters are accepted. */
  pattern?: keyof typeof patterns
  /** Insert a separator after every `group` cells, e.g. 3 → `123 – 456`. */
  group?: number
  /** Show dots instead of the characters. */
  mask?: boolean
  /** `success` tints the cells green; `error` tints them red and shakes. */
  status?: "idle" | "success" | "error"
  /** Classes for the wrapper (the input itself is invisible). */
  containerClassName?: string
}

/**
 * One-time code input made of glass cells. A single real `<input>` sits on
 * top, so paste, SMS autofill (`autocomplete="one-time-code"`) and screen
 * readers just work, while a liquid lens glides to the cell being typed in.
 */
function GlassOTP({
  length = 6,
  value: valueProp,
  defaultValue = "",
  onValueChange,
  onComplete,
  pattern = "digits",
  group,
  mask = false,
  status = "idle",
  disabled,
  className,
  containerClassName,
  onFocus,
  onBlur,
  ...props
}: GlassOTPProps) {
  const [inner, setInner] = React.useState(defaultValue)
  const value = (valueProp ?? inner).slice(0, length)
  const [focused, setFocused] = React.useState(false)
  const input = React.useRef<HTMLInputElement>(null)
  const row = React.useRef<HTMLDivElement>(null)
  const rect = useActiveIndicator(row, '[data-state="active"]')

  // Shake every time the status flips to error.
  const [shake, setShake] = React.useState(false)
  React.useEffect(() => {
    if (status === "error") setShake(true)
  }, [status])

  const update = (raw: string) => {
    const next = [...raw]
      .filter((c) => patterns[pattern].test.test(c))
      .join("")
      .slice(0, length)
    const cased = pattern === "alphanumeric" ? next.toUpperCase() : next
    if (cased === value) return
    setInner(cased)
    onValueChange?.(cased)
    if (cased.length === length) onComplete?.(cased)
  }

  // The caret always sits at the end: cells fill left to right.
  const pinCaret = () => {
    const el = input.current
    if (el) el.setSelectionRange(el.value.length, el.value.length)
  }

  const active = focused && status !== "success" ? Math.min(value.length, length - 1) : -1
  const tint =
    status === "success"
      ? "oklch(0.72 0.19 148 / 0.32)"
      : status === "error"
        ? "oklch(0.64 0.22 27 / 0.3)"
        : undefined

  return (
    <div
      data-slot="glass-otp"
      data-status={status}
      className={cn("relative inline-flex w-fit", disabled && "opacity-50", containerClassName)}
    >
      <div
        ref={row}
        onAnimationEnd={(e) => e.target === e.currentTarget && setShake(false)}
        className={cn(
          "relative flex items-center gap-1.5 sm:gap-2",
          shake && "animate-[opaline-shake_0.4s_ease-in-out]"
        )}
      >
        {Array.from({ length }, (_, i) => {
          const char = value[i]
          const isActive = i === active
          return (
            <React.Fragment key={i}>
              {group && i > 0 && i % group === 0 ? (
                <span aria-hidden className="mx-0.5 h-0.5 w-3 rounded-full bg-current opacity-35" />
              ) : null}
              <LiquidGlass
                aria-hidden
                data-state={isActive ? "active" : "inactive"}
                bezel={12}
                tint={tint}
                className={cn(
                  "grid h-12 w-10 place-items-center rounded-[16px] text-[20px] font-semibold tracking-[-0.02em] text-(--glass-foreground) tabular-nums transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] @sm:h-14 @sm:w-12 @sm:rounded-[18px] @sm:text-[24px]",
                  status === "success" && "scale-[1.04]",
                  className
                )}
                style={status === "success" ? { transitionDelay: `${i * 40}ms` } : undefined}
              >
                {char ? (
                  <span
                    key={char + i}
                    className="[--glass-enter-scale:0.3] motion-safe:animate-[opaline-glass-in_320ms_cubic-bezier(0.34,1.56,0.64,1)]"
                  >
                    {mask ? "•" : char}
                  </span>
                ) : isActive ? (
                  <span className="h-6 w-0.5 rounded-full bg-current motion-safe:animate-[opaline-caret_1s_steps(1)_infinite] @sm:h-7" />
                ) : null}
              </LiquidGlass>
            </React.Fragment>
          )
        })}
        {rect && active >= 0 ? (
          <LiquidGlass
            aria-hidden
            shadow={false}
            bezel={14}
            tint="var(--glass-highlight)"
            className="pointer-events-none absolute rounded-[20px] transition-[left] duration-500 ease-[cubic-bezier(0.34,1.3,0.64,1)]"
            style={{
              left: rect.left - 3,
              top: rect.top - 3,
              width: rect.width + 6,
              height: rect.height + 6,
            }}
          />
        ) : null}
      </div>
      <input
        ref={input}
        data-slot="glass-otp-input"
        type="text"
        autoComplete="one-time-code"
        inputMode={patterns[pattern].inputMode}
        spellCheck={false}
        maxLength={length}
        value={value}
        disabled={disabled}
        aria-invalid={status === "error" || undefined}
        onChange={(e) => update(e.target.value)}
        onSelect={pinCaret}
        onFocus={(e) => {
          setFocused(true)
          pinCaret()
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        className="absolute inset-0 w-full cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent disabled:cursor-not-allowed"
        {...props}
      />
    </div>
  )
}

export { GlassOTP, type GlassOTPProps }
