import { useEffect, useState } from 'react'

import { HQ, f1, sgn, store, type Any } from '@/lib/hq'
import { cn } from '@/lib/utils'
import { Chip, Filter, Kicker, Lede, Num, Panel, TableWrap, useView } from '@/components/hq-ui'

/* The board is the same for every team in the league, so it's kept per league load. */
const cache = new Map<string, Promise<Any>>()

const SHOW = [['all', 'All'], ['free', 'Available']] as const
type Show = (typeof SHOW)[number][0]

const at = (g: Any) => `${g.home ? 'v' : 'at'} ${g.opp}`
/* Same stripes as the season ruler's playoff weeks. */
const STRIPES = 'repeating-linear-gradient(135deg, color-mix(in oklch, currentColor 22%, transparent) 0 2px, transparent 2px 5px)'

export default function Defences() {
  const { L, rid } = useView()
  const key = `${L.leagueId}:${L.loadedAt}`
  const [res, setRes] = useState<{ key: string; board?: Any; error?: string } | null>(null)

  useEffect(() => {
    let live = true
    if (!cache.has(key)) cache.set(key, HQ.defBoard(L, { cache: store }))
    cache.get(key)!
      .then(board => { if (live) setRes({ key, board }) })
      .catch((e: Error) => { cache.delete(key); if (live) setRes({ key, error: e.message }) })
    return () => { live = false }
    // L is fixed for a given key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const r = res?.key === key ? res : null
  if (!r) return <Panel kicker="Defences" title="Reading the betting lines"><Lede>Pulling every game's line from ESPN so far this season…</Lede></Panel>
  if (r.error || !r.board) {
    return <Panel kicker="Defences" title="No betting lines yet"><Lede>{r.error ? `ESPN didn't answer (${r.error}). Try refreshing.` : 'ESPN has no lines for this season yet.'}</Lede></Panel>
  }
  const board = r.board
  const plan = HQ.defPlan(L, board, rid)
  return (
    <div className="flex flex-col gap-5">
      <ThisWeek board={board} plan={plan} />
      <WeekByWeek plan={plan} />
      <Board board={board} />
      <SoFar board={board} />
      <Lede className="px-1 text-[13px]">
        Points are your league's scoring, from what the betting line expects each defence's opponent to score: <Num>{f1(HQ.DEF_LINE.a)}</Num> minus <Num>{f1(-HQ.DEF_LINE.b * 10)}</Num> for every 10 points expected. Games without a line yet use the line the team ratings predict, built from every line this season (recent weeks count more) plus the second half of last season. Your defence's row is highlighted.
      </Lede>
    </div>
  )
}

/* ---------- this week ---------- */

function ThisWeek({ board, plan }: { board: Any; plan: Any[] }) {
  const { L, P, rid } = useView()
  const name = (t: string) => P(t)?.name || t
  const now = plan.find(p => !p.locked)
  if (!now || (!now.you && !now.best)) return null
  const { you, best } = now
  const title = !best ? `Start ${name(you.team)}.`
    : now.stream ? `${now.claim ? 'Claim' : 'Pick up'} ${name(best.team)}${now.week === L.week ? '' : ` for week ${now.week}`}.`
    : `Start ${name(you.team)}.`

  const mineRows = board.rows.filter((r: Any) => r.owner === rid)
  const myPO = Math.max(0, ...mineRows.map((r: Any) => r.playoffs || 0))
  const stash = L.week < L.playoffStart
    ? board.rows.filter((r: Any) => r.owner == null && r.playoffs != null).sort((a: Any, b: Any) => b.playoffs - a.playoffs)[0]
    : null

  return (
    <Panel kicker={`Week ${now.week} · defence`} title={title}>
      <Lede>
        {you
          ? <>{name(you.team)} play {at(you)}, who are expected to score <Num>{f1(you.implied)}</Num>: about <Num>{f1(you.pts)}</Num> points. </>
          : <>Your defence is on bye. </>}
        {best && <>The best one nobody owns is {best.team} {at(best)}, facing <Num>{f1(best.implied)}</Num>: about <Num>{f1(best.pts)}</Num>. </>}
        {best && you && (now.stream
          ? now.claim ? <>That's <Num>{sgn(now.gap)}</Num>, enough to spend a waiver claim on.</> : <>That's <Num>{sgn(now.gap)}</Num>, and it's a free agent, so it costs nothing.</>
          : <>A gap of <Num>{sgn(now.gap)}</Num> isn't worth the move{now.claim ? ' or the waiver claim' : ''}. Switch at <Num>{now.claim ? 4 : 2}</Num> or more.</>)}
      </Lede>
      {stash && stash.playoffs - myPO >= 1.5 && (
        <Lede>
          For the playoffs (weeks <Num>{L.playoffStart}</Num>–<Num>{L.lastWeek}</Num>), the best free defence is {stash.team} at <Num>{f1(stash.playoffs)}</Num> a game against your <Num>{f1(myPO)}</Num>. Worth a stash once you have a spare bench spot.
        </Lede>
      )}
    </Panel>
  )
}

/* ---------- week by week ---------- */

function WeekByWeek({ plan }: { plan: Any[] }) {
  const { L } = useView()
  const streams = plan.filter(p => p.stream).length
  return (
    <Panel kicker={`Weeks ${L.week}–${L.lastWeek}`} title="Start or stream, week by week">
      <Lede>Your defence against the best one nobody owns each week. Stream when it's <Num>2</Num> points better: that's {streams} of {plan.length} weeks on today's lines. The orange number is the one to start. Striped weeks are the playoffs.</Lede>
      <TableWrap>
        <thead><tr><th>Wk</th><th>Yours</th><th className="r">Pts</th><th>Best available</th><th className="r">Pts</th><th className="hidden sm:table-cell">Call</th></tr></thead>
        <tbody>
          {plan.map(p => (
            <tr key={p.week} className={cn(p.locked && 'dim')}>
              <td>
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1 tnum" style={p.week >= L.playoffStart ? { backgroundImage: STRIPES } : undefined}>{p.week}</span>
              </td>
              <td>{p.you ? <Team t={p.you.team} sub={at(p.you)} /> : <span className="opacity-60">Bye</span>}</td>
              <td className="r">{p.you ? <span className={cn(!p.stream && 'num')}>{f1(p.you.pts)}</span> : '–'}</td>
              <td>{p.best ? <Team t={p.best.team} sub={at(p.best)} /> : '–'}</td>
              <td className="r">{p.best ? <span className={cn(p.stream && 'num')}>{f1(p.best.pts)}</span> : '–'}</td>
              <td className="hidden sm:table-cell">{p.locked ? <Chip tone="muted">Played</Chip> : p.stream ? <Chip tone="accent">{p.claim ? 'Claim' : 'Stream'}</Chip> : <Chip>Start yours</Chip>}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </Panel>
  )
}

function Team({ t, sub, subClass }: { t: string; sub: string; subClass?: string }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="font-semibold tracking-[-0.01em]">{t}</span>
      <span className={cn('max-w-[96px] truncate text-[12px] whitespace-nowrap opacity-60 sm:max-w-none', subClass)}>{sub}</span>
    </span>
  )
}

/* ---------- rest-of-season board ---------- */

function Board({ board }: { board: Any }) {
  const { L, rid, team } = useView()
  const [show, setShow] = useState<Show>('all')
  const rows = board.rows.filter((r: Any) => show === 'all' || r.owner == null)
  return (
    <Panel kicker={`Points a game, weeks ${L.week}–${L.lastWeek}`} title="Rest-of-season rankings">
      <Filter value={show} onChange={setShow} options={SHOW} label="Which defences" />
      <TableWrap>
        <thead><tr>
          <th className="r">#</th><th>Defence</th><th className="r">Per wk</th><th className="r hidden sm:table-cell">Next 3</th>
          <th className="r">Playoffs</th><th className="r">Bye</th>
        </tr></thead>
        <tbody>
          {rows.map((r: Any) => (
            <tr key={r.team} className={cn(r.owner === rid && 'mine')}>
              <td className="r opacity-60">{r.rank}</td>
              <td><Team t={r.team} sub={r.owner == null ? 'Available' : team(r.owner).name} /></td>
              <td className="r"><Num>{f1(r.ros)}</Num></td>
              <td className="r hidden sm:table-cell">{r.next3 != null ? f1(r.next3) : '–'}</td>
              <td className="r">{r.playoffs != null ? f1(r.playoffs) : '–'}</td>
              <td className="r opacity-70">{r.byes.length ? r.byes.join(', ') : '–'}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </Panel>
  )
}

/* ---------- good or lucky ---------- */

function SoFar({ board }: { board: Any }) {
  const { L, rid } = useView()
  if (L.week < 3) return null
  const rows = board.rows.filter((r: Any) => r.soFar != null && r.expected != null).slice().sort((a: Any, b: Any) => b.soFar - a.soFar)
  return (
    <Panel kicker={`Weeks 1–${L.week - 1}`} title="Good, or lucky?">
      <Lede>What each defence has scored against what its betting lines said it would. A big gap either way is mostly turnovers and touchdowns, which don't carry over.<span className="hidden sm:inline"> Rank is what the lines think of the defence itself.</span></Lede>
      <TableWrap>
        <thead><tr>
          <th>Defence</th><th className="r">Scored</th><th className="r">Lines</th><th className="r">Gap</th>
          <th className="r hidden sm:table-cell">Rank</th><th>Read</th>
        </tr></thead>
        <tbody>
          {rows.map((r: Any) => {
            const gap = r.soFar - r.expected
            return (
              <tr key={r.team} className={cn(r.owner === rid && 'mine')}>
                <td><Team t={r.team} sub={schedule(r.oppAttack)} subClass="hidden sm:block" /></td>
                <td className="r"><Num>{f1(r.soFar)}</Num></td>
                <td className="r">{f1(r.expected)}</td>
                <td className={cn('r', gap >= 3 && 'text-[var(--warn)]', gap <= -3 && 'text-[var(--good)]')}>{sgn(gap)}</td>
                <td className="r hidden opacity-70 sm:table-cell">{r.marketRank}</td>
                <td>{gap >= 3 ? <Chip tone="warn">Lucky</Chip> : gap <= -3 ? <Chip tone="good">Unlucky</Chip> : <Chip>Fair</Chip>}</td>
              </tr>
            )
          })}
        </tbody>
      </TableWrap>
      <Kicker className="hidden sm:block">Under each team: the offences it has faced, against an average one</Kicker>
    </Panel>
  )
}

function schedule(x: number | null) {
  if (x == null) return ''
  if (x <= -0.75) return 'Soft offences'
  if (x >= 0.75) return 'Tough offences'
  return 'Average offences'
}
