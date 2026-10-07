/* Bridge to the engine (plain JS, also runs under Node) plus the small formatters the views share. */
import './engine.js'

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Any = any
export const HQ: Any = (globalThis as Any).HQ

export const VERSION = '0.2.0'
export const DEFAULT_LEAGUE = '1312056164149641216'
export const DEFAULT_USER = 'jasperwhite'

export const TABS = [
  ['brief', 'Brief'], ['lineup', 'Lineup'], ['waivers', 'Waivers'], ['trades', 'Trades'],
  ['players', 'Players'], ['team', 'Team'], ['news', 'News'],
] as const
export type Tab = (typeof TABS)[number][0]

export const POS_NAME: Record<string, string> = {
  QB: 'quarterback', RB: 'running back', WR: 'receiver', TE: 'tight end', K: 'kicker', DEF: 'defence',
  FLEX: 'flex', SUPER_FLEX: 'superflex', WRRB_FLEX: 'flex', REC_FLEX: 'flex',
}
export const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const

export const f1 = (n: number) => (Math.round((n || 0) * 10) / 10).toFixed(1)
export const f0 = (n: number) => Math.round(n || 0).toLocaleString('en-AU')
export const sgn = (n: number) => (n >= 0 ? '+' : '−') + f1(Math.abs(n))
export const pct = (n: number) => (n >= 0 ? '+' : '−') + Math.abs(Math.round(n * 100)) + '%'
export const ord = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
export const plural = (n: number, a: string, b?: string) => `${n} ${n === 1 ? a : b || a + 's'}`

const tfmt = new Intl.DateTimeFormat('en-AU', { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
const dfmt = new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
const tidy = (s: string) => s.replace(/\s?([ap])\.?m\.?/i, (_m, x: string) => x.toLowerCase() + 'm').replace(/,/g, '').replace(':00', '')
export const when = (ms?: number | null) => (ms ? tidy(tfmt.format(new Date(ms))) : '')
export const whenLong = (ms?: number | null) => (ms ? tidy(dfmt.format(new Date(ms))) : '')
export const ago = (ms: number) => {
  const m = Math.round((Date.now() - ms) / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  return h < 36 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
}

export const store = {
  get(k: string) { try { return localStorage.getItem('hq.' + k) } catch { return null } },
  set(k: string, v: string) { try { localStorage.setItem('hq.' + k, v) } catch { /* private window */ } },
}

/* ---------- per-team view of the loaded league ---------- */

export type Key = 'lineup' | 'plan' | 'waivers' | 'trades' | 'notes' | 'ranks' | 'bench' | 'byes'

export type HQView = {
  L: Any
  rid: number
  P: (id: string) => Any
  team: (rid?: number) => Any
  get: (k: Key) => Any
}

export function makeView(L: Any, rid: number): HQView {
  const cache: Partial<Record<Key, Any>> = {}
  const calls: Record<Key, () => Any> = {
    lineup: () => HQ.lineupCall(L, rid),
    plan: () => HQ.waiverPlan(L, rid, 3),
    waivers: () => HQ.waiverCalls(L, rid),
    trades: () => HQ.tradeIdeas(L, rid, 8),
    notes: () => HQ.scoringNotes(L),
    ranks: () => HQ.positionRanks(L),
    bench: () => HQ.benchLoss(L),
    byes: () => HQ.byesAhead(L, rid),
  }
  return {
    L, rid,
    P: id => L.players[id],
    team: r => L.teamByRid[r == null ? rid : r],
    get: k => (k in cache ? cache[k] : (cache[k] = calls[k]())),
  }
}

export function whyOut(L: Any, p: Any) {
  if (!p.team) return 'has no team'
  if (!L.plays(p.team, L.week)) return 'is on bye'
  if (p.inj && ['Out', 'IR', 'PUP', 'Sus', 'NA'].includes(p.inj)) return `is ${p.inj === 'IR' ? 'on IR' : 'out'}`
  if (p.inj === 'Doubtful') return 'is doubtful'
  return 'projects next to nothing'
}

export function gameText(L: Any, p: Any) {
  if (!p.team) return ''
  const g = HQ.gameOf(L, p.team)
  if (!g) return 'Bye'
  const k = HQ.kickoff(L, p.team)
  return `${g.home ? 'vs' : '@'} ${g.opp}${k ? ` · ${when(k)}` : ''}`
}
