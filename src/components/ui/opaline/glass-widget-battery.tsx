"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { HeadphonesIcon, LaptopIcon, SmartphoneIcon, Tablet01Icon, Watch01Icon, ZapIcon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { GlassWidget, type WidgetSize } from "@/components/ui/opaline/glass-widget"

type Device = {
  name: string
  /** 0 – 100 */
  level: number
  charging?: boolean
  kind?: "phone" | "watch" | "headphones" | "tablet" | "laptop"
  icon?: React.ReactNode
}

const icons = {
  phone: <HugeiconsIcon icon={SmartphoneIcon} />,
  watch: <HugeiconsIcon icon={Watch01Icon} />,
  headphones: <HugeiconsIcon icon={HeadphonesIcon} />,
  tablet: <HugeiconsIcon icon={Tablet01Icon} />,
  laptop: <HugeiconsIcon icon={LaptopIcon} />,
}

const colorFor = (d: Device) =>
  d.level <= 20 && !d.charging ? "#ff453a" : "#30d158"

function Ring({ device, size = 58 }: { device: Device; size?: number }) {
  const [shown, setShown] = React.useState(0)
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setShown(device.level))
    return () => cancelAnimationFrame(id)
  }, [device.level])
  const stroke = size * 0.1
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.14} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colorFor(device)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <span className="[&_svg]:size-[22px] [&_svg]:opacity-85">{device.icon ?? icons[device.kind ?? "phone"]}</span>
      {device.charging ? (
        <span className="absolute -top-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-[#30d158] text-white shadow-sm motion-safe:animate-pulse [&_svg]:size-3 [&_svg]:fill-current">
          <HugeiconsIcon icon={ZapIcon} />
        </span>
      ) : null}
    </div>
  )
}

/** Batteries widget: device rings that fill on mount, red when low, bolt when charging. */
function GlassWidgetBattery({
  devices,
  size = "small",
  className,
  ...props
}: Omit<React.ComponentProps<typeof GlassWidget>, "children"> & {
  devices: Device[]
  size?: WidgetSize
}) {
  if (size === "large") {
    return (
      <GlassWidget size={size} className={cn("justify-center gap-3", className)} {...props}>
        {devices.slice(0, 5).map((d) => (
          <div key={d.name} className="flex items-center gap-3">
            <Ring device={d} size={46} />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between text-[14px] font-semibold">
                <span className="truncate">{d.name}</span>
                <span className="tabular-nums">{d.level}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-current/12">
                <div
                  className="h-full rounded-full transition-[width] duration-1000"
                  style={{ width: `${d.level}%`, background: colorFor(d) }}
                />
              </div>
            </div>
          </div>
        ))}
      </GlassWidget>
    )
  }

  const shown = devices.slice(0, size === "small" ? 4 : 4)
  return (
    <GlassWidget
      size={size}
      className={cn(
        size === "small" ? "grid grid-cols-2 place-items-center gap-2" : "flex-row items-center justify-around",
        className
      )}
      {...props}
    >
      {shown.map((d) => (
        <div key={d.name} className="flex flex-col items-center gap-1.5" aria-label={`${d.name} ${d.level}%`}>
          <Ring device={d} size={size === "small" ? 56 : 62} />
          {size === "medium" ? (
            <span className="text-[13px] font-semibold tabular-nums">{d.level}%</span>
          ) : null}
        </div>
      ))}
    </GlassWidget>
  )
}

export { GlassWidgetBattery, type Device }
