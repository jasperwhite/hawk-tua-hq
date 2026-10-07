import * as React from "react"

import { cn } from "@/lib/utils"
import { GlassWidget, type WidgetSize } from "@/components/ui/opaline/glass-widget"

type Condition = "sunny" | "partly-cloudy" | "cloudy" | "rain" | "snow" | "night"

type Hour = { time: string; temperature: number; condition: Condition }

const tints: Record<Condition, string> = {
  sunny: "linear-gradient(160deg, oklch(0.72 0.14 235 / 0.72), oklch(0.62 0.16 250 / 0.6))",
  "partly-cloudy": "linear-gradient(160deg, oklch(0.7 0.1 240 / 0.7), oklch(0.6 0.09 255 / 0.6))",
  cloudy: "linear-gradient(160deg, oklch(0.66 0.03 250 / 0.72), oklch(0.52 0.03 255 / 0.62))",
  rain: "linear-gradient(160deg, oklch(0.5 0.05 250 / 0.75), oklch(0.38 0.05 260 / 0.68))",
  snow: "linear-gradient(160deg, oklch(0.78 0.03 240 / 0.7), oklch(0.66 0.05 250 / 0.62))",
  night: "linear-gradient(160deg, oklch(0.32 0.08 275 / 0.78), oklch(0.2 0.06 280 / 0.72))",
}

/** Animated condition glyphs: rays turn, clouds drift, drops fall. */
function WeatherIcon({ condition, className }: { condition: Condition; className?: string }) {
  const sun = (
    <g className="origin-[16px_16px] motion-safe:animate-[spin_14s_linear_infinite]">
      <circle cx="16" cy="16" r="6.5" fill="#ffd54a" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x="15"
          y="2.5"
          width="2"
          height="4.5"
          rx="1"
          fill="#ffd54a"
          transform={`rotate(${i * 45} 16 16)`}
        />
      ))}
    </g>
  )
  const cloud = (dx = 0, dy = 0, fill = "white") => (
    <path
      className="motion-safe:animate-[opaline-cloud_6s_ease-in-out_infinite_alternate]"
      transform={`translate(${dx} ${dy})`}
      d="M9 27h14.5a5.5 5.5 0 0 0 .6-10.97A7.5 7.5 0 0 0 9.8 18.1 4.5 4.5 0 0 0 9 27Z"
      fill={fill}
    />
  )
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 overflow-visible drop-shadow-[0_2px_6px_rgb(0_0_0/0.2)]", className)}>
      {condition === "sunny" && sun}
      {condition === "partly-cloudy" && (
        <>
          <g transform="translate(-5 -5) scale(0.85)">{sun}</g>
          {cloud(2, 1)}
        </>
      )}
      {condition === "cloudy" && (
        <>
          {cloud(-5, -5, "oklch(1 0 0 / 0.6)")}
          {cloud(1, 0)}
        </>
      )}
      {(condition === "rain" || condition === "snow") && (
        <>
          {cloud(0, -4)}
          {[9, 15, 21].map((x, i) => (
            <g
              key={x}
              className="motion-safe:animate-[opaline-fall_1.1s_linear_infinite]"
              style={{ animationDelay: `${i * 0.35}s` }}
            >
              {condition === "rain" ? (
                <rect x={x} y="24" width="1.8" height="5" rx="0.9" fill="#7cc4ff" />
              ) : (
                <circle cx={x + 1} cy="26" r="1.6" fill="white" />
              )}
            </g>
          ))}
        </>
      )}
      {condition === "night" && (
        <>
          <path
            className="motion-safe:animate-pulse"
            d="M21 5.5a11 11 0 1 0 5.5 16.8A9 9 0 0 1 21 5.5Z"
            fill="#fff4c2"
            style={{ filter: "drop-shadow(0 0 6px #fff4c2)" }}
          />
          <circle cx="8" cy="8" r="0.9" fill="white" />
          <circle cx="12" cy="4" r="0.6" fill="white" />
        </>
      )}
    </svg>
  )
}

const label: Record<Condition, string> = {
  sunny: "Sunny",
  "partly-cloudy": "Partly Cloudy",
  cloudy: "Cloudy",
  rain: "Rain",
  snow: "Snow",
  night: "Clear",
}

/** Weather widget with animated condition art and an hourly strip (medium/large). */
function GlassWidgetWeather({
  location,
  temperature,
  condition,
  high,
  low,
  hourly = [],
  size = "small",
  unit = "°",
  className,
  ...props
}: Omit<React.ComponentProps<typeof GlassWidget>, "children"> & {
  location: string
  temperature: number
  condition: Condition
  high: number
  low: number
  hourly?: Hour[]
  size?: WidgetSize
  unit?: string
}) {
  return (
    <GlassWidget
      size={size}
      tint={tints[condition]}
      className={cn("justify-between text-white", className)}
      aria-label={`${location}: ${temperature}${unit}, ${label[condition]}`}
      {...props}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold tracking-[-0.01em]">{location}</div>
          <div className="text-[44px] leading-none font-light tracking-[-0.04em]">
            {temperature}
            {unit}
          </div>
        </div>
        <WeatherIcon condition={condition} className={size === "small" ? "size-8" : "size-9"} />
      </div>

      {size === "small" ? (
        <div className="flex flex-col gap-0.5">
          <div className="text-[13px] font-semibold">{label[condition]}</div>
          <div className="text-[13px] opacity-80">
            H:{high}° L:{low}°
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-[13px] font-medium">
            <span>{label[condition]}</span>
            <span className="opacity-80">
              H:{high}° L:{low}°
            </span>
          </div>
          <div className="flex justify-between border-t border-white/20 pt-2">
            {hourly.slice(0, 6).map((h) => (
              <div key={h.time} className="flex flex-col items-center gap-1 text-[12px] font-medium">
                <span className="opacity-75">{h.time}</span>
                <WeatherIcon condition={h.condition} className="size-5" />
                <span>{h.temperature}°</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassWidget>
  )
}

export { GlassWidgetWeather, WeatherIcon, type Condition }
