import * as React from "react"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

/** Four-column grid of glass modules, in the style of macOS Control Center. */
function GlassControlCenter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-control-center"
      className={cn(
        "grid w-[320px] grid-cols-4 gap-2.5 text-(--glass-foreground) select-none",
        className
      )}
      {...props}
    />
  )
}

/** A glass module. Span columns/rows to build the layout. */
function GlassControlTile({
  className,
  cols = 2,
  rows = 1,
  style,
  ...props
}: React.ComponentProps<typeof LiquidGlass> & { cols?: 1 | 2 | 3 | 4; rows?: 1 | 2 }) {
  return (
    <LiquidGlass
      data-slot="glass-control-tile"
      bezel={14}
      className={cn(
        "flex min-h-[68px] flex-col justify-center gap-2 rounded-[24px] p-3 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] has-[button:active]:scale-[0.98]",
        cols === 1 && "aspect-square min-h-0 items-center justify-center p-0",
        className
      )}
      style={{ gridColumn: `span ${cols}`, gridRow: `span ${rows}`, ...style }}
      {...props}
    />
  )
}

function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (v: T) => void) {
  const [inner, setInner] = React.useState(defaultValue)
  const current = value ?? inner
  const set = React.useCallback(
    (next: T) => {
      setInner(next)
      onChange?.(next)
    },
    [onChange]
  )
  return [current, set] as const
}

/** Round toggle with a label — Wi-Fi, Bluetooth, Focus… */
function GlassControlToggle({
  icon,
  label,
  status,
  pressed: pressedProp,
  defaultPressed = false,
  onPressedChange,
  color = "#0a84ff",
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "children"> & {
  icon: React.ReactNode
  label?: string
  /** Secondary line; defaults to On / Off. */
  status?: React.ReactNode
  pressed?: boolean
  defaultPressed?: boolean
  onPressedChange?: (pressed: boolean) => void
  /** Fill colour when on. */
  color?: string
}) {
  const [pressed, setPressed] = useControllable(pressedProp, defaultPressed, onPressedChange)
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      data-slot="glass-control-toggle"
      onClick={() => setPressed(!pressed)}
      className={cn(
        "group/toggle flex w-full cursor-pointer items-center gap-2.5 rounded-full text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full bg-current/12 transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-active/toggle:scale-90 [&_svg]:size-[18px]",
          // Active state follows macOS: colour fill with a white glyph in
          // light mode, inverted to a white fill with a colour glyph in dark.
          pressed && "bg-(--tgl) text-white dark:bg-white dark:text-(--tgl)"
        )}
        style={pressed ? ({ "--tgl": color } as React.CSSProperties) : undefined}
      >
        {icon}
      </span>
      {label ? (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[13px] font-semibold tracking-[-0.01em]">{label}</span>
          <span className="block truncate text-[11px] opacity-60">
            {status ?? (pressed ? "On" : "Off")}
          </span>
        </span>
      ) : null}
    </button>
  )
}

/** Square icon button for a single-cell tile — Screen Mirroring, Timer… */
function GlassControlButton({
  className,
  active,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      data-slot="glass-control-button"
      data-active={active ? "" : undefined}
      className={cn(
        "grid size-full cursor-pointer place-items-center rounded-[inherit] outline-none transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-90 data-[active]:bg-white data-[active]:text-black [&_svg]:size-[22px]",
        className
      )}
      {...props}
    />
  )
}

/** Capsule slider that fills with light — Display, Sound… */
function GlassControlSlider({
  label,
  icon,
  endIcon,
  value: valueProp,
  defaultValue = 50,
  onValueChange,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "defaultValue" | "onChange"> & {
  label: string
  icon?: React.ReactNode
  endIcon?: React.ReactNode
  /** 0 – 100 */
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
}) {
  const [value, setValue] = useControllable(valueProp, defaultValue, onValueChange)
  const [dragging, setDragging] = React.useState(false)
  const track = React.useRef<HTMLDivElement>(null)

  const fromPointer = (clientX: number) => {
    const r = track.current!.getBoundingClientRect()
    setValue(Math.round(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100))))
  }

  return (
    <div data-slot="glass-control-slider" className={cn("flex flex-col gap-2", className)} {...props}>
      <span className="px-1 text-[13px] font-semibold tracking-[-0.01em]">{label}</span>
      <div className="flex items-center gap-2 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:opacity-60">
        <div
          ref={track}
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            setDragging(true)
            fromPointer(e.clientX)
          }}
          onPointerMove={(e) => dragging && fromPointer(e.clientX)}
          onPointerUp={() => setDragging(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowUp") setValue(Math.min(100, value + 5))
            else if (e.key === "ArrowLeft" || e.key === "ArrowDown") setValue(Math.max(0, value - 5))
            else return
            e.preventDefault()
          }}
          className={cn(
            "relative h-7 flex-1 cursor-pointer touch-none overflow-hidden rounded-full bg-current/12 outline-none transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus-visible:ring-[3px] focus-visible:ring-ring/50",
            dragging && "scale-y-[1.12]"
          )}
        >
          <div
            className={cn(
              "absolute inset-y-0 left-0 flex min-w-7 items-center justify-end rounded-full bg-white shadow-[0_0_14px_oklch(1_0_0/0.45)] transition-[width] ease-out",
              dragging ? "duration-0" : "duration-200"
            )}
            style={{ width: `${value}%` }}
          >
            <span className="mr-1 size-5 rounded-full bg-white shadow-[0_1px_4px_rgb(0_0_0/0.25)]" />
          </div>
          {icon ? (
            <span className="pointer-events-none absolute inset-y-0 left-2 grid place-items-center text-black/55 mix-blend-multiply [&_svg]:size-4">
              {icon}
            </span>
          ) : null}
        </div>
        {endIcon}
      </div>
    </div>
  )
}

export {
  GlassControlCenter,
  GlassControlTile,
  GlassControlToggle,
  GlassControlButton,
  GlassControlSlider,
}
