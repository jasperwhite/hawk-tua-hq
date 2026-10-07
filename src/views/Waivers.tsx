import { useState } from 'react'

import { HQ, f0, f1, gameText, whenLong, type Any } from '@/lib/hq'
import { Chip, Filter, Lede, Num, Panel, PlayerCell, Steps, TableWrap, useView } from '@/components/hq-ui'
import { FaLine, GainLine, MoveName } from '@/views/shared'

const POS_OPTS = [['ALL', 'All'], ['QB', 'QB'], ['RB', 'RB'], ['WR', 'WR'], ['TE', 'TE'], ['K', 'K'], ['DEF', 'DEF']] as const
type Pos = (typeof POS_OPTS)[number][0]

export default function Waivers() {
  const { L, get, team } = useView()
  const [pos, setPos] = useState<Pos>('ALL')
  const plan = get('plan')
  const t = team()

  const list = (L.freeAgents as Any[])
    .filter(p => (pos === 'ALL' ? true : p.pos === pos))
    .sort((a, b) => (pos === 'ALL' ? b.vorp - a.vorp : pos === 'K' || pos === 'DEF' ? b.thisWk - a.thisWk : b.ros - a.ros))
    .slice(0, 40)

  return (
    <div className="flex flex-col gap-5">
      <Panel kicker="In this order" title="Your waiver plan">
        <Lede>
          {L.waiver.type === 'faab'
            ? <>You have <Num>${t.faabLeft}</Num> of <Num>${L.waiver.budget}</Num> FAAB left.</>
            : <>You're <Num>#{t.waiver || '–'}</Num> of {L.nTeams} on rolling waivers: use a claim and you drop to last. Free agents cost nothing, so grab them first.</>}
          {L.waiver.nextRun ? <> Next waiver run: <Num>{whenLong(L.waiver.nextRun)}</Num>.</> : null}
        </Lede>
        {plan.length
          ? <Steps items={plan.map((a: Any) => ({ what: <MoveName a={a} />, why: <><GainLine a={a} /> <FaLine a={a} /></> }))} />
          : <Lede><b>Hold.</b> No free agent improves your team enough to be worth a roster spot.</Lede>}
      </Panel>

      <Panel kicker="Ranked for your scoring" title="Free agents">
        <Filter value={pos} onChange={setPos} options={POS_OPTS} label="Position" />
        <TableWrap>
          <thead><tr>
            <th>Player</th><th className="hidden sm:table-cell">Game</th><th className="r">This wk</th><th className="r">Per wk</th>
            <th className="r hidden sm:table-cell">Value</th><th className="r hidden md:table-cell">Adds 24h</th><th>Status</th>
          </tr></thead>
          <tbody>
            {list.map(p => (
              <tr key={p.id}>
                <td><PlayerCell p={p} /></td>
                <td className="hidden text-[13px] opacity-75 sm:table-cell">{gameText(L, p)}</td>
                <td className="r"><Num>{f1(p.thisWk)}</Num></td>
                <td className="r">{f1(p.rosWk)}</td>
                <td className="r hidden sm:table-cell">{f0(p.vorp)}</td>
                <td className="r hidden md:table-cell">{L.trending[p.id] ? f0(L.trending[p.id]) : '–'}</td>
                <td>{HQ.faStatus(L, p) === 'free' ? <Chip tone="good">Free</Chip> : <Chip>Waivers</Chip>}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <Lede className="text-[13px]">Per wk is expected points for the rest of the season, byes included. Value is points above a replacement-level starter over that stretch. Adds 24h counts pickups across all Sleeper leagues.</Lede>
      </Panel>
    </div>
  )
}
