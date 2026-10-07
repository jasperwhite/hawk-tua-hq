"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

type GlassTextareaProps = React.ComponentProps<"textarea"> & {
  /** Classes for the glass container (the textarea itself is transparent). */
  containerClassName?: string
  /** Rows shown when empty. */
  minRows?: number
  /** Grow with the content up to this many rows, then scroll. */
  maxRows?: number
  /** Show a character counter. Uses `maxLength` as the limit when set. */
  showCount?: boolean
  /** Content under the text, e.g. attachment chips or a send button. */
  footer?: React.ReactNode
  /** Called on ⌘/Ctrl + Enter. */
  onSubmitShortcut?: (value: string) => void
}

/**
 * A multi-line field on glass that grows with its content. The glass resizes
 * with it, so the rim keeps refracting as you type.
 */
function GlassTextarea({
  className,
  containerClassName,
  minRows = 3,
  maxRows = 8,
  showCount = false,
  footer,
  onSubmitShortcut,
  maxLength,
  value,
  defaultValue,
  onChange,
  onKeyDown,
  ref,
  ...props
}: GlassTextareaProps) {
  const inner = React.useRef<HTMLTextAreaElement>(null)
  React.useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement)
  const [length, setLength] = React.useState(() => String(value ?? defaultValue ?? "").length)

  // Size to the content between minRows and maxRows.
  const resize = React.useCallback(() => {
    const el = inner.current
    if (!el) return
    const style = getComputedStyle(el)
    const line = parseFloat(style.lineHeight) || 22
    const pad = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
    el.style.height = "auto"
    const next = Math.min(Math.max(el.scrollHeight, line * minRows + pad), line * maxRows + pad)
    el.style.height = `${next}px`
    el.style.overflowY = el.scrollHeight > next + 1 ? "auto" : "hidden"
  }, [minRows, maxRows])

  React.useLayoutEffect(() => {
    resize()
    setLength(inner.current?.value.length ?? 0)
  }, [resize, value])

  const near = maxLength ? length / maxLength : 0

  return (
    <LiquidGlass
      data-slot="glass-textarea"
      className={cn(
        "flex w-full flex-col rounded-[22px] text-(--glass-foreground) transition-[box-shadow] duration-200 has-[textarea:focus-visible]:ring-[3px] has-[textarea:focus-visible]:ring-ring/35 has-[textarea:disabled]:opacity-60",
        containerClassName
      )}
    >
      <textarea
        ref={inner}
        rows={minRows}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => {
          setLength(e.target.value.length)
          resize()
          onChange?.(e)
        }}
        onKeyDown={(e) => {
          if (onSubmitShortcut && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            onSubmitShortcut(e.currentTarget.value)
          }
          onKeyDown?.(e)
        }}
        className={cn(
          "block w-full resize-none bg-transparent px-4 pt-3 pb-2 text-[15px] leading-[22px] tracking-[-0.01em] outline-none placeholder:text-current placeholder:opacity-50 disabled:cursor-not-allowed",
          !footer && !showCount && "pb-3",
          className
        )}
        {...props}
      />
      {footer || showCount ? (
        <div className="flex min-h-10 items-center gap-2 px-2.5 pb-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">{footer}</div>
          {showCount ? (
            <span
              aria-live="polite"
              className={cn(
                "shrink-0 pr-1.5 font-mono text-[11.5px] tabular-nums opacity-55 transition-colors",
                near >= 0.9 && "text-[oklch(0.68_0.16_65)] opacity-100",
                near >= 1 && "text-[oklch(0.6_0.22_27)]"
              )}
            >
              {maxLength ? `${length} / ${maxLength}` : length}
            </span>
          ) : null}
        </div>
      ) : null}
    </LiquidGlass>
  )
}

export { GlassTextarea, type GlassTextareaProps }
