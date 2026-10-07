import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon, VolumeHighIcon, VolumeLowIcon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

function format(seconds: number) {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

function Scrubber({
  value,
  onChange,
  label,
  className,
}: {
  value: number
  onChange: (value: number) => void
  label: string
  className?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const set = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    onChange(Math.min(1, Math.max(0, (clientX - r.left) / r.width)))
  }

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        set(e.clientX)
      }}
      onPointerMove={(e) => e.buttons === 1 && set(e.clientX)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onChange(Math.min(1, value + 0.05))
        if (e.key === "ArrowLeft") onChange(Math.max(0, value - 0.05))
      }}
      className={cn(
        "group/scrub relative flex h-4 cursor-pointer touch-none items-center outline-none",
        className
      )}
    >
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-current/15 transition-[height] duration-200 group-hover/scrub:h-2.5 group-active/scrub:h-2.5 group-focus-visible/scrub:ring-2 group-focus-visible/scrub:ring-ring">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-current opacity-80"
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  )
}

function GlassPlayer({
  className,
  title,
  artist,
  artwork,
  duration = 214,
  defaultPlaying = false,
  ...props
}: Omit<React.ComponentProps<typeof LiquidGlass>, "title"> & {
  title: string
  artist: string
  /** Image URL or any node (e.g. a gradient div). */
  artwork?: React.ReactNode
  /** Track length in seconds. */
  duration?: number
  defaultPlaying?: boolean
}) {
  const [playing, setPlaying] = React.useState(defaultPlaying)
  const [progress, setProgress] = React.useState(0.32)
  const [volume, setVolume] = React.useState(0.7)

  React.useEffect(() => {
    if (!playing) return
    const id = setInterval(
      () => setProgress((p) => (p >= 1 ? 0 : p + 0.25 / duration)),
      250
    )
    return () => clearInterval(id)
  }, [playing, duration])

  return (
    <LiquidGlass
      data-slot="glass-player"
      variant="frosted"
      className={cn(
        "flex w-full max-w-sm flex-col gap-4 rounded-[32px] p-5 text-(--glass-foreground)",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "size-16 shrink-0 overflow-hidden rounded-2xl shadow-[0_8px_20px_-6px_rgb(0_0_0/0.35)] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] [&>*]:size-full [&>img]:object-cover",
            !playing && "scale-90"
          )}
        >
          {typeof artwork === "string" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artwork} alt="" />
          ) : (
            (artwork ?? (
              <div className="bg-[conic-gradient(from_200deg,#ff6b9a,#ffb56b,#6bd2ff,#a36bff,#ff6b9a)]" />
            ))
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[17px] font-semibold tracking-[-0.02em]">
            {title}
          </div>
          <div className="truncate text-[15px] opacity-60">{artist}</div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Scrubber value={progress} onChange={setProgress} label="Seek" />
        <div className="flex justify-between text-[11px] font-medium tabular-nums opacity-55">
          <span>{format(progress * duration)}</span>
          <span>-{format((1 - progress) * duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 [&_button]:grid [&_button]:cursor-pointer [&_button]:place-items-center [&_button]:rounded-full [&_button]:transition-[transform,background-color] [&_button]:duration-200 [&_button]:outline-none [&_button]:active:scale-85 [&_button]:focus-visible:ring-[3px] [&_button]:focus-visible:ring-ring/40 [&_svg]:fill-current">
        <button
          type="button"
          aria-label="Previous"
          className="size-11 hover:bg-(--glass-highlight)"
          onClick={() => setProgress(0)}
        >
          <HugeiconsIcon icon={SkipBackIcon} className="size-6" />
        </button>
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          className="size-14 hover:bg-(--glass-highlight)"
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? (
            <HugeiconsIcon icon={PauseIcon} className="size-9" strokeWidth={0} />
          ) : (
            <HugeiconsIcon icon={PlayIcon} className="size-9" strokeWidth={0} />
          )}
        </button>
        <button
          type="button"
          aria-label="Next"
          className="size-11 hover:bg-(--glass-highlight)"
          onClick={() => setProgress(0)}
        >
          <HugeiconsIcon icon={SkipForwardIcon} className="size-6" />
        </button>
      </div>

      <div className="flex items-center gap-3 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:opacity-55">
        <HugeiconsIcon icon={VolumeLowIcon} />
        <Scrubber
          value={volume}
          onChange={setVolume}
          label="Volume"
          className="flex-1"
        />
        <HugeiconsIcon icon={VolumeHighIcon} />
      </div>
    </LiquidGlass>
  )
}

export { GlassPlayer }
