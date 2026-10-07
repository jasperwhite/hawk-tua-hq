/* Small building blocks shared by every tab. Glass is kept for surfaces and controls;
   anything that repeats per row (chips, bars) is plain CSS so a 40-row table stays fast. */
import * as React from 'react'
import { createContext, useContext } from 'react'

import { cn } from '@/lib/utils'
import { f1, type Any, type HQView, type Tab } from '@/lib/hq'
import { GlassCard } from '@/components/ui/opaline/glass-card'
import { GlassSegmented, GlassSegmentedItem } from '@/components/ui/opaline/glass-segmented'

/* ---------- context ---------- */

export const ViewContext = createContext<(HQView & { go: (t: Tab) => void }) | null>(null)
export function useView() {
  const v = useContext(ViewContext)
  if (!v) throw new Error('useView outside provider')
  return v
}

/* ---------- text ---------- */

export const Num = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn('num', className)}>{children}</span>
)

export function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('kicker', className)}>{children}</span>
}

export function Lede({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('max-w-[68ch] text-[15px] leading-relaxed opacity-80', className)}>{children}</p>
}

/* ---------- chips ---------- */

type Tone = 'plain' | 'bad' | 'warn' | 'good' | 'accent' | 'muted'
const toneClass: Record<Tone, string> = {
  plain: 'border-current/20 opacity-70',
  bad: 'border-[var(--bad)]/40 text-[var(--bad)] bg-[var(--bad)]/8',
  warn: 'border-[var(--warn)]/50 text-[var(--warn)] bg-[var(--warn)]/10',
  good: 'border-[var(--good)]/40 text-[var(--good)] bg-[var(--good)]/10',
  accent: 'border-[var(--accent-fill)]/50 text-[var(--num)] bg-[var(--accent-fill)]/12',
  muted: 'border-current/15 opacity-55 line-through',
}
export function Chip({ children, tone = 'plain', title }: { children: React.ReactNode; tone?: Tone; title?: string }) {
  return (
    <span title={title} className={cn('inline-flex h-[18px] items-center rounded-full border px-1.5 text-[10px] font-semibold tracking-[0.06em] uppercase', toneClass[tone])}>
      {children}
    </span>
  )
}

export function StatusChip({ p }: { p: Any }) {
  const { L } = useView()
  if (!p.team) return <Chip tone="bad">No team</Chip>
  if (!L.plays(p.team, L.week)) return <Chip tone="bad">Bye</Chip>
  if (!p.inj) return null
  const m: Record<string, [string, Tone]> = {
    Questionable: ['Q', 'warn'], Doubtful: ['Doubtful', 'bad'], Out: ['Out', 'bad'], IR: ['IR', 'bad'],
    PUP: ['PUP', 'bad'], Sus: ['Suspended', 'bad'], NA: ['N/A', 'bad'],
  }
  const [label, tone] = m[p.inj] || [p.inj, 'warn']
  return <Chip tone={tone} title={p.injBody ? `${p.inj} · ${p.injBody}` : p.inj}>{label}</Chip>
}

/* ---------- player ---------- */

export function PlayerCell({ p, extra }: { p: Any; extra?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate font-semibold tracking-[-0.01em]">{p.name}</span>
      <span className="flex flex-wrap items-center gap-1.5 text-[12px] opacity-60">
        <span>{p.pos} · {p.team || 'FA'}</span>
        <StatusChip p={p} />
        {extra}
      </span>
    </div>
  )
}

export function Form({ p }: { p: Any }) {
  const { L } = useView()
  const ws: number[] = L.pastWeeks.slice(-3)
  if (!ws.length) return null
  return (
    <span className="text-[12px] whitespace-nowrap opacity-60 tnum">
      {ws.map(w => (p.form && p.form[w] != null ? f1(p.form[w]) : '–')).join(' · ')}
    </span>
  )
}

/* ---------- surfaces ---------- */

export function Panel({
  title, kicker, aside, children, className, tint, id,
}: {
  title?: React.ReactNode; kicker?: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode
  className?: string; tint?: string; id?: string
}) {
  return (
    <GlassCard id={id} blur={6} tint={tint} className={cn('gap-4 rounded-[26px] py-5 sm:py-6', className)}>
      {(title || kicker || aside) && (
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 px-5 sm:px-6">
          <div className="flex min-w-0 flex-col gap-1">
            {kicker && <Kicker>{kicker}</Kicker>}
            {title && <h2 className="text-[22px] leading-tight font-semibold tracking-[-0.025em] text-balance">{title}</h2>}
          </div>
          {aside && <div className="text-[13px] opacity-75">{aside}</div>}
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-4 px-5 sm:px-6">{children}</div>
    </GlassCard>
  )
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6"><table className="hq-table">{children}</table></div>
}

export function Steps({ items }: { items: { what: React.ReactNode; why: React.ReactNode }[] }) {
  return (
    <ol className="flex flex-col gap-2.5">
      {items.map((s, i) => (
        <li key={i} className="grid grid-cols-[28px_1fr] items-start gap-3 rounded-2xl border border-[var(--hair)] bg-[var(--glass-highlight)] px-4 py-3">
          <span className="num pt-0.5 text-[20px] leading-none">{i + 1}</span>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[16px] font-semibold tracking-[-0.015em]">{s.what}</span>
            <span className="text-[14px] leading-snug opacity-75">{s.why}</span>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function Bars({ rows }: { rows: { label: React.ReactNode; value: number; max: number; right: React.ReactNode }[] }) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[52px_1fr_auto] items-center gap-3 text-[13px]">
          <span className="font-semibold tracking-[0.06em] opacity-70">{r.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-current/10">
            <span className="block h-full rounded-full bg-[var(--accent-fill)]" style={{ width: `${Math.max(0, Math.min(1, r.value / (r.max || 1))) * 100}%` }} />
          </span>
          <span className="min-w-14 text-right tnum">{r.right}</span>
        </div>
      ))}
    </div>
  )
}

/* Text segmented control, sized so seven options fit a phone. */
export function Filter<T extends string>({
  value, onChange, options, label,
}: { value: T; onChange: (v: T) => void; options: readonly (readonly [T, string])[]; label: string }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 py-1">
      <GlassSegmented value={value} onValueChange={v => onChange(v as T)} aria-label={label}>
        {options.map(([v, l]) => (
          <GlassSegmentedItem key={v} value={v} label={l} className="min-w-11 px-2.5 py-1.5 text-[12px]" />
        ))}
      </GlassSegmented>
    </div>
  )
}
