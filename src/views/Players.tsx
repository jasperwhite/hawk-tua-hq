import { useState } from 'react'

import { f0, f1, pct, type Any } from '@/lib/hq'
import { Action, DsTable, Input, Prose, Segmented, useView } from '@/components/ds-ui'

const POS_OPTS = [['ALL', 'All'], ['QB', 'QB'], ['RB', 'RB'], ['WR', 'WR'], ['TE', 'TE'], ['K', 'K'], ['DEF', 'DEF']] as const
const OWN_OPTS = [['all', 'Everyone'], ['fa', 'Free agents'], ['mine', 'Mine']] as const
const PAGE = 60

const INJURY: Record<string, string> = {
  Questionable: 'Q', Doubtful: 'Doubtful', Out: 'Out', IR: 'IR', PUP: 'PUP', Sus: 'Suspended', NA: 'N/A',
}

export default function Players() {
  const { L, rid, team } = useView()
  const [pos, setPos] = useState<(typeof POS_OPTS)[number][0]>('ALL')
  const [own, setOwn] = useState<(typeof OWN_OPTS)[number][0]>('all')
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const needle = q.trim().toLowerCase()
  const all = (Object.values(L.players) as Any[])
    .filter(p => p.rank)
    .filter(p => pos === 'ALL' || p.pos === pos)
    .filter(p => (own === 'fa' ? p.owner == null : own === 'mine' ? p.owner === rid : true))
    .filter(p => !needle || p.name.toLowerCase().includes(needle))
    .sort((a, b) => a.rank - b.rank)
  const list = all.slice(0, limit)

  /* Bye, no team, or the injury designation, as plain words. */
  const status = (p: Any): string | null => {
    if (!p.team) return 'No team'
    if (!L.plays(p.team, L.week)) return 'Bye'
    return p.inj ? INJURY[p.inj] || p.inj : null
  }
  const market = (p: Any) => {
    const m = L.market[p.id]
    if (!m) return { txt: '–', tag: null, title: undefined }
    const d = m.posRank - p.posRank
    const title = `Market: ${p.pos}${m.posRank}. Your scoring: ${p.pos}${p.posRank}`
    const tag = d >= 5 && p.owner != null && p.owner !== rid ? 'Buy' : d <= -5 && p.owner === rid ? 'Sell' : null
    return { txt: `${p.pos}${m.posRank}`, tag, title }
  }
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setLimit(PAGE) }

  return (
    <div className="flex flex-col gap-(--space-16)">
      <div className="flex flex-col gap-(--space-8)">
        <Prose className="px-(--space-8)">
          Ranked by points above a replacement-level starter for the rest of the season, scored your league's way. <b>Market</b> is each player's rank from real trades in similar leagues. A big gap is your edge: <b>Buy</b> players your scoring likes more than the market does, <b>Sell</b> the opposite.
        </Prose>
      </div>
      <div className="flex flex-col gap-(--space-8) px-(--space-8)">
        <Segmented className="flex-wrap" value={pos} onChange={reset(setPos)} options={POS_OPTS} label="Position" />
        <div className="flex flex-wrap items-center gap-(--space-8)">
          <Segmented value={own} onChange={reset(setOwn)} options={OWN_OPTS} label="Owner" />
          <Input
            id="player-search" type="search" placeholder="Find a player" aria-label="Find a player" value={q}
            onChange={e => { setQ(e.target.value); setLimit(PAGE) }}
            className="flex-1 basis-48"
          />
        </div>
      </div>
      <DsTable>
        <thead><tr>
          <th className="r">#</th><th>Player</th><th className="hidden md:table-cell">Team</th><th className="r">Pos</th>
          <th className="r hidden sm:table-cell">This wk</th><th className="r">Per wk</th><th className="r hidden sm:table-cell">Value</th>
          {L.hasMarket && <><th className="r hidden sm:table-cell">Market</th><th /></>}
          <th className="r hidden md:table-cell">vs half-PPR</th>
        </tr></thead>
        <tbody>
          {list.map(p => {
            const m = market(p)
            const s = status(p)
            return (
              <tr key={p.id} className={p.owner === rid ? 'is-mine' : undefined}>
                <td className="r">{p.rank}</td>
                <td>
                  <div className="flex items-baseline gap-(--space-8) whitespace-nowrap">
                    <span className="ds-table__name">{p.name}</span>
                    <span>{p.team || 'FA'}</span>
                    {s && <span title={p.injBody ? `${p.inj} · ${p.injBody}` : undefined}>{s}</span>}
                  </div>
                </td>
                <td className="hidden max-w-40 truncate md:table-cell">{p.owner != null ? team(p.owner).name : 'Free agent'}</td>
                <td className="r">{p.pos}{p.posRank}</td>
                <td className="r hidden sm:table-cell">{f1(p.thisWk)}</td>
                <td className="r">{f1(p.rosWk)}</td>
                <td className="r hidden sm:table-cell">{f0(p.vorp)}</td>
                {L.hasMarket && <><td className="r hidden sm:table-cell">{m.txt}</td><td title={m.title}>{m.tag}</td></>}
                <td className="r hidden md:table-cell">{p.boost == null || p.pos === 'K' || p.pos === 'DEF' ? '–' : pct(p.boost)}</td>
              </tr>
            )
          })}
        </tbody>
      </DsTable>
      {!list.length && <Prose className="px-(--space-8)">No players match.</Prose>}
      {all.length > limit && (
        <div className="px-(--space-8)">
          <Action onClick={() => setLimit(limit + PAGE)}>Show {Math.min(PAGE, all.length - limit)} more</Action>
        </div>
      )}
    </div>
  )
}
