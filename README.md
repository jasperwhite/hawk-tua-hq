# Hawk Tua HQ

A free fantasy football assistant for one Sleeper league — **NFL Casuals**
(`1312056164149641216`), team **Hawk Tua**. It makes the weekly calls (start/sit,
waivers, trades) and ranks every player **by this league's scoring**, not standard
half-PPR.

Modelled on the reference site FF Front Office (fantasy-football-bzo.pages.dev):
verdicts first, one-line reasons, tabs for the working.

**Jasper's shorthand:** in his trade lists, "Love" or "J Love" always means **Jeremiyah Love** (RB, ARI), never Jordan Love (QB, also on his roster).

## Status

**Two lines of work joined here on 9 Nov 2026.** The work Mac's copy (v0.4.1, Opaline,
plus the league standings page) was merged with this Mac's copy (the design-system
rebuild of the shell and Players). Both are kept.

**Trade Desk** (`public/trade-desk.html`) — moved out of `research/` and onto the site
(11 Nov 2026). It's a *baked* page: `research/trade-desk/build_data.py` fetches Sleeper and
FantasyCalc, then `build.py` injects `data.json` into `template.html`. It makes no live calls,
so **re-run both and re-copy into `public/` to refresh it** — the header says which week it
holds. Reachable from the left rail under Pages.

**League standings** (`public/standings.html`) — the minimal one, rebuilt in System Jasper
(v0.5.0). One HTML file, no build, loads live from Sleeper every time it opens — reload or
press `R` for the latest week. See `HANDOFF-hawk-tua-v1.md`.

**Hawk Tua HQ** — the shell and the Players tab are rebuilt on Jasper's design system
(`~/Claude/Design System`, via `/design`). Hawk Tua HQ is its first consumer and its
first real test.

- **Shell:** the `app-shell` skeleton — left rail for the eight sections, a centre column
  that scrolls on its own, right rail for the standing and the season. Theme switch at the
  foot of the left rail (System · Light · Dark). Shortcuts: `[` `]` rails, `T` theme,
  `/` search, `?` legend, `Esc` close. Skip link first. Below 992px the rails become
  overlays and a 40px bottom bar takes over navigation.
- **Players:** rebuilt on `ds-ui`. The accent has exactly one job on that screen — rows
  you own. Nothing else is coloured.
- **The other seven tabs still render on the Opaline glass components**, inside the new
  shell. That is deliberate: this is a pilot on one view, not a migration.

### Where the tokens come from

| File | What it is |
|---|---|
| `src/tokens.css` | a **vendored copy** of the design system's tokens. A Vite build has to be self-contained, so it can't link the shared file. Re-copy when the original changes. |
| `src/ds.css` | the `app-shell` block's CSS, **ported**. The copied section is marked; this app's own additions sit below the marker. Fix the block and re-port — never patch the copy. |

This project is on the `Used by` table in that repo's `DESIGN.md`, so a token change has
somewhere to be worked through.

### Known, not fixed

- The intro paragraph on Players still takes the top ~130px of a phone screen.
- The week ruler in the right rail reads as a grid of numbers rather than a timeline.
- Tailwind utilities sit in a layer, so they can't override `ds.css` classes — layout
  workarounds in the shell exist for that reason.
- ESPN scoreboard fetches are blocked by CORS from a localhost origin; the deployed build
  is unaffected and the Sleeper data loads either way.

Moving it to a new Mac: `HANDOFF-hawk-tua-v1.md`, and paste `PROMPT for new Claude.md`
into the new Claude. Pushed 9 Nov 2026: the standings page is live at
https://jasperwhite.github.io/hawk-tua-hq/standings.html.

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
| `src/views/*.tsx` | One file per tab: Brief, Lineup, Waivers, Defences, Trades, Players, Team, News. |
| `src/components/hq-ui.tsx` | Shared pieces: panels, tables, chips, steps, bars, filters. |
| `src/components/ui/opaline/` | The Opaline components, as installed by shadcn. Edit in place if needed. |
| `src/app.css` | The app's tokens (orange accent, wallpaper, table styles) for light and dark. |
| `public/leaders.html` | Standalone page at `/leaders.html`: every NFL player ranked by points under this league's scoring. Plain HTML and CSS, no build step, reads `public/nfl-players.json` for names. |
| `public/standings.html` | Standalone page at `/standings.html`: schedule comparison, all-play record and actual vs projected, all live from Sleeper. Plain HTML, no build step. `?league=` and `?team=` pick another league or team. |
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
- **Defences.** League points = 27.75 − 0.819 × what the opponent is expected to score,
  from ESPN's betting line (`research/def-audit/`). Without a line, Sleeper's projected
  points allowed stands in. The Defence tab predicts future lines from team ratings: a
  ridge regression on every line this season (recent weeks weighted up) plus 2025 weeks
  10–18 at a fifth of the weight. Finished weeks' lines are cached in `localStorage`.
  That board loads in the background after the league, then sets every defence's Value
  and Per wk, so all tabs agree.
- **Win chance.** Normal approximation on both teams' best lineups.

## Data sources (all free, no keys)

Sleeper (league, rosters, matchups, projections, stats, schedule), FantasyCalc (market
values), ESPN (kickoff times, betting lines, RotoWire player notes). Endpoint details and quirks:
`~/Work/Claude/docs/tooling/sleeper.md`.

## Trade Desk (Artifact)

A separate one-page trade calculator: https://claude.ai/artifact/Gp5ECJwLKvBXZmEUKgivfA.
Source is `research/trade-desk/`. Pick players on both sides, and it shows both starting
lineups before and after on **Shrunk Form**, plus FantasyCalc's package-adjusted ratio and a
rough chance-they-accept. Add a third team for a 3-way (tap a player again to change where he goes). Other teams keep their current starters unless a newcomer is 2+ points a week better, and the chance they accept weighs what the deal is worth to their team (lineup change plus bench depth over free agents, scaled by how often a backup plays) equally with the FantasyCalc ratio. Below that: the league table for any range of weeks (with
all-play record), and every team's best lineup ranked by Shrunk Form, last 3, last 5,
season average, the chosen week range or next week's bias-corrected projection. Shrunk Form is
games ÷ (games + 7) × recent form, with the rest taken from the FantasyCalc **full-PPR** value (this league's 1 pt per receiving first
down makes WRs and TEs score like full PPR), which is
turned into points on one curve across all positions. The data is a snapshot. To refresh it,
run `python3 build_data.py && python3 build.py` (this fetches fresh data from Sleeper and
FantasyCalc), then republish.

## Hosting

GitHub Pages, from the public repo `jasperwhite/hawk-tua-hq`. Every push to `main`
rebuilds and republishes. `robots.txt` and a `noindex` meta keep it out of search
results, so it's link-only in practice, but the link itself isn't private.

A claude.ai Artifact **can't** run it, because the Artifact sandbox blocks calls to
outside sites.

## Ideas not built

- A ledger that grades last week's calls against what actually happened.
- A Claude skill that reads the news and writes the weekly brief in plain English.
