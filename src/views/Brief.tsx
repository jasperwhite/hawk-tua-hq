import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'

import { HQ, POS_NAME, f1, ord, pct, plural, sgn, when, whyOut, type Any, type Tab } from '@/lib/hq'
import { GlassButton } from '@/components/ui/opaline/glass-button'
import { GlassCard } from '@/components/ui/opaline/glass-card'
import { Bars, Kicker, Lede, Num, Panel, useView } from '@/components/hq-ui'
import { FaLine, GainLine, MoveName, tradeWhy } from '@/views/shared'

type Call = { k: string; verdict: React.ReactNode; items: React.ReactNode[]; flag?: boolean; tab: Tab; cta: string }

export default function Brief() {
  const v = useView()
  const { L, get, team } = v
  const lc = get('lineup')
  const sn = get('notes')
  const cards: Call[] = [lineupCall(lc), waiverCall(), tradeCall(), watchCall(lc)]
  const bmax = Math.max(...(Object.values(sn.boosts) as number[]).map(Math.abs), 0.01)

  return (
    <div className="flex flex-col gap-5">
      <Scoreboard lc={lc} />

      <section aria-label="This week's calls" className="grid gap-4 md:grid-cols-2">
        {cards.map(c => <CallCard key={c.k} c={c} />)}
      </section>

      <Panel kicker={`${L.name} scoring`} title="Why these aren't normal rankings">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Lede>What the top players at each position score in your league, against the same stat lines in standard half-PPR.</Lede>
            <Bars rows={['QB', 'RB', 'WR', 'TE'].map(pos => ({
              label: pos, value: Math.max(0, sn.boosts[pos]), max: bmax, right: <Num>{pct(sn.boosts[pos])}</Num>,
            }))} />
          </div>
          <ul className="flex flex-col gap-2.5 text-[14px] leading-snug">
            {sn.notes.map((n: Any) => (
              <li key={n.key} className="border-l-2 border-[var(--accent-fill)] pl-3 opacity-85">{n.text}</li>
            ))}
          </ul>
        </div>
      </Panel>

      <BenchPanel />
    </div>
  )

  /* ---------- the four calls ---------- */

  function lineupCall(lc: Any): Call {
    const { P } = v
    const plan = get('plan')
    const items: React.ReactNode[] = []
    let verdict: React.ReactNode = '', flag = false
    for (const h of lc.holes) {
      const holder = h.id ? P(h.id) : null
      const fix = plan.find((a: Any) => HQ.eligible(P(a.add), h.slot))
      const label = POS_NAME[h.slot] || h.slot
      if (!verdict) {
        verdict = holder ? `${holder.name} ${whyOut(L, holder)} and nobody on your bench can play ${label}.` : `Your ${label} spot is empty.`
        flag = true
      }
      if (fix) items.push(<>Pick up <b>{P(fix.add).name}</b> to start there: <Num>{f1(P(fix.add).thisWk)}</Num> projected. {fix.status === 'free' ? 'Free agent now.' : 'On waivers.'}</>)
    }
    if (lc.swaps.length) {
      if (!verdict) verdict = lc.swaps.length === 1
        ? `Start ${P(lc.swaps[0].start).name}${lc.swaps[0].sit ? ` over ${P(lc.swaps[0].sit).name}` : ''}.`
        : `Make ${lc.swaps.length} changes to your lineup.`
      for (const s of lc.swaps) items.push(<>Start <b>{P(s.start).name}</b>{s.sit ? `, sit ${P(s.sit).name}` : ''}: <Num>{sgn(s.gain)}</Num></>)
    }
    if (!verdict) verdict = 'Your lineup is already your best one.'
    for (const c of lc.close.slice(0, 2)) items.push(<>Close call: {P(c.start).name} over {P(c.alt).name} by <Num>{f1(c.margin)}</Num>. Check news before kickoff.</>)
    if (lc.empty) items.push(<>{plural(lc.empty, 'starting spot')} empty in Sleeper right now.</>)
    return { k: 'Lineup', verdict, items, flag, tab: 'lineup', cta: 'Open lineup' }
  }

  function waiverCall(): Call {
    const plan = get('plan')
    const t = team()
    const base = { k: 'Waivers', tab: 'waivers' as Tab, cta: 'Open waivers' }
    if (!plan.length) return { ...base, verdict: 'Nothing on the wire beats what you have.', items: [<>You keep your <Num>#{t.waiver || '–'}</Num> waiver spot for when someone breaks out.</>] }
    if (plan.length === 1) return { ...base, verdict: <><MoveName a={plan[0]} />.</>, items: [<GainLine a={plan[0]} />, <FaLine a={plan[0]} />] }
    const allFree = plan.every((a: Any) => a.status === 'free')
    const items: React.ReactNode[] = plan.map((a: Any) => <><b><MoveName a={a} /></b>: <GainLine a={a} /></>)
    if (allFree && L.waiver.type !== 'faab') items.push(<>Add them in Sleeper now and you keep your <Num>#{t.waiver || '–'}</Num> waiver spot.</>)
    return { ...base, verdict: `${plan.length} pickups${allFree ? ', all free agents now' : ''}.`, items }
  }

  function tradeCall(): Call {
    const { P } = v
    const ideas = get('trades')
    const base = { k: 'Trade', tab: 'trades' as Tab, cta: 'Open trades' }
    if (L.tradeDeadline && L.week > L.tradeDeadline) return { ...base, verdict: 'The trade deadline has passed.', items: [] }
    if (!ideas.length) return { ...base, verdict: 'No trade clearly helps both sides right now.', items: ['Check again after waivers run. Rosters shift every week.'] }
    const r = ideas[0]
    const items: React.ReactNode[] = []
    const why = tradeWhy(v, r)
    if (why) items.push(why)
    items.push(<>You gain <Num>{sgn(r.dA)}</Num> a week, {r.team.name} gain <Num>{sgn(r.dB)}</Num>. Both lineups improve, so it has a real chance.</>)
    if (L.hasMarket) items.push(<>Market value: you send <Num>{Math.round(r.mGive).toLocaleString('en-AU')}</Num>, get <Num>{Math.round(r.mGet).toLocaleString('en-AU')}</Num>.</>)
    const names = (ids: string[]) => ids.map(id => P(id).name).join(' + ')
    return { ...base, verdict: `Offer ${names(r.give)} to ${r.team.name} for ${names(r.get)}.`, items }
  }

  function watchCall(lc: Any): Call {
    const { P } = v
    const items: React.ReactNode[] = []
    const starters = lc.opt.filter(Boolean).map(P)
    for (const p of lc.watch) items.push(<><b>{p.name}</b> is {(p.inj || '').toLowerCase()}{p.injBody ? ` (${p.injBody.toLowerCase()})` : ''}. Check before <Num>{when(HQ.kickoff(L, p.team)) || 'kickoff'}</Num>.</>)
    const kicks = (Object.values(L.kick) as Any[]).map(k => k.at).filter(Boolean).sort((a, b) => a - b)
    if (kicks.length && kicks[0] > Date.now()) {
      const first = kicks[0]
      const early = starters.filter((p: Any) => p.team && HQ.kickoff(L, p.team) === first && !HQ.isLocked(L, p.id))
      items.push(early.length
        ? <><b>{early.map((p: Any) => p.name).join(', ')}</b> play{early.length === 1 ? 's' : ''} first, locking <Num>{when(first)}</Num>.</>
        : <>First game locks <Num>{when(first)}</Num>. None of your starters play in it.</>)
    }
    const next = L.week + 1
    if (next <= L.lastWeek) {
      const off = starters.filter((p: Any) => p.team && !L.plays(p.team, next))
      if (off.length) items.push(<>Week {next} byes: {off.map((p: Any) => p.name).join(', ')}. Plan the cover now.</>)
    }
    if (L.tradeDeadline && L.week <= L.tradeDeadline && L.tradeDeadline - L.week <= 3) items.push(<>Trade deadline is after week {L.tradeDeadline}.</>)
    const verdict = lc.watch.length ? `${lc.watch[0].name} is ${(lc.watch[0].inj || '').toLowerCase()}.` : 'No injury worries in your lineup.'
    return { k: 'Watch', verdict, items, tab: 'news', cta: 'Open news' }
  }
}

function CallCard({ c }: { c: Call }) {
  const { go } = useView()
  return (
    <GlassCard
      blur={6}
      tint={c.flag ? 'color-mix(in oklch, var(--accent-fill) 20%, var(--glass-tint-frosted))' : undefined}
      className="gap-3 rounded-[26px] px-5 py-5 sm:px-6"
    >
      <Kicker>{c.k}</Kicker>
      <p className="text-[20px] leading-snug font-semibold tracking-[-0.022em] text-balance">{c.verdict}</p>
      {c.items.length > 0 && (
        <ul className="flex flex-col gap-1.5 text-[14px] leading-snug">
          {c.items.map((it, i) => (
            <li key={i} className="grid grid-cols-[10px_1fr] gap-2 opacity-85"><span className="pt-[9px]"><span className="block h-px w-2 bg-current opacity-50" /></span><span>{it}</span></li>
          ))}
        </ul>
      )}
      <div className="mt-auto pt-1">
        <GlassButton size="sm" onClick={() => go(c.tab)}>{c.cta}<HugeiconsIcon icon={ArrowRight01Icon} /></GlassButton>
      </div>
    </GlassCard>
  )
}

function Scoreboard({ lc }: { lc: Any }) {
  const { team } = useView()
  const t = team()
  const side = (name: string, pts: number, right?: boolean) => (
    <div className={`flex min-w-0 flex-col gap-1 ${right ? 'items-end text-right' : ''}`}>
      <span className="truncate text-[13px] font-semibold tracking-[0.04em] uppercase opacity-70">{name}</span>
      <span className={`text-[44px] leading-none font-semibold tracking-[-0.04em] tnum sm:text-[56px] ${right ? '' : 'text-[var(--num)]'}`}>{f1(pts)}</span>
    </div>
  )
  if (!lc.opp) {
    return (
      <Panel kicker="This week">
        <div className="flex items-end justify-between gap-4">{side(t.name, lc.optTotal)}<span className="kicker">Bye week</span></div>
      </Panel>
    )
  }
  const wp = Math.round(lc.opp.winProb * 100)
  return (
    <GlassCard blur={6} className="gap-4 rounded-[28px] px-5 py-5 sm:px-7 sm:py-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        {side(t.name, lc.optTotal)}
        <span className="pb-2 text-[12px] font-semibold tracking-[0.2em] opacity-50">VS</span>
        {side(lc.opp.team.name, lc.opp.proj, true)}
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-2.5 overflow-hidden rounded-full bg-current/10" role="img" aria-label={`${wp}% chance to win`}>
          <span className="block h-full rounded-full bg-[var(--accent-fill)]" style={{ width: `${wp}%` }} />
        </div>
        <p className="text-[14px] opacity-80">
          <Num>{wp}%</Num> to win if you make the calls below and they set their best lineup. {lc.opp.team.wins}–{lc.opp.team.losses}, {ord(lc.opp.team.rank)} in the league.
        </p>
      </div>
    </GlassCard>
  )
}

function BenchPanel() {
  const { L, rid, get } = useView()
  const bl = get('bench')
  if (!L.pastWeeks.length || !bl[rid]) return null
  const mine: Any[] = bl[rid]
  const left = mine.reduce((s, x) => s + x.left, 0)
  const table = Object.entries(bl as Record<string, Any[]>)
    .map(([r, ws]) => ({ rid: +r, left: ws.reduce((s, x) => s + x.left, 0) }))
    .sort((a, b) => a.left - b.left)
  const least = table.findIndex(x => x.rid === rid) + 1
  const most = L.nTeams - least + 1
  const where = most <= least ? (most === 1 ? 'most' : `${ord(most)} most`) : least === 1 ? 'least' : `${ord(least)} least`
  const wmax = Math.max(...mine.map(x => x.left), 1)
  return (
    <Panel kicker={`Weeks 1–${L.pastWeeks.length}`} title="Points left on your bench">
      <Lede>You've left <Num>{f1(left)}</Num> points on your bench, the {where} in the league. Best possible lineup each week, with hindsight, against the one you played.</Lede>
      <Bars rows={mine.map(x => ({ label: `WK ${x.week}`, value: x.left, max: wmax, right: <Num>{f1(x.left)}</Num> }))} />
    </Panel>
  )
}
