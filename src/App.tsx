import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AmericanFootballIcon, ArrowDataTransferHorizontalIcon, LaptopIcon, Moon01Icon, News01Icon, RankingIcon, RefreshIcon,
  Shield01Icon, SidebarLeft01Icon, SidebarRight01Icon, Sun01Icon, TaskDaily01Icon, UserAdd01Icon, UserGroupIcon,
} from '@hugeicons/core-free-icons'

import {
  DEFAULT_LEAGUE, DEFAULT_USER, HQ, TABS, VERSION, boardFor, f1, makeView, ord, store, whenLong, type Any, type Tab,
} from '@/lib/hq'
import { cn } from '@/lib/utils'
import { ViewContext } from '@/components/hq-ui'
import {
  Action, BottomBar, BottomBarButton, BottomBarItem, GroupLabel, IconButton, InfoPairs, InfoRail, Input, Legend, Note,
  Prose, RailNav, RailNavBrand, RailNavDivider, RailNavItem, RailNavList, Segmented, Select, SkipLink, Toolbar, useView,
} from '@/components/ds-ui'
import { applyTheme, readTheme, type Theme } from '@/lib/theme'
import Brief from '@/views/Brief'
import Defences from '@/views/Defences'
import Lineup from '@/views/Lineup'
import News from '@/views/News'
import Players from '@/views/Players'
import Team from '@/views/Team'
import Trades from '@/views/Trades'
import Waivers from '@/views/Waivers'

const ICON: Record<Tab, Any> = {
  brief: TaskDaily01Icon, lineup: AmericanFootballIcon, waivers: UserAdd01Icon, defence: Shield01Icon, trades: ArrowDataTransferHorizontalIcon,
  players: RankingIcon, team: UserGroupIcon, news: News01Icon,
}
const VIEW: Record<Tab, () => ReactNode> = {
  brief: Brief, lineup: Lineup, waivers: Waivers, defence: Defences, trades: Trades, players: Players, team: Team, news: News,
}
const STEPS = ['Reading your league', 'Pulling projections and stats', 'Scoring every player your way']

const THEMES: readonly (readonly [Theme, string])[] = [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]
const THEME_ICON: Record<Theme, Any> = { system: LaptopIcon, light: Sun01Icon, dark: Moon01Icon }
const SHORTCUTS = [
  ['[', 'Toggle left rail'], [']', 'Toggle right rail'], ['T', 'Cycle theme'], ['/', 'Search players'],
  ['?', 'Show shortcuts'], ['Esc', 'Close'],
] as const

/* The legacy views were laid out for a centred column on a wallpaper. Until each is migrated they
   keep that column inside the new shell. Delete this as the last one moves over. */
const LEGACY = 'mx-auto flex w-full max-w-[1080px] min-w-0 flex-col gap-5 p-4'

const isTab = (s: string): s is Tab => TABS.some(t => t[0] === s)
const hashTab = (): Tab => { const h = location.hash.slice(1); return isTab(h) ? h : 'brief' }
const tabName = (t: Tab) => TABS.find(x => x[0] === t)![1]

type Load = { state: 'loading'; step: number } | { state: 'error'; message: string } | { state: 'ready' }
type Sides = { l: boolean; r: boolean }

const RAILS_KEY = 'hq-rails'
const readRails = (): Sides => {
  try {
    const v = JSON.parse(localStorage.getItem(RAILS_KEY) || '')
    return { l: !!v.l, r: !!v.r }
  } catch { return { l: false, r: false } }
}

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches)
  useEffect(() => {
    const mq = matchMedia(query)
    const on = () => setMatches(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return matches
}

export default function App() {
  const [leagueId, setLeagueId] = useState(() => store.get('league') || DEFAULT_LEAGUE)
  const [L, setL] = useState<Any>(null)
  const [load, setLoad] = useState<Load>({ state: 'loading', step: 0 })
  const [rid, setRid] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>(hashTab)
  const [nonce, setNonce] = useState(0)
  const [rev, setRev] = useState(0)

  const docked = useMedia('(min-width: 992px)')
  const wide = useMedia('(min-width: 640px)')
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [collapsed, setCollapsed] = useState<Sides>(readRails)   // docked: the rail is closed
  const [overlay, setOverlay] = useState<Sides>({ l: false, r: false })   // undocked: the rail is open
  const [legend, setLegend] = useState(false)
  const [notice, setNotice] = useState('')

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
        if (nonce) setNotice(`Week ${data.week} calls refreshed.`)
        // defences switch to betting-line values once the lines are in (a few seconds on a first visit)
        boardFor(data).then((b: Any) => { if (!live) return; HQ.applyDefBoard(data, b); setRev(r => r + 1) }).catch(() => {})
      })
      .catch((e: Error) => { console.error(e); if (live) setLoad({ state: 'error', message: e.message }) })
    return () => { live = false }
    // nonce re-runs the load on refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, nonce])

  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(id)
  }, [notice])

  /* hash routing, so a tab can be bookmarked or shared */
  useEffect(() => {
    const on = () => setTab(hashTab())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = useCallback((t: Tab) => {
    setTab(t)
    try { history.replaceState(null, '', '#' + t) } catch { location.hash = t }
  }, [])
  /* <main> scrolls, not the window; a new section starts at its top, and an overlay rail gets out of the way */
  useEffect(() => {
    document.getElementById('main')?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    setOverlay({ l: false, r: false })
  }, [tab])

  // rev rebuilds every tab's numbers when the defence values change underneath L
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const view = useMemo(() => (L && rid != null ? { ...makeView(L, rid), go } : null), [L, rid, go, rev])
  const t = view?.team()
  useEffect(() => { if (t) document.title = `${t.name} HQ` }, [t])

  const pickTeam = (r: number) => { setRid(r); store.set('rid:' + L.leagueId, String(r)) }
  const chooseTheme = useCallback((next: Theme) => { applyTheme(next); setTheme(next) }, [])
  const newLeague = (id: string) => { store.set('league', id); setL(null); setRid(null); setLeagueId(id) }

  /* rails: docked they collapse in place; undocked the same controls open them as overlays */
  const toggleRail = useCallback((side: keyof Sides) => {
    if (docked) setCollapsed(c => ({ ...c, [side]: !c[side] }))
    else setOverlay(o => ({ l: false, r: false, [side]: !o[side] }))
  }, [docked])
  useEffect(() => { try { localStorage.setItem(RAILS_KEY, JSON.stringify(collapsed)) } catch { /* nothing to do */ } }, [collapsed])
  useEffect(() => { setOverlay({ l: false, r: false }) }, [docked])
  useEffect(() => {
    if (!overlay.l && !overlay.r) return
    const away = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.rail-nav, .info-rail, [data-rail-toggle]')) setOverlay({ l: false, r: false })
    }
    document.addEventListener('click', away)
    return () => document.removeEventListener('click', away)
  }, [overlay])

  /* shortcuts. Never while a text field has focus or a modifier is down (Shift stays free: ? needs it). */
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (legend) setLegend(false)
        else setOverlay({ l: false, r: false })
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement
      if (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return
      if (legend) { if (e.key === '?') setLegend(false); return }
      if (e.key === '[') toggleRail('l')
      else if (e.key === ']') toggleRail('r')
      else if (e.key === '?') setLegend(true)
      else if (e.key.toLowerCase() === 't') {
        const i = THEMES.findIndex(x => x[0] === readTheme())
        chooseTheme(THEMES[(i + 1) % THEMES.length][0])
      } else if (e.key === '/') {
        const box = document.getElementById('player-search')
        if (!box) return
        e.preventDefault()
        box.focus()
      }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [legend, toggleRail, chooseTheme])

  const View = VIEW[tab]
  const title = tabName(tab)
  const leftShown = docked ? !collapsed.l : overlay.l
  const rightShown = docked ? !collapsed.r : overlay.r
  const navTo = (k: Tab) => (e: { preventDefault: () => void }) => { e.preventDefault(); go(k) }

  return (
    <>
    <div inert={legend}>
      <SkipLink />
      {view && t ? (
        <ViewContext.Provider value={view}>
          <div className="shell">
            <RailNav
              id="rail-left" label="Main" className={cn(!docked && 'z-4')} collapsed={docked && collapsed.l} open={!docked && overlay.l}
              brand={<RailNavBrand href="#brief" onClick={navTo('brief')}>Hawk Tua HQ</RailNavBrand>}
              foot={<Segmented value={theme} onChange={chooseTheme} options={THEMES} label="Theme" icons={THEME_ICON} />}
            >
              <RailNavList>
                {TABS.map(([k, label]) => (
                  <RailNavItem key={k} href={`#${k}`} icon={ICON[k]} current={k === tab} onClick={navTo(k)}>{label}</RailNavItem>
                ))}
              </RailNavList>
              <RailNavDivider />
              <div className="flex items-center gap-(--space-8) px-(--space-4)">
                <Select aria-label="Whose team" className="min-w-0 flex-1" value={String(view.rid)} onChange={e => pickTeam(+e.target.value)}>
                  {view.L.teams.slice().sort((a: Any, b: Any) => a.name.localeCompare(b.name)).map((x: Any) => (
                    <option key={x.rid} value={String(x.rid)}>{x.name}</option>
                  ))}
                </Select>
                <IconButton icon={RefreshIcon} label="Refresh" spin={load.state === 'loading'} disabled={load.state === 'loading'} onClick={() => setNonce(n => n + 1)} />
              </div>
              <p role="status" className="rows__group-label">{notice}</p>
            </RailNav>

            <div className="shell__centre">
              {wide && (
                <Toolbar
                  title={title}
                  start={<IconButton icon={SidebarLeft01Icon} label="Toggle main navigation" data-rail-toggle aria-controls="rail-left" aria-expanded={leftShown} onClick={() => toggleRail('l')} />}
                  end={<IconButton icon={SidebarRight01Icon} label="Toggle information panel" data-rail-toggle aria-controls="rail-right" aria-expanded={rightShown} onClick={() => toggleRail('r')} />}
                />
              )}
              <main id="main" className="shell__main" tabIndex={-1} aria-label={title}>
                {!wide && <h1 className="sr-only">{title}</h1>}
                <Section key={`${tab}:${rid}`}>
                  {tab === 'players' ? <View /> : <div className={LEGACY}><View /></div>}
                </Section>
                {/* clear of the fixed bottom bar */}
                <div aria-hidden className="max-[991.98px]:h-(--layout-bottombar-height)" />
              </main>
            </div>

            <RightRail id="rail-right" className={cn(!docked && 'z-4')} collapsed={docked && collapsed.r} open={!docked && overlay.r} onLeague={newLeague} />
          </div>

          <BottomBar label="Sections">
            {TABS.map(([k, label]) => (
              <BottomBarItem key={k} href={`#${k}`} icon={ICON[k]} label={label} current={k === tab} onClick={navTo(k)} />
            ))}
            {!wide && <>
              <BottomBarButton icon={SidebarLeft01Icon} label="Team and theme" data-rail-toggle aria-controls="rail-left" aria-expanded={leftShown} onClick={() => toggleRail('l')} />
              <BottomBarButton icon={SidebarRight01Icon} label="Standing and weeks" data-rail-toggle aria-controls="rail-right" aria-expanded={rightShown} onClick={() => toggleRail('r')} />
            </>}
          </BottomBar>
        </ViewContext.Provider>
      ) : (
        <div className="shell">
          <div className="shell__centre">
            <main id="main" className="shell__main" tabIndex={-1} aria-label="Hawk Tua HQ">
              {load.state === 'error' ? (
                <Note title="Couldn't load the league.">
                  <Prose>{load.message}. Check the league ID below, or your connection, then try again.</Prose>
                  <div><Action onClick={() => setNonce(n => n + 1)}>Try again</Action></div>
                </Note>
              ) : (
                <Note title="Getting this week's calls ready.">
                  <ol aria-live="polite">
                    {STEPS.map((s, i) => {
                      const step = load.state === 'loading' ? load.step : 0
                      return <li key={s} aria-current={i === step ? 'step' : undefined} className={cn(i === step && 'ds-note__title')}>{s}</li>
                    })}
                  </ol>
                </Note>
              )}
              <LeagueForm leagueId={leagueId} onLeague={newLeague} />
            </main>
          </div>
        </div>
      )}
    </div>
    <Legend open={legend} onClose={() => setLegend(false)} items={SHORTCUTS} />
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
      ? <Note title="This section hit a snag."><Prose>{this.state.err.message}</Prose></Note>
      : this.props.children
  }
}

/* The right rail: where you stand, the season at a glance, and where the numbers come from. */
function RightRail({
  id, className, collapsed, open, onLeague,
}: { id: string; className?: string; collapsed: boolean; open: boolean; onLeague: (id: string) => void }) {
  const { L, team } = useView()
  const t = team()
  const rec = `${t.wins}–${t.losses}${t.ties ? '–' + t.ties : ''}`
  return (
    <InfoRail id={id} className={className} title={t.name} collapsed={collapsed} open={open}>
      <div className="flex flex-col gap-(--space-16)">
      <InfoPairs items={[
        ['League', L.name],
        ['Record', rec],
        ['Rank', `${ord(t.rank)} of ${L.nTeams}`],
        ['Points for', f1(t.pf)],
        L.waiver.type === 'faab' ? ['FAAB left', `$${t.faabLeft}`] : ['On waivers', `#${t.waiver || '–'}`],
      ]} />
      <Ruler />
      <div className="flex flex-col gap-(--space-8) px-(--space-8)">
        <Prose>
          Live from Sleeper each time you open it. Projections and stats: Sleeper. Market values: FantasyCalc. Kickoffs, betting lines and player news: ESPN and RotoWire. Free, no account. Your choices and past betting lines are kept on this device.
        </Prose>
      </div>
      <InfoPairs items={[['Loaded', whenLong(L.loadedAt)], ['Version', `v${VERSION}`]]} />
      <details>
        <summary className="rows__group-label cursor-pointer select-none">Use a different league</summary>
        <LeagueForm leagueId={L.leagueId} onLeague={onLeague} />
      </details>
      </div>
    </InfoRail>
  )
}

/* One cell per week. Today is the grey pill, past weeks step back to the secondary grey,
   playoffs get their own row group, and the trade deadline is footnoted. No colour. */
const PER_ROW = 6
function Ruler() {
  const { L } = useView()
  const weeks = (from: number, to: number) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i)
  const playoffs = L.playoffStart && L.playoffStart <= L.lastWeek
  const season = weeks(1, playoffs ? L.playoffStart - 1 : L.lastWeek)
  const cell = (w: number) => (
    <li
      key={w} className="rows__row pointer-events-none justify-center"
      aria-current={w === L.week ? 'true' : undefined} aria-label={`Week ${w}`}
    >
      <span className={cn(w >= L.week && 'rows__label')}>{w}{L.tradeDeadline === w ? '†' : ''}</span>
    </li>
  )
  const grid = (ws: number[]) => (
    <ol className="grid gap-(--space-2) px-(--space-4)" style={{ gridTemplateColumns: `repeat(${PER_ROW}, minmax(0, 1fr))` }}>
      {ws.map(cell)}
    </ol>
  )
  return (
    <section aria-label="Season" className="flex flex-col pt-(--space-12)">
      <GroupLabel>Week {L.week} of {L.lastWeek}</GroupLabel>
      {grid(season)}
      {playoffs && <>
        <GroupLabel>Playoffs from week {L.playoffStart}</GroupLabel>
        {grid(weeks(L.playoffStart, L.lastWeek))}
      </>}
      {L.tradeDeadline ? <GroupLabel>† Trade deadline after week {L.tradeDeadline}</GroupLabel> : null}
    </section>
  )
}

function LeagueForm({ leagueId, onLeague }: { leagueId: string; onLeague: (id: string) => void }) {
  const [val, setVal] = useState(leagueId)
  return (
    <form
      className="flex items-center gap-(--space-8) p-(--space-8)"
      onSubmit={e => { e.preventDefault(); const id = val.trim().replace(/\D/g, ''); if (id) onLeague(id) }}
    >
      <Input aria-label="Sleeper league ID" placeholder="Sleeper league ID" inputMode="numeric" autoComplete="off" value={val} onChange={e => setVal(e.target.value)} className="flex-1" />
      <Action type="submit">Load</Action>
    </form>
  )
}
