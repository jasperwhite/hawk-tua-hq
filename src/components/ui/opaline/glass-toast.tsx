"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  AlertCircleIcon,
  Cancel01Icon,
  CircleCheckIcon,
  InfoIcon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

type ToastVariant = "default" | "success" | "error" | "info" | "warning" | "loading"

type ToastOptions = {
  description?: React.ReactNode
  icon?: React.ReactNode
  variant?: ToastVariant
  /** Milliseconds before auto-dismiss. `Infinity` keeps it open. */
  duration?: number
  action?: { label: string; onClick: () => void }
}

type ToastData = ToastOptions & {
  id: number
  title: React.ReactNode
  leaving?: "up" | "left" | "right"
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

let toasts: ToastData[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function dismiss(id: number, direction: "up" | "left" | "right" = "up") {
  toasts = toasts.map((t) => (t.id === id ? { ...t, leaving: direction } : t))
  emit()
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  }, 260)
}

function update(id: number, patch: Partial<ToastData>) {
  toasts = toasts.map((t) => (t.id === id ? { ...t, ...patch } : t))
  emit()
}

/** Show a glass toast. Returns its id. */
function toast(title: React.ReactNode, options: ToastOptions = {}) {
  const id = nextId++
  toasts = [{ id, title, ...options }, ...toasts].slice(0, 12)
  emit()
  return id
}
const variant =
  (v: ToastVariant) =>
  (title: React.ReactNode, o: ToastOptions = {}) =>
    toast(title, { ...o, variant: v })
toast.success = variant("success")
toast.error = variant("error")
toast.info = variant("info")
toast.warning = variant("warning")
/** A spinner toast that stays until you update or dismiss it. */
toast.loading = (title: React.ReactNode, o: ToastOptions = {}) =>
  toast(title, { duration: Infinity, ...o, variant: "loading" })
toast.dismiss = (id?: number) => (id === undefined ? toasts.forEach((t) => dismiss(t.id)) : dismiss(id))
toast.update = (id: number, title: React.ReactNode, o: ToastOptions = {}) => update(id, { title, ...o })

type Message<T> = React.ReactNode | ((value: T) => React.ReactNode)

/** Shows `loading` while the promise runs, then `success` or `error`. */
toast.promise = <T,>(
  promise: Promise<T>,
  messages: { loading: React.ReactNode; success: Message<T>; error: Message<unknown> }
) => {
  const id = toast.loading(messages.loading)
  const resolve = <V,>(m: Message<V>, v: V) => (typeof m === "function" ? (m as (v: V) => React.ReactNode)(v) : m)
  promise.then(
    (value) => update(id, { title: resolve(messages.success, value), variant: "success", duration: 4000 }),
    (error) => update(id, { title: resolve(messages.error, error), variant: "error", duration: 5000 })
  )
  return promise
}

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

const icons: Record<ToastVariant, React.ReactNode> = {
  default: null,
  success: <HugeiconsIcon icon={CircleCheckIcon} className="text-[#34c759]" />,
  error: <HugeiconsIcon icon={AlertCircleIcon} className="text-[#ff3b30]" />,
  info: <HugeiconsIcon icon={InfoIcon} className="text-[#0a84ff]" />,
  warning: <HugeiconsIcon icon={Alert02Icon} className="text-[#ff9f0a]" />,
  loading: <Spinner />,
}

function ToastItem({
  data,
  paused,
  closeButton,
  fromTop,
  buriedHeight,
}: {
  data: ToastData
  paused: boolean
  closeButton: boolean
  fromTop: boolean
  /** In a collapsed deck, toasts behind the front one take its height. */
  buriedHeight?: number
}) {
  const { id, title, description, variant = "default", icon, action, leaving } = data
  const duration = data.duration ?? 4000
  const [drag, setDrag] = React.useState<{ start: number; dx: number } | null>(null)

  React.useEffect(() => {
    if (paused || leaving || drag || !Number.isFinite(duration)) return
    const timer = setTimeout(() => dismiss(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, paused, leaving, drag, variant])

  const glyph = icon ?? icons[variant]
  const dx = drag?.dx ?? 0
  const swiped = leaving === "left" || leaving === "right"

  return (
    <div
      // Swipe sideways to dismiss. Only transforms move the glass.
      className={cn(
        "touch-pan-y",
        !drag && "transition-transform duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)]"
      )}
      style={{
        transform: swiped ? `translateX(${leaving === "left" ? -130 : 130}%)` : `translateX(${dx}px)`,
      }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) return
        e.currentTarget.setPointerCapture(e.pointerId)
        setDrag({ start: e.clientX, dx: 0 })
      }}
      onPointerMove={(e) => drag && setDrag({ ...drag, dx: e.clientX - drag.start })}
      onPointerUp={() => {
        if (drag && Math.abs(drag.dx) > 80) dismiss(id, drag.dx < 0 ? "left" : "right")
        setDrag(null)
      }}
      onPointerCancel={() => setDrag(null)}
    >
      <LiquidGlass
        role={variant === "error" || variant === "warning" ? "alert" : "status"}
        variant="frosted"
        className={cn(
          "flex items-center gap-3 rounded-[24px] py-3 pr-3 pl-4 text-(--glass-foreground) select-none [&_svg]:size-5 [&_svg]:shrink-0",
          fromTop
            ? "[--glass-enter-y:-130%] [--glass-exit-y:-130%]"
            : "[--glass-enter-y:130%] [--glass-exit-y:130%]",
          "[--glass-enter-scale:0.8] [--glass-exit-scale:0.8]",
          leaving === "up"
            ? "animate-[opaline-glass-out_240ms_ease-in_forwards]"
            : "motion-safe:animate-[opaline-glass-in_520ms_cubic-bezier(0.34,1.3,0.64,1)]",
          // Fade the content (never the glass) of toasts buried in the deck.
          "[&>[data-toast-part]]:transition-opacity [&>[data-toast-part]]:duration-200",
          buriedHeight !== undefined && "overflow-hidden [&>[data-toast-part]]:opacity-0"
        )}
        style={buriedHeight !== undefined ? { height: buriedHeight } : undefined}
      >
        {glyph ? (
          <span data-toast-part className="flex shrink-0">
            {glyph}
          </span>
        ) : null}
        <div data-toast-part className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold tracking-[-0.015em]">{title}</div>
          {description ? <div className="text-[13px] leading-snug opacity-70">{description}</div> : null}
        </div>
        {action ? (
          <button
            data-toast-part
            type="button"
            onClick={() => {
              action.onClick()
              dismiss(id)
            }}
            className="shrink-0 cursor-pointer rounded-full bg-(--glass-highlight) px-3 py-1.5 text-[13px] font-semibold transition-transform active:scale-95"
          >
            {action.label}
          </button>
        ) : null}
        {closeButton ? (
          <button
            data-toast-part
            type="button"
            aria-label="Dismiss"
            onClick={() => dismiss(id)}
            className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-full opacity-60 transition-[opacity,background-color] hover:bg-(--glass-highlight) hover:opacity-100 [&_svg]:!size-4"
          >
            <HugeiconsIcon icon={Cancel01Icon} />
          </button>
        ) : null}
      </LiquidGlass>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Toaster                                                             */
/* ------------------------------------------------------------------ */

type ToastPosition =
  | "top"
  | "bottom"
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"

const GAP = 8
const PEEK = 11

/**
 * Mount once near the root of your app. Toasts stack into a deck that fans
 * out on hover; swipe one sideways to dismiss it.
 */
function GlassToaster({
  className,
  position = "top-center",
  stacked = true,
  closeButton = false,
  visibleToasts = 3,
}: {
  className?: string
  position?: ToastPosition
  /** Collapse toasts into a deck until hovered. `false` lists them all. */
  stacked?: boolean
  closeButton?: boolean
  /** Toasts visible in the collapsed deck. */
  visibleToasts?: number
}) {
  const list = React.useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => toasts,
    () => toasts
  )
  const [hovered, setHovered] = React.useState(false)
  const [heights, setHeights] = React.useState<Record<number, number>>({})
  const observer = React.useRef<ResizeObserver | null>(null)
  const nodes = React.useRef(new Map<Element, number>())

  React.useEffect(() => {
    observer.current = new ResizeObserver((entries) => {
      setHeights((h) => {
        const next = { ...h }
        for (const e of entries) {
          const id = nodes.current.get(e.target)
          if (id !== undefined) next[id] = (e.target as HTMLElement).offsetHeight
        }
        return next
      })
    })
    nodes.current.forEach((_, el) => observer.current?.observe(el))
    return () => observer.current?.disconnect()
  }, [])

  // Collapse again once every toast is gone.
  React.useEffect(() => {
    if (!list.length) setHovered(false)
  }, [list.length])

  const fromTop = position.startsWith("top")
  const align = position.endsWith("left") ? "left" : position.endsWith("right") ? "right" : "center"
  const expanded = !stacked || hovered
  const shown = list.filter((t) => t.leaving !== "up")
  const front = heights[shown[0]?.id] ?? 64

  // Leaving toasts keep their slot while they animate out; the rest close up.
  let offset = 0
  let i = 0
  const layout = new Map<number, { y: number; scale: number; hidden: boolean }>()
  for (const t of list) {
    const gone = t.leaving === "up"
    if (expanded) {
      layout.set(t.id, { y: offset, scale: 1, hidden: false })
      if (!gone) offset += (heights[t.id] ?? 64) + GAP
    } else {
      const depth = Math.min(i, visibleToasts - 1)
      layout.set(t.id, { y: depth * PEEK, scale: 1 - depth * 0.05, hidden: i >= visibleToasts })
    }
    if (!gone) i++
  }
  const height = expanded ? Math.max(0, offset - GAP) : front + Math.min(shown.length - 1, visibleToasts - 1) * PEEK

  return (
    <section
      aria-label="Notifications"
      data-slot="glass-toaster"
      className={cn(
        "fixed z-[100] w-[min(24rem,calc(100%-2rem))]",
        fromTop ? "top-4" : "bottom-4",
        align === "center" && "inset-x-0 mx-auto",
        align === "left" && "left-4",
        align === "right" && "right-4",
        className
      )}
      style={{ height: list.length ? height : 0 }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setHovered(false)}
    >
      <ol aria-live="polite" className="relative">
        {list.map((t, i) => {
          const pos = layout.get(t.id) ?? { y: 0, scale: 1, hidden: false }
          return (
            <li
              key={t.id}
              ref={(el) => {
                if (!el || nodes.current.has(el)) return
                nodes.current.set(el, t.id)
                observer.current?.observe(el)
              }}
              className={cn(
                "absolute inset-x-0 transition-transform duration-400 ease-[cubic-bezier(0.34,1.2,0.64,1)]",
                fromTop ? "top-0 origin-bottom" : "bottom-0 origin-top"
              )}
              style={{
                zIndex: 100 - i,
                transform: `translateY(${fromTop ? pos.y : -pos.y}px) scale(${pos.scale})`,
                // `visibility`, not `opacity`: an opacity on a glass ancestor
                // would cut off its backdrop.
                visibility: pos.hidden ? "hidden" : undefined,
              }}
            >
              <ToastItem
                data={t}
                paused={hovered}
                closeButton={closeButton}
                fromTop={fromTop}
                buriedHeight={!expanded && t.id !== shown[0]?.id && !t.leaving ? front : undefined}
              />
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export { GlassToaster, toast, type ToastOptions, type ToastPosition, type ToastVariant }
