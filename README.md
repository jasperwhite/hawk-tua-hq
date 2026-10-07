# Hawk Tua HQ

A free fantasy football assistant for one Sleeper league — **NFL Casuals**
(`1312056164149641216`), team **Hawk Tua**. It makes the weekly calls (start/sit,
waivers, trades) and ranks every player **by this league's scoring**, not standard
half-PPR.

Modelled on the reference site FF Front Office (fantasy-football-bzo.pages.dev):
verdicts first, one-line reasons, tabs for the working.

## Status

**v0.2.0 — Opaline redesign, deploying to GitHub Pages.** Every tab renders against
the live league with no console errors, in light and dark mode, at phone and desktop
width. Live link: see *Hosting*.

## How to run it

React + Vite + Tailwind, with the Opaline liquid-glass components (shadcn registry
`@opaline`). First time only: `npm install`. Then:

```bash
cd ~/Personal/"Fantasy Football" && npm run dev
```

Open the local address it prints. `npm run build` type-checks and writes the static
site to `dist/`. **Refresh** (top right) reloads the league. The team dropdown shows any
other team's view. *Use a different league* (footer) takes any Sleeper league ID.

Liquid-glass refraction only shows in Chrome, Edge and other Chromium browsers. Safari
and Firefox get frosted glass instead, which is fine.

## Files

| File | What it does |
|---|---|
| `src/lib/engine.js` | All data and all the maths, no UI. It loads the league, re-scores every projection with the league's settings, works out rest-of-season value, and runs the lineup optimiser, waiver plan and trade search. It also runs under Node (`require('./src/lib/engine.js')`) for testing. |
| `src/lib/hq.ts` | Bridge to the engine, version number, formatters, and the per-team view that caches each engine call. |
| `src/App.tsx` | Shell: loading and error states, masthead, season ruler, tab bar, footer. |
| `src/views/*.tsx` | One file per tab: Brief, Lineup, Waivers, Trades, Players, Team, News. |
| `src/components/hq-ui.tsx` | Shared pieces: panels, tables, chips, steps, bars, filters. |
| `src/components/ui/opaline/` | The Opaline components, as installed by shadcn. Edit in place if needed. |
| `src/app.css` | The app's tokens (orange accent, wallpaper, table styles) for light and dark. |
| `.github/workflows/pages.yml` | Builds and publishes to GitHub Pages on every push to `main`. |

## How the calls are made

- **Scoring.** Each player's projected stat line is multiplied by this league's
  `scoring_settings`. That includes **1 pt per receiving first down**, 4-pt passing
  TDs, kicker distance points and defensive three-and-outs. Checked against Sleeper's
  actual points: 147 of 147 matched.
- **Rest-of-season value.** The next four weeks of projections, then a blended rate
  for the remaining weeks: 60% near-term, 25% season so far, 15% preseason. Byes count
  as zero. **Value** is points above a replacement-level starter.
- **Lineup.** Fill dedicated slots, then flex, using this week's projection.
  Questionable players are marked down 15% and doubtful 75%. Players whose game has
  started are locked.
- **Waivers.** For each free agent, the best drop and the gain to the starting lineup
  (this week plus the rest of the season). On rolling waivers a claim costs about
  3 points, because you drop to last; free agents cost nothing. Up to three moves.
- **Trades.** Every 1-for-1, 2-for-1 and 1-for-2 swap with every team, judged by what
  it does to **both** lineups. A deal shows only if the other team improves too and
  FantasyCalc market values are close.
- **Win chance.** Normal approximation on both teams' best lineups.

## Data sources (all free, no keys)

Sleeper (league, rosters, matchups, projections, stats, schedule), FantasyCalc (market
values), ESPN (kickoff times, RotoWire player notes). Endpoint details and quirks:
`~/Work/Claude/docs/tooling/sleeper.md`.

## Hosting

GitHub Pages, from the public repo `jasperwhite/hawk-tua-hq`. Every push to `main`
rebuilds and republishes. `robots.txt` and a `noindex` meta keep it out of search
results, so it's link-only in practice, but the link itself isn't private.

A claude.ai Artifact **can't** run it, because the Artifact sandbox blocks calls to
outside sites.

## Ideas not built

- A ledger that grades last week's calls against what actually happened.
- A Claude skill that reads the news and writes the weekly brief in plain English.
