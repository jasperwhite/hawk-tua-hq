import * as React from "react"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

function partsFor(date: Date, timeZone?: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(date)
  const get = (t: string) => Number(f.find((p) => p.type === t)?.value ?? 0)
  return { h: get("hour"), m: get("minute"), s: get("second") + date.getMilliseconds() / 1000 }
}

/** Analog clock on a liquid glass face with a sweeping second hand. */
function GlassClock({
  size = 168,
  timeZone,
  label,
  seconds = true,
  className,
  ...props
}: React.ComponentProps<typeof LiquidGlass> & {
  size?: number
  /** IANA time zone, e.g. `Asia/Tokyo`. Defaults to the local zone. */
  timeZone?: string
  /** Caption under the centre, e.g. a city name. */
  label?: string
  seconds?: boolean
}) {
  const [time, setTime] = React.useState<{ h: number; m: number; s: number } | null>(null)

  React.useEffect(() => {
    let frame = 0
    const tick = () => {
      setTime(partsFor(new Date(), timeZone))
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frame)
  }, [timeZone])

  const ticks = React.useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute inset-0"
          style={{ transform: `rotate(${i * 6}deg)` }}
        >
          <span
            className={cn(
              "absolute top-[5%] left-1/2 -translate-x-1/2 rounded-full bg-current",
              i % 5 === 0 ? "h-[7%] w-[2px] opacity-80" : "h-[3%] w-px opacity-30"
            )}
          />
        </span>
      )),
    []
  )

  const { h, m, s } = time ?? { h: 10, m: 10, s: 30 }
  const hand = (deg: number) => ({ transform: `rotate(${deg}deg)` })

  return (
    <LiquidGlass
      data-slot="glass-clock"
      role="img"
      aria-label={time ? `${h}:${String(m).padStart(2, "0")}${label ? ` in ${label}` : ""}` : "Clock"}
      bezel={size * 0.14}
      className={cn("relative shrink-0 rounded-full text-(--glass-foreground)", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      {ticks}
      {label ? (
        <span className="absolute top-[62%] left-1/2 -translate-x-1/2 text-[11px] font-semibold tracking-wide uppercase opacity-55">
          {label}
        </span>
      ) : null}
      <span aria-hidden className="absolute inset-0" style={hand((h % 12) * 30 + m * 0.5)}>
        <span className="absolute top-[26%] left-1/2 h-[26%] w-[5px] -translate-x-1/2 rounded-full bg-current" />
      </span>
      <span aria-hidden className="absolute inset-0" style={hand(m * 6 + s * 0.1)}>
        <span className="absolute top-[12%] left-1/2 h-[40%] w-[4px] -translate-x-1/2 rounded-full bg-current" />
      </span>
      {seconds ? (
        <span aria-hidden className="absolute inset-0" style={hand(s * 6)}>
          <span className="absolute top-[8%] left-1/2 h-[54%] w-[1.5px] -translate-x-1/2 rounded-full bg-[#ff9f0a]" />
        </span>
      ) : null}
      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#ff9f0a] bg-(--glass-tint-frosted)"
      />
    </LiquidGlass>
  )
}

export { GlassClock }
