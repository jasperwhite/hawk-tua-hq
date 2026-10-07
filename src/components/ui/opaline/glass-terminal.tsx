"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

type Sequence = { index: number; active: number; started: boolean; advance: (index: number) => void }

const SequenceContext = React.createContext<Sequence | null>(null)

function useReducedMotion() {
  const [reduce, setReduce] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduce(mq.matches)
    const on = () => setReduce(mq.matches)
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return reduce
}

/**
 * A macOS-style terminal window on glass. Its lines play in order: each
 * `GlassTerminalTyping` types itself out and each `GlassTerminalLine` fades
 * in, starting when the terminal scrolls into view.
 */
function GlassTerminal({
  title = "zsh",
  sequence = true,
  replay,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof LiquidGlass>, "title"> & {
  /** Text in the title bar. */
  title?: React.ReactNode
  /** Play lines one after another. `false` shows everything at once. */
  sequence?: boolean
  /** Change this value to play the sequence again. */
  replay?: unknown
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [started, setStarted] = React.useState(false)
  const [active, setActive] = React.useState(0)
  const reduce = useReducedMotion()
  const animate = sequence && !reduce
  const advance = React.useCallback((index: number) => setActive((a) => Math.max(a, index + 1)), [])

  React.useEffect(() => {
    setActive(0)
    setStarted(false)
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true)
          io.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [replay])

  const lines = React.Children.toArray(children)

  return (
    <LiquidGlass
      ref={ref}
      data-slot="glass-terminal"
      variant="frosted"
      // A terminal reads as dark glass in both themes.
      tint="oklch(0.17 0.01 285 / 0.74)"
      className={cn(
        "flex w-full max-w-xl flex-col overflow-hidden rounded-[20px] text-[oklch(0.96_0_0)]",
        className
      )}
      {...props}
    >
      <div className="relative flex h-10 shrink-0 items-center border-b border-white/10 px-4">
        <div className="flex gap-2" aria-hidden>
          <span className="size-3 rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.2)]" />
          <span className="size-3 rounded-full bg-[#febc2e] shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.2)]" />
          <span className="size-3 rounded-full bg-[#28c840] shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.2)]" />
        </div>
        <span className="absolute inset-x-16 truncate text-center text-[12.5px] font-medium opacity-60">
          {title}
        </span>
      </div>
      <pre className="m-0 overflow-x-auto p-4 font-mono text-[13px] leading-[1.7] [scrollbar-width:none]">
        <code className="grid">
          {lines.map((line, index) => (
            <SequenceContext.Provider
              key={index}
              value={{
                index,
                active: animate ? active : Infinity,
                started: animate ? started : true,
                advance,
              }}
            >
              {line}
            </SequenceContext.Provider>
          ))}
        </code>
      </pre>
    </LiquidGlass>
  )
}

function useSequence() {
  const seq = React.useContext(SequenceContext)
  const advance = seq?.advance
  const index = seq?.index ?? 0
  const done = React.useCallback(() => advance?.(index), [advance, index])
  // Outside a terminal, or with sequencing off, render immediately.
  if (!seq) return { visible: true, running: false, animated: false, done }
  return {
    visible: seq.started && seq.active >= seq.index,
    running: seq.started && seq.active === seq.index,
    animated: Number.isFinite(seq.active),
    done,
  }
}

/** A line that appears after the previous one finishes, e.g. command output. */
function GlassTerminalLine({
  delay = 120,
  className,
  style,
  ...props
}: React.ComponentProps<"span"> & {
  /** Pause in ms before the next line starts. */
  delay?: number
}) {
  const { visible, running, done } = useSequence()
  React.useEffect(() => {
    if (!running) return
    const t = setTimeout(done, delay)
    return () => clearTimeout(t)
  }, [running, delay, done])

  return (
    <span
      data-slot="glass-terminal-line"
      className={cn("block min-h-[1.7em] transition-[opacity,transform] duration-300 ease-out", className)}
      // Inline, so a caller's opacity class can't reveal a line early.
      style={visible ? style : { ...style, opacity: 0, transform: "translateY(4px)" }}
      {...props}
    />
  )
}

/** A command that types itself out, character by character. */
function GlassTerminalTyping({
  children,
  prompt = "$",
  speed = 38,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  children: string
  /** Prompt before the command. Pass `null` to hide it. */
  prompt?: React.ReactNode
  /** Milliseconds per character. */
  speed?: number
}) {
  const { visible, running, animated, done } = useSequence()
  const [count, setCount] = React.useState(0)

  // Start over when the terminal replays.
  React.useEffect(() => {
    if (!visible) setCount(0)
  }, [visible])

  React.useEffect(() => {
    if (!running) return
    if (count >= children.length) {
      const t = setTimeout(done, 260)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setCount((c) => c + 1), speed)
    return () => clearTimeout(t)
  }, [running, count, children.length, speed, done])

  // Fully typed when sequencing is off, or once this line is behind us.
  const shown = !animated || (visible && !running) ? children : children.slice(0, count)

  return (
    <span
      data-slot="glass-terminal-typing"
      aria-label={children}
      className={cn("block min-h-[1.7em]", !visible && "invisible", className)}
      {...props}
    >
      {prompt !== null ? <span className="mr-2 text-[oklch(0.7_0.17_150)] select-none">{prompt}</span> : null}
      <span aria-hidden>{shown}</span>
      {running ? (
        <span
          aria-hidden
          className="ml-px inline-block h-[1.1em] w-[0.55em] translate-y-[0.2em] bg-current motion-safe:animate-[opaline-caret_1s_steps(1)_infinite]"
        />
      ) : null}
    </span>
  )
}

export { GlassTerminal, GlassTerminalLine, GlassTerminalTyping }
