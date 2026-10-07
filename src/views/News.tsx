import { useEffect, useState } from 'react'

import { HQ, ago, type Any } from '@/lib/hq'
import { Kicker, Lede, Panel, PlayerCell, TableWrap, useView } from '@/components/hq-ui'

type Note = { player: string; headline: string; story: string; at: number }

/* Kept for the session so switching tabs doesn't refetch. Keyed by league + team. */
const cache = new Map<string, Promise<Note[]>>()

function trimStory(s?: string) {
  if (!s) return ''
  const t = s.replace(/<[^>]+>/g, '').trim()
  const cut = t.split(/(?<=\.)\s/).slice(0, 2).join(' ')
  return cut.length > 320 ? cut.slice(0, 317) + '…' : cut
}

function loadNotes(L: Any, players: Any[]): Promise<Note[]> {
  const targets = players.filter(p => L.market[p.id]?.espnId)
  return Promise.all(targets.map(p =>
    fetch(`https://site.api.espn.com/apis/fantasy/v2/games/ffl/news/players?limit=8&playerId=${L.market[p.id].espnId}`)
      .then(r => (r.ok ? r.json() : null)).catch(() => null)
      .then(d => ((d && d.feed) || []).filter((x: Any) => x.type === 'Rotowire').slice(0, 3)
        .map((x: Any) => ({ player: p.name, headline: x.headline, story: trimStory(x.story), at: Date.parse(x.published) }))),
  )).then(res => {
    const seen = new Set<string>()
    return res.flat().filter(x => x.headline && !seen.has(x.headline) && seen.add(x.headline)).sort((a, b) => b.at - a.at)
  })
}

export default function News() {
  const { L, P, rid, team } = useView()
  const t = team()
  const players = HQ.activeIds(t).concat(t.reserve).map(P).filter(Boolean)
  const injured = players.filter((p: Any) => p.inj)
  const key = `${L.leagueId}:${rid}:${L.loadedAt}`
  const [notes, setNotes] = useState<{ key: string; items: Note[] } | null>(null)

  useEffect(() => {
    let live = true
    if (!cache.has(key)) cache.set(key, loadNotes(L, players))
    cache.get(key)!.then(items => { if (live) setNotes({ key, items }) })
    return () => { live = false }
    // players is derived from key's inputs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const items = notes?.key === key ? notes.items : null

  return (
    <div className="flex flex-col gap-5">
      <Panel kicker="Your roster" title="Injury report">
        {injured.length ? (
          <TableWrap>
            <tbody>
              {injured.map((p: Any) => (
                <tr key={p.id}><td><PlayerCell p={p} /></td><td className="text-[13px] opacity-75">{[p.inj, p.injBody, p.injNotes].filter(Boolean).join(' · ')}</td></tr>
              ))}
            </tbody>
          </TableWrap>
        ) : <Lede>Nobody on your roster carries an injury tag.</Lede>}
      </Panel>

      <Panel kicker="RotoWire via ESPN" title="Player notes">
        {!items ? <Lede>Fetching the latest notes on your players…</Lede>
          : !items.length ? <Lede>No recent notes on your players.</Lede>
          : (
            <div className="flex flex-col">
              {items.slice(0, 30).map((n, i) => (
                <article key={i} className="flex flex-col gap-1 border-b border-[var(--hair)] py-3.5 first:pt-0 last:border-0">
                  <Kicker>{n.player} · {ago(n.at)}</Kicker>
                  <h3 className="text-[16px] leading-snug font-semibold tracking-[-0.015em] text-balance">{n.headline}</h3>
                  {n.story && <p className="max-w-[68ch] text-[14px] leading-relaxed opacity-75">{n.story}</p>}
                </article>
              ))}
            </div>
          )}
      </Panel>
    </div>
  )
}
