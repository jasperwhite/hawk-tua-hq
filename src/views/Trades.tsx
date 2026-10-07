import { useEffect, useRef, useState } from 'react'

import { HQ, f0, f1, sgn, type Any } from '@/lib/hq'
import { cn } from '@/lib/utils'
import { Kicker, Lede, Num, Panel, PlayerCell, useView } from '@/components/hq-ui'
import { GlassButton } from '@/components/ui/opaline/glass-button'
import { GlassCard } from '@/components/ui/opaline/glass-card'
import {
  GlassSelect, GlassSelectContent, GlassSelectItem, GlassSelectTrigger, GlassSelectValue,
} from '@/components/ui/opaline/glass-select'
import { tradeWhy } from '@/views/shared'

export default function Trades() {
  const v = useView()
  const { L, P, rid, get } = v
  const ideas: Any[] = get('trades')
  const [other, setOther] = useState<number>(() => (ideas[0] ? ideas[0].team.rid : L.teams.find((t: Any) => t.rid !== rid).rid))
  const [give, setGive] = useState<Set<string>>(new Set())
  const [take, setTake] = useState<Set<string>>(new Set())
  const builderRef = useRef<HTMLDivElement>(null)
  const [jump, setJump] = useState(0)
  /* Scroll after the builder has re-rendered with the deal; scrolling inside the click gets cancelled. */
  useEffect(() => { if (jump) builderRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }, [jump])

  const names = (ids: string[]) => ids.map((id, i) => <span key={id}>{i ? ' + ' : ''}<b>{P(id).name}</b></span>)
  const tryIdea = (r: Any) => {
    setOther(r.team.rid); setGive(new Set(r.give)); setTake(new Set(r.get)); setJump(j => j + 1)
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel kicker="Best deals first" title="Trades that help both teams">
        <Lede>
          Every one-for-one and two-for-one swap with every team, judged by what it does to <b>both</b> starting lineups for the rest of the season. A deal only shows if the other side improves too and the market values are close, so it has a real chance of being accepted.
          {L.tradeDeadline ? <> Deadline: after week <Num>{L.tradeDeadline}</Num>.</> : null}
        </Lede>
        {ideas.length ? (
          <ol className="flex flex-col gap-2.5">
            {ideas.map((r, i) => {
              const why = tradeWhy(v, r)
              return (
                <li key={i} className="flex flex-col gap-2 rounded-2xl border border-[var(--hair)] bg-[var(--glass-highlight)] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] leading-snug">Send {names(r.give)} for {names(r.get)} <span className="opacity-60">· {r.team.name}</span></p>
                    <GlassButton size="sm" className="shrink-0" onClick={() => tryIdea(r)}>Try it</GlassButton>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] opacity-80">
                    <span>You <Num>{sgn(r.dA)}</Num>/wk</span>
                    <span>Them <Num>{sgn(r.dB)}</Num>/wk</span>
                    {L.hasMarket && <span>Market {f0(r.mGive)} → {f0(r.mGet)}</span>}
                    {why && <span>{why}</span>}
                  </div>
                </li>
              )
            })}
          </ol>
        ) : <Lede><b>Nothing clean right now.</b> No one-for-one or two-for-one deal makes both teams better.</Lede>}
      </Panel>

      <div ref={builderRef} className="scroll-mt-4">
        <Panel kicker="Points per week, rest of season" title="Trade builder">
          <div className="flex flex-wrap items-center gap-2">
            <Kicker>Trade with</Kicker>
            <GlassSelect value={String(other)} onValueChange={x => { setOther(+x); setTake(new Set()) }}>
              <GlassSelectTrigger className="min-w-0 max-w-full"><GlassSelectValue /></GlassSelectTrigger>
              <GlassSelectContent>
                {L.teams.filter((t: Any) => t.rid !== rid).map((t: Any) => <GlassSelectItem key={t.rid} value={String(t.rid)}>{t.name}</GlassSelectItem>)}
              </GlassSelectContent>
            </GlassSelect>
            <GlassButton size="sm" onClick={() => { setGive(new Set()); setTake(new Set()) }}>Clear</GlassButton>
          </div>
          <Verdict other={other} give={[...give]} take={[...take]} />
          <div className="grid gap-4 md:grid-cols-2">
            <Picks title="You send" rid={rid} set={give} onChange={setGive} />
            <Picks title={`You get from ${v.team(other).name}`} rid={other} set={take} onChange={setTake} />
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Verdict({ other, give, take }: { other: number; give: string[]; take: string[] }) {
  const { L, P, rid, team } = useView()
  const box = 'sticky top-[calc(env(safe-area-inset-top,0px)+8px)] z-20 gap-3 rounded-[22px] px-4 py-4'
  if (!give.length && !take.length) {
    return <GlassCard blur={10} className={box}><Lede className="px-0">Tick players on both sides to see what the deal does to each lineup.</Lede></GlassCard>
  }
  const r = HQ.evalTrade(L, rid, other, give, take)
  const them = team(other).name
  const verdict = r.dA > 0.4 && r.dB > 0.1 ? 'Good for both of you. Send it.'
    : r.dA > 0.4 ? `Good for you, worse for ${them}. Expect a no.`
    : r.dA < -0.4 ? 'Bad for you. Pass.'
    : 'About even. Only worth it if you need the roster spot or the bye cover.'
  const nm = (ids: string[]) => ids.map(id => P(id).name).join(', ')
  const notes = [
    r.aDrops.length && `You'd have to drop ${nm(r.aDrops)}.`,
    r.aAdds.length && `Frees a spot; best pickup would be ${nm(r.aAdds)}.`,
    r.bDrops.length && `They'd have to drop ${nm(r.bDrops)}.`,
  ].filter(Boolean)
  return (
    <GlassCard blur={10} className={box}>
      <p className="text-[18px] leading-snug font-semibold tracking-[-0.02em]">{verdict}</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Stat label="You" value={`${sgn(r.dA)}/wk`} />
        <Stat label={them} value={`${sgn(r.dB)}/wk`} />
        {L.hasMarket && <Stat label="Market: send / get" value={`${f0(r.mGive)} / ${f0(r.mGet)}`} />}
      </div>
      {notes.length > 0 && <p className="text-[13px] opacity-75">{notes.join(' ')}</p>}
    </GlassCard>
  )
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex min-w-0 flex-col gap-0.5"><Kicker className="truncate">{label}</Kicker><Num className="text-[20px]">{value}</Num></div>
)

function Picks({ title, rid, set, onChange }: { title: string; rid: number; set: Set<string>; onChange: (s: Set<string>) => void }) {
  const { P, team } = useView()
  const players = HQ.activeIds(team(rid)).map(P).filter(Boolean).sort((a: Any, b: Any) => b.vorp - a.vorp)
  const toggle = (id: string) => { const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); onChange(n) }
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Kicker>{title}</Kicker>
      <div className="flex flex-col">
        {players.map((p: Any) => (
          <label key={p.id} className={cn('grid cursor-pointer grid-cols-[20px_1fr_auto] items-center gap-3 border-b border-[var(--hair)] py-2 last:border-0', set.has(p.id) && 'text-[var(--num)]')}>
            <input type="checkbox" className="size-4 accent-[var(--accent-fill)]" checked={set.has(p.id)} onChange={() => toggle(p.id)} />
            <PlayerCell p={p} />
            <span className="tnum text-[14px]">{f1(p.rosWk)}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
