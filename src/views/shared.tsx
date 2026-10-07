/* Copy fragments used on more than one tab. */
import { POS_NAME, ord, sgn, whenLong, type Any, type HQView } from '@/lib/hq'
import { Num, useView } from '@/components/hq-ui'

export function MoveName({ a }: { a: Any }) {
  const { P } = useView()
  return <>Add {P(a.add).name}{a.drop ? `, drop ${P(a.drop).name}` : ''}</>
}

export function GainLine({ a }: { a: Any }) {
  if (a.perWk < 0.3 && a.now > 1) return <><Num>{sgn(a.now)}</Num> this week. A one-week fill-in.</>
  if (a.now < 0.3) return <><Num>{sgn(a.perWk)}</Num> a week from next week.</>
  return <><Num>{sgn(a.now)}</Num> this week, <Num>{sgn(a.perWk)}</Num> a week after.</>
}

export function FaLine({ a }: { a: Any }) {
  const { L, team } = useView()
  const t = team()
  if (a.status === 'free') {
    return L.waiver.type === 'faab'
      ? <>Free agent now, so no bid needed.</>
      : <>Free agent now: add in Sleeper straight away and keep your <Num>#{t.waiver || '–'}</Num> waiver spot.</>
  }
  const run = L.waiver.nextRun ? <> until <Num>{whenLong(L.waiver.nextRun)}</Num></> : null
  if (L.waiver.type === 'faab') return <>On waivers{run}. Bid <Num>${a.bid || 0}</Num> of your <Num>${t.faabLeft}</Num>.</>
  return <>On waivers{run}. A claim sends you to the back of the waiver line.</>
}

/** One line on what a trade fixes, or null when there's nothing specific to say. */
export function tradeWhy(v: HQView, r: Any) {
  const { L, P, rid, get } = v
  const ranks = get('ranks')[rid]
  const got = r.get.map((id: string) => P(id).pos)
  const weak = ['QB', 'RB', 'WR', 'TE'].filter(pos => got.includes(pos)).sort((a, b) => ranks[b].rank - ranks[a].rank)[0]
  if (weak && ranks[weak].rank >= Math.ceil(L.nTeams / 2)) return <>Fixes {POS_NAME[weak]}, where your starters rank <Num>{ord(ranks[weak].rank)}</Num> of {L.nTeams}.</>
  if (r.give.length > r.get.length) return <>Turns two of your players into one better starter, and frees a bench spot.</>
  if (r.get.length > r.give.length) return <>Splits one player into two starters for your thinner spots.</>
  return null
}
