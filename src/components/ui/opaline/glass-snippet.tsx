import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { useActiveIndicator } from "@/hooks/use-active-indicator"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

type SnippetCommand = { label: string; code: string }

/** Copies text and reports success for a moment. */
function useCopy(timeout = 1600) {
  const [copied, setCopied] = React.useState(false)
  React.useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), timeout)
    return () => clearTimeout(t)
  }, [copied, timeout])
  const copy = React.useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }, [])
  return { copied, copy }
}

/**
 * A one-line command on a glass capsule with a copy button. Pass `commands`
 * to switch between variants (npm / pnpm / bun…) with a gliding glass tab.
 */
function GlassSnippet({
  code,
  commands,
  defaultTab,
  prefix = "$",
  onCopy,
  className,
  ...props
}: Omit<React.ComponentProps<typeof LiquidGlass>, "children" | "onCopy" | "prefix"> & {
  /** The command, when there's only one. */
  code?: string
  /** Several labelled commands, shown as tabs. */
  commands?: SnippetCommand[]
  defaultTab?: string
  /** Prompt before the command. Pass `null` to hide it. */
  prefix?: React.ReactNode
  onCopy?: (code: string) => void
}) {
  const list = commands ?? (code !== undefined ? [{ label: "", code }] : [])
  const [tab, setTab] = React.useState(defaultTab ?? list[0]?.label ?? "")
  const current = list.find((c) => c.label === tab) ?? list[0]
  const { copied, copy } = useCopy()
  const tabs = React.useRef<HTMLDivElement>(null)
  const rect = useActiveIndicator(tabs, '[aria-selected="true"]')

  return (
    <LiquidGlass
      data-slot="glass-snippet"
      variant="frosted"
      bezel={12}
      className={cn(
        "flex w-full max-w-xl flex-col overflow-hidden rounded-[20px] text-(--glass-foreground)",
        className
      )}
      {...props}
    >
      {commands && commands.length > 1 ? (
        <div
          ref={tabs}
          role="tablist"
          aria-label="Command variants"
          className="relative flex gap-0.5 px-2 pt-2"
          onKeyDown={(e) => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
            const i = commands.findIndex((c) => c.label === current?.label)
            const next = commands[(i + (e.key === "ArrowRight" ? 1 : -1) + commands.length) % commands.length]
            setTab(next.label)
            requestAnimationFrame(() =>
              tabs.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus()
            )
          }}
        >
          {rect ? (
            <span
              aria-hidden
              className="absolute rounded-full bg-(--glass-highlight) shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.35)] transition-[left,width] duration-400 ease-[cubic-bezier(0.34,1.3,0.64,1)]"
              style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
            />
          ) : null}
          {commands.map((c) => {
            const active = c.label === current?.label
            return (
              <button
                key={c.label}
                type="button"
                role="tab"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(c.label)}
                className={cn(
                  "relative cursor-pointer rounded-full px-3 py-1 font-mono text-[12px] outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring/40",
                  active ? "opacity-100" : "opacity-55 hover:opacity-80"
                )}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      ) : null}
      <div className="flex h-12 items-center gap-2.5 pr-1.5 pl-4">
        {prefix !== null ? (
          <span aria-hidden className="shrink-0 font-mono text-[13px] opacity-45 select-none">
            {prefix}
          </span>
        ) : null}
        <code
          role={commands && commands.length > 1 ? "tabpanel" : undefined}
          className="min-w-0 flex-1 overflow-x-auto font-mono text-[13px] whitespace-nowrap [scrollbar-width:none]"
        >
          {current?.code}
        </code>
        <button
          type="button"
          aria-label={copied ? "Copied" : "Copy command"}
          onClick={() => {
            if (!current) return
            void copy(current.code)
            onCopy?.(current.code)
          }}
          className="relative grid size-9 shrink-0 cursor-pointer place-items-center rounded-full outline-none transition-[background-color,transform] hover:bg-(--glass-highlight) focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-90 [&_svg]:size-4"
        >
          <span
            className={cn(
              "absolute transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              copied ? "scale-50 opacity-0" : "scale-100 opacity-70"
            )}
          >
            <HugeiconsIcon icon={Copy01Icon} />
          </span>
          <span
            className={cn(
              "absolute text-[oklch(0.62_0.17_148)] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              copied ? "scale-100 opacity-100" : "scale-50 opacity-0"
            )}
          >
            <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.5} />
          </span>
        </button>
      </div>
    </LiquidGlass>
  )
}

export { GlassSnippet, type SnippetCommand }
