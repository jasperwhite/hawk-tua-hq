"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar01Icon, ChevronLeftIcon, ChevronRightIcon } from "@hugeicons/core-free-icons"
import { Popover as PopoverPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { useActiveIndicator } from "@/hooks/use-active-indicator"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)
const sameDay = (a?: Date, b?: Date) => !!a && !!b && a.toDateString() === b.toDateString()
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

type CalendarProps = Omit<React.ComponentProps<typeof LiquidGlass>, "defaultValue" | "onChange"> & {
  value?: Date
  defaultValue?: Date
  onValueChange?: (date: Date) => void
  /** 0 = Sunday, 1 = Monday. */
  weekStartsOn?: 0 | 1
  min?: Date
  max?: Date
  locale?: string
}

/**
 * Month calendar on glass. The selected day is a liquid bubble that glides
 * between dates; the month title slides in the direction you navigate.
 * Arrow keys move by day/week, PageUp/PageDown by month.
 */
function GlassCalendar({
  value: valueProp,
  defaultValue,
  onValueChange,
  weekStartsOn = 0,
  min,
  max,
  locale = "en-US",
  className,
  ...props
}: CalendarProps) {
  const [inner, setInner] = React.useState<Date | undefined>(defaultValue)
  const value = valueProp ?? inner
  const [month, setMonth] = React.useState(() => addMonths(value ?? new Date(), 0))
  const [slide, setSlide] = React.useState<1 | -1>(1)
  const [today, setToday] = React.useState<Date>()
  React.useEffect(() => setToday(startOfDay(new Date())), [])

  const grid = React.useRef<HTMLDivElement>(null)
  const rect = useActiveIndicator(grid, '[aria-selected="true"]')

  const disabled = (d: Date) => (min && d < startOfDay(min)) || (max && d > startOfDay(max))
  const select = (d: Date) => {
    if (disabled(d)) return
    setInner(d)
    onValueChange?.(d)
    if (d.getMonth() !== month.getMonth() || d.getFullYear() !== month.getFullYear()) {
      setSlide(d > month ? 1 : -1)
      setMonth(addMonths(d, 0))
    }
    requestAnimationFrame(() =>
      grid.current?.querySelector<HTMLButtonElement>(`[data-day="${iso(d)}"]`)?.focus()
    )
  }
  const go = (n: 1 | -1) => {
    setSlide(n)
    setMonth((m) => addMonths(m, n))
  }

  const first = addDays(month, -((month.getDay() - weekStartsOn + 7) % 7))
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i))
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(addDays(first, i))
  )
  const title = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(month)
  const focusDay = value && sameDay(addMonths(value, 0), month) ? value : month

  return (
    <LiquidGlass
      data-slot="glass-calendar"
      variant="frosted"
      className={cn("w-[296px] rounded-[26px] p-3 text-(--glass-foreground)", className)}
      {...props}
    >
      <div className="flex items-center justify-between px-1 pb-2">
        <div className="overflow-hidden">
          <div
            key={title}
            aria-live="polite"
            className="text-[15px] font-semibold tracking-[-0.015em] motion-safe:animate-[opaline-slide-in_320ms_cubic-bezier(0.22,1,0.36,1)]"
            style={{ "--slide-from": `${slide * 24}px` } as React.CSSProperties}
          >
            {title}
          </div>
        </div>
        <div className="flex gap-0.5 [&_button]:grid [&_button]:size-8 [&_button]:cursor-pointer [&_button]:place-items-center [&_button]:rounded-full [&_button]:outline-none [&_button]:transition-[background-color,transform] [&_button]:hover:bg-(--glass-highlight) [&_button]:focus-visible:ring-[3px] [&_button]:focus-visible:ring-ring/40 [&_button]:active:scale-90 [&_svg]:size-[18px]">
          <button type="button" aria-label="Previous month" onClick={() => go(-1)}>
            <HugeiconsIcon icon={ChevronLeftIcon} />
          </button>
          <button type="button" aria-label="Next month" onClick={() => go(1)}>
            <HugeiconsIcon icon={ChevronRightIcon} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 pb-1 text-center text-[11px] font-semibold opacity-45">
        {weekdays.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div
        ref={grid}
        role="grid"
        aria-label={title}
        className="relative grid grid-cols-7 gap-y-0.5"
        onKeyDown={(e) => {
          const base = value ?? focusDay
          const moves: Record<string, Date> = {
            ArrowLeft: addDays(base, -1),
            ArrowRight: addDays(base, 1),
            ArrowUp: addDays(base, -7),
            ArrowDown: addDays(base, 7),
            PageUp: new Date(base.getFullYear(), base.getMonth() - 1, base.getDate()),
            PageDown: new Date(base.getFullYear(), base.getMonth() + 1, base.getDate()),
          }
          if (moves[e.key]) {
            e.preventDefault()
            select(moves[e.key])
          }
        }}
      >
        {rect ? (
          <LiquidGlass
            aria-hidden
            shadow={false}
            bezel={10}
            tint="oklch(0.62 0.19 255 / 0.85)"
            className="absolute rounded-full transition-[left,top] duration-500 ease-[cubic-bezier(0.34,1.3,0.64,1)]"
            style={{
              left: rect.left + (rect.width - 36) / 2,
              top: rect.top + (rect.height - 36) / 2,
              width: 36,
              height: 36,
            }}
          />
        ) : null}
        {days.map((d) => {
          const outside = d.getMonth() !== month.getMonth()
          const selected = sameDay(d, value) && !outside
          const isToday = sameDay(d, today)
          const off = disabled(d)
          return (
            <button
              key={iso(d)}
              type="button"
              role="gridcell"
              data-day={iso(d)}
              aria-selected={selected}
              aria-current={isToday ? "date" : undefined}
              aria-label={d.toDateString()}
              disabled={off}
              tabIndex={sameDay(d, focusDay) ? 0 : -1}
              onClick={() => select(d)}
              className={cn(
                "relative z-10 mx-auto grid size-9 cursor-pointer place-items-center rounded-full text-[14px] tabular-nums outline-none transition-[color,background-color,transform] duration-200 hover:bg-(--glass-highlight) focus-visible:ring-[3px] focus-visible:ring-ring/40 active:scale-90 disabled:cursor-not-allowed disabled:opacity-25",
                outside && "opacity-30",
                isToday && !selected && "font-bold text-[oklch(0.62_0.22_27)]",
                selected && "font-semibold text-white hover:bg-transparent"
              )}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </LiquidGlass>
  )
}

/** Capsule trigger that opens a glass calendar. */
function GlassDatePicker({
  value: valueProp,
  defaultValue,
  onValueChange,
  placeholder = "Pick a date",
  locale = "en-US",
  format = { weekday: "short", month: "short", day: "numeric", year: "numeric" },
  className,
  calendarProps,
}: {
  value?: Date
  defaultValue?: Date
  onValueChange?: (date: Date) => void
  placeholder?: string
  locale?: string
  format?: Intl.DateTimeFormatOptions
  className?: string
  calendarProps?: Omit<CalendarProps, "value" | "defaultValue" | "onValueChange">
}) {
  const [inner, setInner] = React.useState<Date | undefined>(defaultValue)
  const value = valueProp ?? inner
  const [open, setOpen] = React.useState(false)

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <LiquidGlass
        asChild
        className={cn(
          "inline-flex h-11 cursor-pointer items-center gap-2.5 rounded-full pr-5 pl-4 text-[15px] tracking-[-0.01em] text-(--glass-foreground) transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] outline-none active:scale-[0.97] focus-visible:ring-[3px] focus-visible:ring-ring/40 [&_svg]:size-[18px] [&_svg]:opacity-60",
          className
        )}
      >
        <PopoverPrimitive.Trigger data-slot="glass-date-picker">
          <HugeiconsIcon icon={Calendar01Icon} />
          <span className={cn(!value && "opacity-55")}>
            {value ? new Intl.DateTimeFormat(locale, format).format(value) : placeholder}
          </span>
        </PopoverPrimitive.Trigger>
      </LiquidGlass>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content asChild align="start" sideOffset={10}>
          <GlassCalendar
            {...calendarProps}
            locale={locale}
            value={value}
            onValueChange={(d) => {
              setInner(d)
              onValueChange?.(d)
              setOpen(false)
            }}
            className={cn(
              "z-50 origin-(--radix-popover-content-transform-origin) [--glass-enter-scale:0.6] [--glass-exit-scale:0.92] data-[state=open]:animate-[opaline-glass-in_360ms_cubic-bezier(0.34,1.35,0.64,1)] data-[state=closed]:animate-[opaline-glass-out_120ms_ease-in_forwards]",
              calendarProps?.className
            )}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export { GlassCalendar, GlassDatePicker }
