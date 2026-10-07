"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { useActiveIndicator } from "@/hooks/use-active-indicator"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

type CodeFile = {
  /** Shown in the header and used as the tab label. */
  name: string
  code: string
  /** Any language Shiki knows, e.g. `tsx`, `bash`, `python`. */
  language?: string
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/** Same structure as Shiki's output, used until the highlighter loads. */
function plain(code: string, highlight: number[]) {
  const lines = code
    .replace(/\n$/, "")
    .split("\n")
    .map((l, i) => `<span class="line${highlight.includes(i + 1) ? " highlighted" : ""}">${escape(l)}</span>`)
  return `<pre class="shiki"><code>${lines.join("\n")}</code></pre>`
}

async function highlightCode(code: string, lang: string, highlight: number[]) {
  const { codeToHtml } = await import("shiki")
  return codeToHtml(code.replace(/\n$/, ""), {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
    transformers: [
      {
        line(node, line) {
          if (highlight.includes(line)) this.addClassToHast(node, "highlighted")
        },
      },
    ],
  }).catch(() => plain(code, highlight))
}

function useHighlighted(code: string, lang: string, highlight: number[]) {
  const key = highlight.join(",")
  const [html, setHtml] = React.useState(() => plain(code, highlight))
  React.useEffect(() => {
    let live = true
    const lines = key ? key.split(",").map(Number) : []
    setHtml(plain(code, lines))
    highlightCode(code, lang, lines).then((h) => live && setHtml(h))
    return () => {
      live = false
    }
  }, [code, lang, key])
  return html
}

/**
 * Syntax-highlighted code in a glass window, with a copy button, optional
 * line numbers and highlighted lines. Pass `files` for tabs.
 */
function GlassCodeBlock({
  code,
  language = "tsx",
  filename,
  files,
  showLineNumbers = true,
  highlightLines = [],
  maxHeight = 420,
  className,
  ...props
}: Omit<React.ComponentProps<typeof LiquidGlass>, "children"> & {
  code?: string
  language?: string
  filename?: string
  /** Several files, shown as tabs. Overrides `code`. */
  files?: CodeFile[]
  showLineNumbers?: boolean
  /** 1-based line numbers to emphasise. */
  highlightLines?: number[]
  /** Scroll after this many pixels. */
  maxHeight?: number
}) {
  const list: CodeFile[] = files ?? [{ name: filename ?? "", code: code ?? "", language }]
  const [tab, setTab] = React.useState(0)
  const file = list[Math.min(tab, list.length - 1)]
  const html = useHighlighted(file.code, file.language ?? language, highlightLines)
  const [copied, setCopied] = React.useState(false)
  const tabs = React.useRef<HTMLDivElement>(null)
  const rect = useActiveIndicator(tabs, '[aria-selected="true"]')

  React.useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])

  const header = list.length > 1 || file.name

  return (
    <LiquidGlass
      data-slot="glass-code-block"
      variant="frosted"
      bezel={14}
      className={cn(
        "flex w-full min-w-0 flex-col overflow-hidden rounded-[20px] text-(--glass-foreground)",
        className
      )}
      {...props}
    >
      {header ? (
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-current/10 pr-1.5 pl-2">
          {list.length > 1 ? (
            <div ref={tabs} role="tablist" aria-label="Files" className="relative flex min-w-0 gap-0.5 overflow-x-auto [scrollbar-width:none]">
              {rect ? (
                <span
                  aria-hidden
                  className="absolute rounded-full bg-(--glass-highlight) transition-[left,width] duration-400 ease-[cubic-bezier(0.34,1.3,0.64,1)]"
                  style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
                />
              ) : null}
              {list.map((f, i) => (
                <button
                  key={f.name}
                  type="button"
                  role="tab"
                  aria-selected={i === tab}
                  onClick={() => setTab(i)}
                  className={cn(
                    "relative shrink-0 cursor-pointer rounded-full px-3 py-1 font-mono text-[12px] outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring/40",
                    i === tab ? "opacity-100" : "opacity-55 hover:opacity-80"
                  )}
                >
                  {f.name}
                </button>
              ))}
            </div>
          ) : (
            <span className="min-w-0 truncate pl-2 font-mono text-[12.5px] opacity-70">{file.name}</span>
          )}
          <span className="ml-auto shrink-0 rounded-full bg-(--glass-highlight) px-2 py-0.5 font-mono text-[10.5px] tracking-wide uppercase opacity-60">
            {file.language ?? language}
          </span>
          <CopyButton
            copied={copied}
            onCopy={() => navigator.clipboard.writeText(file.code).then(() => setCopied(true), () => {})}
          />
        </div>
      ) : null}
      <div className="relative min-h-0">
        {!header ? (
          <CopyButton
            className="absolute top-2 right-2 z-10"
            copied={copied}
            onCopy={() => navigator.clipboard.writeText(file.code).then(() => setCopied(true), () => {})}
          />
        ) : null}
        <div
          className={cn(
            "overflow-auto py-3.5 font-mono text-[12.5px] leading-[1.7]",
            // Shiki emits light and dark colours as variables on each token.
            "[&_pre]:!bg-transparent [&_code]:grid [&_code]:min-w-max [&_span]:text-(--shiki-light) dark:[&_span]:text-(--shiki-dark)",
            "[&_.line]:min-h-[1.7em] [&_.line]:px-4 [&_.line.highlighted]:bg-[oklch(0.62_0.19_255/0.12)] [&_.line.highlighted]:shadow-[inset_2px_0_0_oklch(0.62_0.19_255)]",
            showLineNumbers &&
              "[&_code]:[counter-reset:line] [&_.line]:[counter-increment:line] [&_.line]:before:mr-4 [&_.line]:before:inline-block [&_.line]:before:w-5 [&_.line]:before:text-right [&_.line]:before:opacity-35 [&_.line]:before:content-[counter(line)]"
          )}
          style={{ maxHeight }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </LiquidGlass>
  )
}

function CopyButton({
  copied,
  onCopy,
  className,
}: {
  copied: boolean
  onCopy: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : "Copy code"}
      onClick={onCopy}
      className={cn(
        "relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-full outline-none transition-[background-color,transform] hover:bg-(--glass-highlight) focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-90 [&_svg]:size-4",
        className
      )}
    >
      <span className={cn("absolute transition-[opacity,transform] duration-300", copied ? "scale-50 opacity-0" : "opacity-70")}>
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
  )
}

export { GlassCodeBlock, type CodeFile }
