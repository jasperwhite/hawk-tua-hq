import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Search01Icon } from '@hugeicons/core-free-icons'

import { f0, f1, pct, type Any } from '@/lib/hq'
import { Chip, Filter, Lede, Panel, PlayerCell, TableWrap, Num, useView } from '@/components/hq-ui'
import { GlassButton } from '@/components/ui/opaline/glass-button'
import { GlassInput } from '@/components/ui/opaline/glass-input'

const POS_OPTS = [['ALL', 'All'], ['QB', 'QB'], ['RB', 'RB'], ['WR', 'WR'], ['TE', 'TE'], ['K', 'K'], ['DEF', 'DEF']] as const
const OWN_OPTS = [['all', 'Everyone'], ['fa', 'Free agents'], ['mine', 'Mine']] as const
const PAGE = 60

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

  const market = (p: Any) => {
    const m = L.market[p.id]
    if (!m) return { txt: '–', tag: null }
    const d = m.posRank - p.posRank
    const title = `Market: ${p.pos}${m.posRank}. Your scoring: ${p.pos}${p.posRank}`
    const tag = d >= 5 && p.owner != null && p.owner !== rid ? <Chip tone="accent" title={title}>Buy</Chip>
      : d <= -5 && p.owner === rid ? <Chip tone="warn" title={title}>Sell</Chip> : null
    return { txt: `${p.pos}${m.posRank}`, tag }
  }
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setLimit(PAGE) }

  return (
    <Panel kicker="Rest of season · your scoring" title="Player values">
      <Lede>
        Ranked by points above a replacement-level starter for the rest of the season, scored your league's way. <b>Market</b> is each player's rank from real trades in similar leagues. A big gap is your edge: <b>Buy</b> players your scoring likes more than the market does, <b>Sell</b> the opposite.
      </Lede>
      <div className="flex flex-col gap-2">
        <Filter value={pos} onChange={reset(setPos)} options={POS_OPTS} label="Position" />
        <div className="flex flex-wrap items-center gap-2">
          <Filter value={own} onChange={reset(setOwn)} options={OWN_OPTS} label="Owner" />
          <GlassInput
            type="search" placeholder="Find a player" aria-label="Find a player" value={q}
            onChange={e => { setQ(e.target.value); setLimit(PAGE) }}
            startIcon={<HugeiconsIcon icon={Search01Icon} className="size-4 opacity-50" />}
            className="min-w-0 flex-1 basis-48"
          />
        </div>
      </div>
      <TableWrap>
        <thead><tr>
          <th className="r">#</th><th>Player</th><th className="hidden md:table-cell">Team</th><th className="r">Pos</th>
          <th className="r">This wk</th><th className="r">Per wk</th><th className="r">Value</th>
          {L.hasMarket && <><th className="r hidden sm:table-cell">Market</th><th /></>}
          <th className="r hidden md:table-cell">vs half-PPR</th>
        </tr></thead>
        <tbody>
          {list.map(p => {
            const m = market(p)
            return (
              <tr key={p.id} className={p.owner === rid ? 'mine' : undefined}>
                <td className="r opacity-55">{p.rank}</td>
                <td><PlayerCell p={p} /></td>
                <td className="hidden max-w-40 truncate opacity-60 md:table-cell">{p.owner != null ? team(p.owner).name : 'Free agent'}</td>
                <td className="r">{p.pos}{p.posRank}</td>
                <td className="r">{f1(p.thisWk)}</td>
                <td className="r"><Num>{f1(p.rosWk)}</Num></td>
                <td className="r">{f0(p.vorp)}</td>
                {L.hasMarket && <><td className="r hidden opacity-60 sm:table-cell">{m.txt}</td><td>{m.tag}</td></>}
                <td className="r hidden opacity-60 md:table-cell">{p.boost == null || p.pos === 'K' || p.pos === 'DEF' ? '–' : pct(p.boost)}</td>
              </tr>
            )
          })}
        </tbody>
      </TableWrap>
      {!list.length && <Lede>No players match.</Lede>}
      {all.length > limit && (
        <GlassButton className="self-start" onClick={() => setLimit(limit + PAGE)}>Show {Math.min(PAGE, all.length - limit)} more</GlassButton>
      )}
    </Panel>
  )
}
