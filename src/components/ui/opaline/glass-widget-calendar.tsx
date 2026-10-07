import * as React from "react"

import { cn } from "@/lib/utils"
import { GlassWidget, type WidgetSize } from "@/components/ui/opaline/glass-widget"

type CalendarEvent = { title: string; time: string; color?: string }

/** Calendar widget: today and what's next, plus a month glance on larger sizes. */
function GlassWidgetCalendar({
  date: dateProp,
  events = [],
  size = "small",
  locale = "en-US",
  className,
  ...props
}: Omit<React.ComponentProps<typeof GlassWidget>, "children"> & {
  /** Defaults to today. */
  date?: Date
  events?: CalendarEvent[]
  size?: WidgetSize
  /** Defaults to en-US so server and client format identically. */
  locale?: string
}) {
  const [now, setNow] = React.useState<Date | undefined>(dateProp)
  React.useEffect(() => {
    if (!dateProp) setNow(new Date())
  }, [dateProp])
  const date = now ?? new Date(2026, 0, 1)

  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date)
  const month = new Intl.DateTimeFormat(locale, { month: "long" }).format(date)
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const cells = Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1 - first.getDay()))
  const letters = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(2026, 1, i + 1))
  )

  const list = (count: number) =>
    events.length ? (
      <ul className="flex min-w-0 flex-col gap-1.5">
        {events.slice(0, count).map((e) => (
          <li key={e.title + e.time} className="flex min-w-0 gap-2">
            <span
              className="w-[3px] shrink-0 rounded-full"
              style={{ background: e.color ?? "oklch(0.62 0.19 255)" }}
            />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-semibold">{e.title}</span>
              <span className="block truncate text-[12px] opacity-60">{e.time}</span>
            </span>
          </li>
        ))}
      </ul>
    ) : (
      <div className="text-[13px] opacity-60">No more events today</div>
    )

  const monthGrid = (
    <div className="grid grid-cols-7 gap-y-0.5 text-center text-[10px] font-semibold tabular-nums">
      {letters.map((l, i) => (
        <span key={i} className="opacity-45">
          {l}
        </span>
      ))}
      {cells.slice(0, cells[35].getMonth() === date.getMonth() ? 42 : 35).map((d) => {
        const inMonth = d.getMonth() === date.getMonth()
        const today = d.toDateString() === date.toDateString()
        return (
          <span
            key={d.toISOString()}
            className={cn(
              "mx-auto grid size-[18px] place-items-center rounded-full",
              !inMonth && "opacity-0",
              today && "bg-[oklch(0.63_0.22_27)] text-white"
            )}
          >
            {d.getDate()}
          </span>
        )
      })}
    </div>
  )

  return (
    <GlassWidget size={size} className={cn("gap-3", size === "medium" && "flex-row", className)} {...props}>
      <div className={cn("flex min-w-0 flex-col gap-2", size === "medium" && "w-[45%]")}>
        <div>
          <div className="text-[12px] font-semibold tracking-wide text-[oklch(0.63_0.22_27)] uppercase">
            {weekday}
          </div>
          <div className="text-[40px] leading-[1.05] font-light tracking-[-0.04em]">{date.getDate()}</div>
        </div>
        {size === "small" ? list(2) : null}
        {size === "medium" ? list(2) : null}
      </div>
      {size === "medium" ? (
        <div className="flex flex-1 flex-col gap-1">
          <div className="text-[12px] font-semibold tracking-wide uppercase opacity-60">{month}</div>
          {monthGrid}
        </div>
      ) : null}
      {size === "large" ? (
        <>
          <div className="text-[12px] font-semibold tracking-wide uppercase opacity-60">{month}</div>
          {monthGrid}
          <div className="border-t border-current/10 pt-3">{list(3)}</div>
        </>
      ) : null}
    </GlassWidget>
  )
}

export { GlassWidgetCalendar, type CalendarEvent }
