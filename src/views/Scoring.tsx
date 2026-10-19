import { useState } from 'react'

import { HQ, POSITIONS, f1, ord, type Any } from '@/lib/hq'
import { Chip, Filter, Lede, Num, Panel, PlayerCell, TableWrap, useView } from '@/components/hq-ui'

const SCALE = [['total', 'Total'], ['game', 'Per game']] as const
type Who = 'all' | (typeof POSITIONS)[number]
const WHO: readonly (readonly [Who, string])[] = [['all', 'All'], ...POSITIONS.map(p => [p, p] as const)]

type Scale = (typeof SCALE)[number][0]

export default function Scoring() {
  const { L, rid } = useView()
  const [scale, setScale] = useState<Scale>('total')
  const [who, setWho] = useState<Who>('all')
  const [live, setLive] = useState(false)
  const [full, setFull] = useState(false)

  const S = HQ.seasonByPos(L, { live })
  const per = scale === 'game'
  const div = per && S.games ? S.games : 1
  const span = S.weeks.length
    ? `Week${S.weeks.length > 1 ? 's' : ''} ${S.weeks[0]}${S.weeks.length > 1 ? `–${S.weeks[S.weeks.length - 1]}` : ''}`
    : 'No completed weeks yet'

  const teams = S.teams.slice().sort((a: Any, b: Any) => b.total - a.total)
  const mine = S.teams.find((t: Any) => t.rid === rid)
  const best = POSITIONS.filter(g => mine && mine.rank[g] <= 3)
  const worst = POSITIONS.filter(g => mine && mine.rank[g] >= L.nTeams - 2)

  const players = S.players
    .filter((r: Any) => who === 'all' || r.pos === who)
    .sort((a: Any, b: Any) => (per ? b.perStart - a.perStart : b.total - a.total))
  const shown = full ? players : players.slice(0, 40)

  if (!S.games) {
    return <Panel kicker="Starters only" title="Scoring by position"><Lede>No week has finished yet this season, so there is nothing to split up.</Lede></Panel>
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel
        kicker={`${span} · ${S.games} game${S.games === 1 ? '' : 's'}`}
        title="Scoring by position"
        aside={S.liveWeek ? (
          <button type="button" onClick={() => setLive(v => !v)} className="cursor-pointer">
            <Chip tone={live ? 'accent' : 'plain'}>{live ? '' : '+ '}Week {S.liveWeek} live</Chip>
          </button>
        ) : null}
      >
        <Filter value={scale} onChange={setScale} options={SCALE} label="Total or per game" />
        <TableWrap>
          <thead>
            <tr>
              <th className="r">#</th><th>Team</th>
              {POSITIONS.map(g => <th key={g} className="r">{g}</th>)}
              <th className="r">{per ? 'Per gm' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t: Any, i: number) => (
              <tr key={t.rid} className={t.rid === rid ? 'mine' : undefined}>
                <td className="r opacity-55">{i + 1}</td>
                <td>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">{t.name}</span>
                    <span className="text-[12px] opacity-55 tnum">{t.wins}–{t.losses}{t.ties ? `–${t.ties}` : ''}</span>
                  </div>
                </td>
                {POSITIONS.map(g => {
                  const { best: hi, worst: lo } = S.perPos[g]
                  const share = hi > lo ? (t.by[g] - lo) / (hi - lo) : 0
                  return (
                    <td key={g} className="r" title={`${ord(t.rank[g])} of ${L.nTeams} at ${g}`}
                        style={{ background: `color-mix(in oklch, var(--accent-fill) ${(share * share * 26).toFixed(1)}%, transparent)` }}>
                      {f1(t.by[g] / div)}
                    </td>
                  )
                })}
                <td className="r"><Num>{f1(t.total / div)}</Num></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <Lede className="text-[13px]">
          Only starters count, so each row adds up to the team's points for in Sleeper. The darker a cell, the better that team is at that position.
          {mine && (best.length || worst.length) ? (
            <> You are carried by <b>{best.length ? best.join(', ') : 'nothing in particular'}</b>
              {worst.length ? <> and held back at <b>{worst.join(', ')}</b></> : null}.</>
          ) : null}
        </Lede>
      </Panel>

      <Panel kicker={per ? 'Points per start' : 'Points banked in a lineup'} title="Every starter, ranked">
        <Filter value={who} onChange={setWho} options={WHO} label="Position" />
        <TableWrap>
          <thead>
            <tr>
              <th className="r">#</th><th>Player</th><th className="hidden sm:table-cell">Owner</th>
              <th className="r">Starts</th><th className="r">{per ? 'Per start' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r: Any, i: number) => (
              <tr key={r.id} className={r.rid === rid ? 'mine' : undefined}>
                <td className="r opacity-55">{i + 1}</td>
                <td>{r.player
                  ? <PlayerCell p={r.player} />
                  : <div className="flex min-w-0 flex-col"><span className="truncate font-semibold">{r.id}</span><span className="text-[12px] opacity-60">{r.pos}</span></div>}
                </td>
                <td className="hidden truncate sm:table-cell">{L.teamByRid[r.rid] ? L.teamByRid[r.rid].name : '–'}</td>
                <td className="r">{r.started}</td>
                <td className="r"><Num>{f1(per ? r.perStart : r.total)}</Num></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        {players.length > 40 && (
          <button type="button" className="self-start text-[13px] underline underline-offset-4 opacity-70" onClick={() => setFull(v => !v)}>
            {full ? 'Show the top 40' : `Show all ${players.length}`}
          </button>
        )}
      </Panel>
    </div>
  )
}
