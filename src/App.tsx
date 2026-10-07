import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  AmericanFootballIcon, ArrowDataTransferHorizontalIcon, News01Icon, RankingIcon, RefreshIcon,
  TaskDaily01Icon, UserAdd01Icon, UserGroupIcon,
} from '@hugeicons/core-free-icons'

import {
  DEFAULT_LEAGUE, DEFAULT_USER, HQ, TABS, VERSION, f1, makeView, ord, store, whenLong, type Any, type Tab,
} from '@/lib/hq'
import { cn } from '@/lib/utils'
import { Kicker, Lede, Num, ViewContext, useView } from '@/components/hq-ui'
import { GlassBadge } from '@/components/ui/opaline/glass-badge'
import { GlassButton } from '@/components/ui/opaline/glass-button'
import { GlassCard } from '@/components/ui/opaline/glass-card'
import { GlassInput } from '@/components/ui/opaline/glass-input'
import {
  GlassSelect, GlassSelectContent, GlassSelectItem, GlassSelectTrigger, GlassSelectValue,
} from '@/components/ui/opaline/glass-select'
import { GlassTabBar, GlassTabBarItem } from '@/components/ui/opaline/glass-tab-bar'
import { GlassText } from '@/components/ui/opaline/glass-text'
import { GlassToaster, toast } from '@/components/ui/opaline/glass-toast'
import { LiquidGlassProvider } from '@/components/ui/opaline/liquid-glass'
import Brief from '@/views/Brief'
import Lineup from '@/views/Lineup'
import News from '@/views/News'
import Players from '@/views/Players'
import Team from '@/views/Team'
import Trades from '@/views/Trades'
import Waivers from '@/views/Waivers'

const ICON: Record<Tab, Any> = {
  brief: TaskDaily01Icon, lineup: AmericanFootballIcon, waivers: UserAdd01Icon, trades: ArrowDataTransferHorizontalIcon,
  players: RankingIcon, team: UserGroupIcon, news: News01Icon,
}
const VIEW: Record<Tab, () => ReactNode> = {
  brief: Brief, lineup: Lineup, waivers: Waivers, trades: Trades, players: Players, team: Team, news: News,
}
const STEPS = ['Reading your league', 'Pulling projections and stats', 'Scoring every player your way']

const isTab = (s: string): s is Tab => TABS.some(t => t[0] === s)
const hashTab = (): Tab => { const h = location.hash.slice(1); return isTab(h) ? h : 'brief' }

type Load = { state: 'loading'; step: number } | { state: 'error'; message: string } | { state: 'ready' }

export default function App() {
  const [leagueId, setLeagueId] = useState(() => store.get('league') || DEFAULT_LEAGUE)
  const [L, setL] = useState<Any>(null)
  const [load, setLoad] = useState<Load>({ state: 'loading', step: 0 })
  const [rid, setRid] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>(hashTab)
  const [nonce, setNonce] = useState(0)

  /* load (and reload) the league */
  useEffect(() => {
    let live = true
    setLoad({ state: 'loading', step: 0 })
    HQ.load(leagueId, (m: string) => { if (live) setLoad({ state: 'loading', step: Math.max(0, STEPS.indexOf(m)) }) })
      .then((data: Any) => {
        if (!live) return
        const saved = +(store.get('rid:' + data.leagueId) || 0)
        const me = data.teams.find((t: Any) => t.user && t.user.toLowerCase() === DEFAULT_USER)
        setL(data)
        setRid(r => (r && data.teamByRid[r] ? r : saved && data.teamByRid[saved] ? saved : (me || data.teams[0]).rid))
        setLoad({ state: 'ready' })
        if (nonce) toast.success('Up to date', { description: `Week ${data.week} calls refreshed.` })
      })
      .catch((e: Error) => { console.error(e); if (live) setLoad({ state: 'error', message: e.message }) })
    return () => { live = false }
    // nonce re-runs the load on refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, nonce])

  /* hash routing, so a tab can be bookmarked or shared */
  useEffect(() => {
    const on = () => setTab(hashTab())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = useCallback((t: Tab) => {
    setTab(t)
    try { history.replaceState(null, '', '#' + t) } catch { location.hash = t }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [])

  const view = useMemo(() => (L && rid != null ? { ...makeView(L, rid), go } : null), [L, rid, go])
  const t = view?.team()
  useEffect(() => { if (t) document.title = `${t.name} HQ` }, [t])

  const pickTeam = (r: number) => { setRid(r); store.set('rid:' + L.leagueId, String(r)) }
  const View = VIEW[tab]

  return (
    <>
      <div className="wallpaper" aria-hidden />
      <GlassToaster position="top-center" />
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5 px-4 pt-[max(20px,env(safe-area-inset-top))] pb-[calc(env(safe-area-inset-bottom,0px)+112px)] sm:px-6">
        {view && t ? (
          <ViewContext.Provider value={view}>
            <Masthead onTeam={pickTeam} onRefresh={() => setNonce(n => n + 1)} busy={load.state === 'loading'} />
            <main className="flex min-w-0 flex-col gap-5"><Section key={`${tab}:${rid}`}><View /></Section></main>
          </ViewContext.Provider>
        ) : load.state === 'error' ? (
          <Status title="Couldn't load the league.">
            <Lede>{load.message}. Check the league ID below, or your connection, then try again.</Lede>
            <GlassButton className="self-start" onClick={() => setNonce(n => n + 1)}>Try again</GlassButton>
          </Status>
        ) : (
          <Status title="Getting this week's calls ready.">
            <ol className="flex flex-col gap-2">
              {STEPS.map((s, i) => {
                const step = load.state === 'loading' ? load.step : 0
                return (
                  <li key={s} className={cn('flex items-center gap-2.5 text-[15px] transition-opacity', i > step && 'opacity-40')}>
                    <span className={cn('size-2 rounded-full', i < step ? 'bg-[var(--good)]' : i === step ? 'animate-pulse bg-[var(--accent-fill)]' : 'bg-current/30')} />
                    {s}
                  </li>
                )
              })}
            </ol>
          </Status>
        )}
        <Footer L={L} leagueId={leagueId} onLeague={id => { store.set('league', id); setL(null); setRid(null); setLeagueId(id) }} />
      </div>
      {view && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
          {/* Frosted so the labels stay readable over a dense table. */}
          <LiquidGlassProvider variant="frosted" blur={6}>
          <GlassTabBar value={tab} onValueChange={v => go(v as Tab)} aria-label="Sections" className="pointer-events-auto">
            {TABS.map(([k, label]) => (
              <GlassTabBarItem
                key={k} value={k} label={label}
                icon={<HugeiconsIcon icon={ICON[k]} strokeWidth={1.8} />}
                className="h-[52px] w-[46px] min-w-0 px-0 [&_svg]:size-[22px] sm:w-16 aria-[current=page]:text-[var(--num)] dark:aria-[current=page]:text-[var(--num)]"
              />
            ))}
          </GlassTabBar>
          </LiquidGlassProvider>
        </div>
      )}
    </>
  )
}

/* Errors in one tab shouldn't blank the whole app. */
class Section extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null }
  static getDerivedStateFromError(err: Error) { return { err } }
  componentDidCatch(err: Error) { console.error(err) }
  render() {
    return this.state.err
      ? <Status title="This section hit a snag."><Lede>{this.state.err.message}</Lede></Status>
      : this.props.children
  }
}

function Status({ title, children }: { title: string; children: ReactNode }) {
  return (
    <GlassCard blur={8} className="mt-[12vh] gap-4 rounded-[28px] px-6 py-7">
      <p className="text-[22px] font-semibold tracking-[-0.025em]">{title}</p>
      {children}
    </GlassCard>
  )
}

function Masthead({ onTeam, onRefresh, busy }: { onTeam: (r: number) => void; onRefresh: () => void; busy: boolean }) {
  const { L, rid, team } = useView()
  const t = team()
  const rec = `${t.wins}–${t.losses}${t.ties ? '–' + t.ties : ''}`
  return (
    <header className="flex flex-col gap-4 pt-2">
      <div className="flex items-center justify-between gap-3">
        <Kicker className="truncate"><span className="hidden sm:inline">{L.name} · </span>Week {L.week} of {L.lastWeek}</Kicker>
        <div className="flex shrink-0 items-center gap-2">
          <GlassSelect value={String(rid)} onValueChange={v => onTeam(+v)}>
            <GlassSelectTrigger aria-label="Whose team" className="h-9 max-w-[46vw] text-[13px] sm:max-w-none"><GlassSelectValue /></GlassSelectTrigger>
            <GlassSelectContent align="end">
              {L.teams.slice().sort((a: Any, b: Any) => a.name.localeCompare(b.name)).map((x: Any) => (
                <GlassSelectItem key={x.rid} value={String(x.rid)}>{x.name}</GlassSelectItem>
              ))}
            </GlassSelectContent>
          </GlassSelect>
          <GlassButton size="icon-sm" aria-label="Refresh" onClick={onRefresh} disabled={busy}>
            <HugeiconsIcon icon={RefreshIcon} className={cn(busy && 'animate-spin')} />
          </GlassButton>
        </div>
      </div>
      <h1 className="text-[44px] leading-[1.02] font-bold tracking-[-0.045em] text-balance sm:text-[64px]">
        <GlassText key={t.name} bevel={10} refraction={16} tint="var(--title-fill)">{t.name}</GlassText>
      </h1>
      <div className="flex flex-wrap gap-2">
        <GlassBadge><Num>{rec}</Num></GlassBadge>
        <GlassBadge><Num>{ord(t.rank)}</Num><span className="opacity-70">of {L.nTeams}</span></GlassBadge>
        <GlassBadge><Num>{f1(t.pf)}</Num><span className="opacity-70">pts for</span></GlassBadge>
        <GlassBadge>
          {L.waiver.type === 'faab'
            ? <><Num>${t.faabLeft}</Num><span className="opacity-70">FAAB left</span></>
            : <><Num>#{t.waiver || '–'}</Num><span className="opacity-70">on waivers</span></>}
        </GlassBadge>
      </div>
      <Ruler />
    </header>
  )
}

function Ruler() {
  const { L } = useView()
  const weeks = Array.from({ length: L.lastWeek }, (_, i) => i + 1)
  const stripes = 'repeating-linear-gradient(135deg, color-mix(in oklch, currentColor 22%, transparent) 0 2px, transparent 2px 5px)'
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${L.lastWeek}, minmax(0, 1fr))` }}>
        {weeks.map(w => (
          <div
            key={w} title={`Week ${w}`}
            className={cn(
              'relative flex h-7 items-center justify-center rounded-md text-[11px] tnum',
              w < L.week && 'bg-current/8 opacity-55',
              w === L.week && 'bg-[var(--accent-fill)] font-bold text-white',
              w > L.week && 'border border-current/15',
            )}
            style={w >= L.playoffStart && w !== L.week ? { backgroundImage: stripes } : undefined}
          >
            {w}
            {L.tradeDeadline === w && <span className="absolute inset-y-0 -right-[2.5px] w-[2px] rounded bg-[var(--bad)]" />}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold tracking-[0.1em] uppercase opacity-60">
        <span className="flex items-center gap-1.5"><i className="inline-block h-[3px] w-3.5 bg-[var(--accent-fill)]" />This week</span>
        <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5" style={{ backgroundImage: stripes }} />Playoffs from week {L.playoffStart}</span>
        {L.tradeDeadline ? <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-[2px] bg-[var(--bad)]" />Trade deadline after week {L.tradeDeadline}</span> : null}
      </div>
    </div>
  )
}

function Footer({ L, leagueId, onLeague }: { L: Any; leagueId: string; onLeague: (id: string) => void }) {
  const [val, setVal] = useState(leagueId)
  return (
    <footer className="mt-6 flex flex-col gap-3 text-[13px]">
      <p className="max-w-[68ch] leading-relaxed opacity-65">
        Live from Sleeper each time you open it. Projections and stats: Sleeper. Market values: FantasyCalc. Kickoffs and player news: ESPN and RotoWire. Free, no account, nothing stored but your choices on this device.
      </p>
      {L && <Kicker>Loaded {whenLong(L.loadedAt)} · v{VERSION}</Kicker>}
      <details className="group">
        <summary className="cursor-pointer opacity-70 select-none">Use a different league</summary>
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={e => { e.preventDefault(); const id = val.trim().replace(/\D/g, ''); if (id) onLeague(id) }}
        >
          <GlassInput aria-label="Sleeper league ID" placeholder="Sleeper league ID" inputMode="numeric" autoComplete="off" value={val} onChange={e => setVal(e.target.value)} className="min-w-0 flex-1 basis-56" />
          <GlassButton type="submit">Load</GlassButton>
        </form>
      </details>
    </footer>
  )
}

