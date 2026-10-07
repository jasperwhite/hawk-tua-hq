import { HQ, POS_NAME, f1, gameText, sgn, whyOut, type Any } from '@/lib/hq'
import { Chip, Form, Lede, Num, Panel, PlayerCell, Steps, TableWrap, useView } from '@/components/hq-ui'

export default function Lineup() {
  const { L, P, get, team } = useView()
  const lc = get('lineup')
  const plan = get('plan')
  const curSet = new Set(lc.cur.filter(Boolean))
  const optSet = new Set(lc.opt.filter(Boolean))
  const closeIds = new Set(lc.close.map((c: Any) => c.start))
  const slotName = (s: string) => HQ.SLOT_LABEL[s] || s

  const holes = lc.holes.map((h: Any, i: number) => {
    const fix = plan.find((a: Any) => HQ.eligible(P(a.add), h.slot))
    const what = h.id ? `${P(h.id).name} ${whyOut(L, P(h.id))}` : `Your ${POS_NAME[h.slot] || h.slot} spot is empty`
    return (
      <Lede key={i}>
        <b>{what}.</b> Nobody on your bench can cover it.{' '}
        {fix ? <>Add <b>{P(fix.add).name}</b>{fix.drop ? ` (drop ${P(fix.drop).name})` : ''} to start there: <Num>{f1(P(fix.add).thisWk)}</Num> projected.</> : 'Nobody on the wire helps either.'}
      </Lede>
    )
  })

  const row = (slot: string, id: string | null, i: number) => {
    if (!id) return <tr key={'s' + i}><td className="slot">{slotName(slot)}</td><td colSpan={4} className="opacity-60">Nobody available</td></tr>
    const p = P(id)
    const tags = []
    if (lc.locked(id)) tags.push(<Chip key="l">Locked</Chip>)
    else if (!curSet.has(id)) tags.push(<Chip key="i" tone="good">In</Chip>)
    if (closeIds.has(id)) tags.push(<Chip key="c" tone="warn">Close</Chip>)
    return (
      <tr key={'s' + i}>
        <td className="slot">{slotName(slot)}</td>
        <td><PlayerCell p={p} extra={tags} /></td>
        <td className="hidden text-[13px] opacity-75 sm:table-cell">{gameText(L, p)}</td>
        <td className="hidden md:table-cell"><Form p={p} /></td>
        <td className="r"><Num>{f1(lc.pts(p))}</Num></td>
      </tr>
    )
  }
  const bench = lc.bench.map(P).sort((a: Any, b: Any) => lc.pts(b) - lc.pts(a))
  const reserve = team().reserve.map(P).filter(Boolean)

  return (
    <div className="flex flex-col gap-5">
      <Panel kicker={`Week ${L.week}`} title="Lineup" aside={<>Best <Num>{f1(lc.optTotal)}</Num> · as set <Num>{f1(lc.curTotal)}</Num></>}>
        {holes}
        {lc.swaps.length
          ? <Steps items={lc.swaps.map((s: Any) => ({
              what: <>Start {P(s.start).name}{s.sit ? `, bench ${P(s.sit).name}` : ''}</>,
              why: <><Num>{sgn(s.gain)}</Num> projected. In Sleeper: tap {s.sit ? P(s.sit).short : 'the empty slot'}, then pick {P(s.start).short}.</>,
            }))} />
          : <Lede><b>No changes.</b> The lineup you have set is the best one on your roster.</Lede>}
      </Panel>

      <Panel>
        <TableWrap>
          <thead><tr><th>Slot</th><th>Player</th><th className="hidden sm:table-cell">Game · your time</th><th className="hidden md:table-cell">Last 3</th><th className="r">Proj</th></tr></thead>
          <tbody>
            {lc.slots.map((s: string, i: number) => row(s, lc.opt[i], i))}
            {bench.map((p: Any) => (
              <tr key={p.id} className="dim">
                <td className="slot">BN</td>
                <td><PlayerCell p={p} extra={curSet.has(p.id) && !optSet.has(p.id) ? <Chip tone="muted">Out</Chip> : null} /></td>
                <td className="hidden text-[13px] sm:table-cell">{gameText(L, p)}</td>
                <td className="hidden md:table-cell"><Form p={p} /></td>
                <td className="r">{f1(lc.pts(p))}</td>
              </tr>
            ))}
            {reserve.map((p: Any) => (
              <tr key={p.id} className="dim">
                <td className="slot">IR</td><td><PlayerCell p={p} /></td>
                <td className="hidden text-[13px] sm:table-cell">{gameText(L, p)}</td>
                <td className="hidden md:table-cell"><Form p={p} /></td><td className="r">–</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <Lede className="text-[13px]">Projections are Sleeper's stat lines, re-scored with your league's settings. Questionable players are marked down 15%, doubtful 75%. Once a game starts the player locks and shows the live score.</Lede>
      </Panel>
    </div>
  )
}
