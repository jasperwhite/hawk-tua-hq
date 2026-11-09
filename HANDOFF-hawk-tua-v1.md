# Handoff v1 (2026-11-09) — League standings and Hawk Tua HQ

_Written for moving this to a new Mac and a new Claude account. Don't edit this file in
place — the next one is `HANDOFF-hawk-tua-v2.md`._

## What it is

Two things for one Sleeper league — **NFL Casuals** (`1312056164149641216`), team
**Hawk Tua** (roster 4) — in one repo:

| Part | File | What it is |
|---|---|---|
| **League standings** | `public/standings.html` | The minimal one. Black-and-white Helvetica tables for telling good from lucky. One HTML file, no build step, all live from Sleeper. |
| Hawk Tua HQ | `src/` | The weekly assistant: start/sit, waivers, trades, defences. React + Vite. |
| NFL scoring leaders | `public/leaders.html` | Every player ranked by this league's scoring. |
| Research | `research/` | The defence-points model (`def-audit/`) and the week 9 trade offers page (`trades-wk9/`). |

`README.md` covers the HQ in full; `CHANGELOG.md` has every version.

## The standings page

Seven sections, top to bottom:

| Section | Shows |
|---|---|
| Schedule comparison | Each team's record on every other team's schedule, with a Luck column and an Average row |
| League play record | Each team against the whole league, every week |
| Scoring form | Rolling three-week average per team |
| Schedule ahead | Every remaining opponent, by where it ranks in league play |
| Against projection | Starters' score against Sleeper's projection, re-scored with this league's rules |
| Projected winners | Favourite or underdog each week, against the result |
| Draft board | Every pick against the players taken around it at its position |

`?league=<id>` and `?team=<roster id>` point it at another league or team. It also exports
1080×1440 cards for posting to the group chat.

One thing the page knows that the HQ doesn't: **Sleeper's projected receiving first downs
are a placeholder** (yards ÷ 10, about 2.4× the real rate). The page corrects it; the HQ
still uses the raw figure, so it overrates pass-catchers.

## Running it

The standings page needs nothing — double-click it and it loads live from Sleeper (checked
9 Nov 2026). Or through a local server:

```bash
cd public && python3 -m http.server 8000   # then http://localhost:8000/standings.html
```

The HQ needs Node: `npm install` once, then `npm run dev`. `.claude/launch.json` already
has a `hq-dev` entry on port 5174.

## Hosting — not up to date

The repo is public at `github.com/jasperwhite/hawk-tua-hq` and GitHub Pages republishes on
every push to `main`. **Nothing since 14 Oct 2026 was pushed** — the standings page
and everything after it. So on 9 Nov 2026 the HQ was live at
https://jasperwhite.github.io/hawk-tua-hq/ but `/standings.html` was a 404. A
`git push` publishes it.

## Gotchas

- Sleeper's endpoints and quirks are written up in the knowledge base:
  `docs/tooling/sleeper.md`.
- A claude.ai Artifact can't run any of this — its sandbox blocks calls to Sleeper.
- The defence values come from ESPN betting lines; finished weeks are cached in the
  browser's `localStorage`, so a new browser rebuilds them on first load.

## Status

v0.4.1 plus the standings work through week 9 (Oct–Nov 2026). Everything committed;
nothing since 14 Oct pushed to GitHub.
