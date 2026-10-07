import { HQ, f0, f1, ord, type Any } from '@/lib/hq'
import { Bars, Chip, Form, Lede, Num, Panel, PlayerCell, TableWrap, useView } from '@/components/hq-ui'

const GROUPS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

export default function Team() {
  const { L, P, rid, get, team } = useView()
  const t = team()
  const ranks = get('ranks')
  const mine = ranks[rid]
  const byes: Any[] = get('byes')
  const standings = L.teams.slice().sort((a: Any, b: Any) => a.rank - b.rank)
  const roster = HQ.activeIds(t).concat(t.reserve).map(P).filter(Boolean).sort((a: Any, b: Any) => b.vorp - a.vorp)
  const onIR = (p: Any) => t.reserve.includes(p.id)

  return (
    <div className="flex flex-col gap-5">
      <Panel kicker="Starters vs the league, rest of season" title="Where you're strong">
        <Bars rows={GROUPS.map(g => ({
          label: g, value: L.nTeams - mine[g].rank + 1, max: L.nTeams,
          right: <><Num>{ord(mine[g].rank)}</Num> <span className="opacity-55">of {L.nTeams}</span></>,
        }))} />
        <Lede>Your best lineup projects <Num>{f1(mine.total.pts)}</Num> a week for the rest of the season, <Num>{ord(mine.total.rank)}</Num> in the league.</Lede>
      </Panel>

      <Panel kicker="By value" title="Roster">
        <TableWrap>
          <thead><tr><th>Player</th><th className="r">Bye</th><th className="r">This wk</th><th className="r">Per wk</th><th className="r">Value</th><th className="hidden sm:table-cell">Last 3</th></tr></thead>
          <tbody>
            {roster.map((p: Any) => (
              <tr key={p.id} className={onIR(p) ? 'dim' : undefined}>
                <td><PlayerCell p={p} extra={onIR(p) ? <Chip>IR slot</Chip> : null} /></td>
                <td className="r">{L.byeWeek[p.team] || '–'}</td>
                <td className="r">{f1(p.thisWk)}</td>
                <td className="r"><Num>{f1(p.rosWk)}</Num></td>
                <td className="r">{f0(p.vorp)}</td>
                <td className="hidden sm:table-cell"><Form p={p} /></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Panel>

      <Panel kicker="Your starters" title="Byes ahead">
        {byes.length ? (
          <TableWrap>
            <tbody>
              {byes.map(b => (
                <tr key={b.week}>
                  <td className="slot">WK {b.week}</td>
                  <td>{b.out.map((p: Any) => p.name).join(', ')}</td>
                  <td className="r">{b.out.length > 1 && <Chip tone="bad">{b.out.length} out</Chip>}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        ) : <Lede>None of your starters have a bye left.</Lede>}
      </Panel>

      <Panel kicker={`Top ${L.league.settings.playoff_teams || 4} make the playoffs`} title="Standings">
        <TableWrap>
          <thead><tr>
            <th className="r">#</th><th>Team</th><th className="r">W–L</th><th className="r">Pts for</th>
            <th className="r hidden sm:table-cell">Pts against</th><th className="r hidden sm:table-cell">Strength</th><th className="r hidden md:table-cell">Waiver</th>
          </tr></thead>
          <tbody>
            {standings.map((s: Any) => (
              <tr key={s.rid} className={s.rid === rid ? 'mine' : undefined}>
                <td className="r opacity-55">{s.rank}</td>
                <td><div className="flex min-w-0 flex-col"><span className="truncate font-semibold">{s.name}</span><span className="text-[12px] opacity-55">{s.user}</span></div></td>
                <td className="r">{s.wins}–{s.losses}{s.ties ? `–${s.ties}` : ''}</td>
                <td className="r"><Num>{f1(s.pf)}</Num></td>
                <td className="r hidden sm:table-cell">{f1(s.pa)}</td>
                <td className="r hidden sm:table-cell">{ord(ranks[s.rid].total.rank)}</td>
                <td className="r hidden md:table-cell">{L.waiver.type === 'faab' ? `$${s.faabLeft}` : `#${s.waiver || '–'}`}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <Lede className="text-[13px]">Strength ranks each team's best lineup for the rest of the season.</Lede>
      </Panel>
    </div>
  )
}
