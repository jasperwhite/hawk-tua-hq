# Changelog

## 0.4.1 — 2026-10-20
New standalone page, **`/standings.html`**: three tables for telling good from lucky, plain
Helvetica, black and white. Modelled on Dynasty Daddy's league standings.

- **Schedule comparison.** Every team's scores run against every other team's schedule.
  The week a team would meet itself, it plays the schedule's owner instead. A **Luck**
  column is real wins minus the average across all schedules.
  An **Average** row under the grid gives the record a typical team would post on each
  schedule (added after the week 7 refresh).
- **League play record.** Every team against all nine others, every week, shaded white to
  black by how much of the league it would have beaten.
- **Against projection.** Each week, what a team's starters scored against what Sleeper
  projected for those same starters, scored with this league's rules. Tap a team for the
  projected and scored numbers.

**Sleeper's projected receiving first downs are a placeholder:** always receiving yards ÷
10, about 2.4 times the real rate (yards ÷ 24 this season). With 1 pt a first down, that
put every team 20 points a week under projection. The page replaces it with the real rate
by position. **The main app still uses the raw figure**, so it overrates pass-catchers.

Same day, second pass:
- Green and red washes instead of black and white, as on Dynasty Daddy: a winning record
  is green, a losing one red, stronger the further from even.
- Each team's Sleeper photo next to its name, and above each schedule column.
- Schedule comparison has three numbered steps on how to read it, plus a line that spells
  out whichever square you hover or tap ("Hawk Tua, playing Bill Belichick's schedule,
  would be 5-1"). It opens on your kindest schedule.
- Totals, Win %, Luck and the projection sums stay pinned to the right when a table
  scrolls sideways. Weeks not yet played aren't shown.
- Your team is marked with a YOU tag instead of an arrow.

**Schedule ahead** (fourth table): every team's remaining opponents, each coloured by
that opponent's own league play rank (#1 deepest red, #10 deepest green), whoever's
schedule it's on. Sorted hardest first by opponents' average league play win %, with
their average rank alongside. Hawk Tua has the second-hardest run (51.2%). An earlier
version coloured opponents by above or below the team itself; Jasper didn't want that.

**Scoring form**: every team's rolling three-week scoring average on one chart, one
colour each, with a colour key underneath (latest average, face, name; highest first).
Starts at week 3, the first week with three scores behind it. Hover or tap a line or a
name to pick it out; your team's line is thicker on the web. Replaced a first pass of one
small chart per team, then one with labels at the line ends.

**Draft board**: the whole draft as a grid, one column per team in draft order, one row
per round, each pick with headshot, pick number, the position rank it was drafted at,
points so far and its position rank now. Coloured by its points against the average of
the same-position players drafted around it (two either side), on a log scale: double is
deepest green, half is deepest red. A first pass measured each pick against the Nth-best
scorer at its drafted rank, but that turns most picks red because the best scorers so far
are partly luck. Bottom row is each team's Return: its picks' points against their peers'.
Points are summed from `/v1/stats/nfl/regular/{season}/{w}` with the league's scoring and
cached per finished week.

**Projected winners**: for every team and week, whether the projection had it as favourite
or underdog (higher projected total for the starters who played) and whether it won. Pale
squares are games the projection called, deep ones are misses; a last row counts the calls
right per week. Weeks 1–6: 17 of 30, 9 of 18 when the projected gap was under 10 points and
8 of 12 when it was wider. Filled in by `renderProj` once the projections load, so it shares
the cache. Hawk Tua was favoured three times and lost all three.

Export cards: `standings.html?export=swap|allplay|form|ahead|proj|calls|draft` draws one table on a 1080×1440
card with the same header on each (league · season · weeks, title, one-line subtitle), a
key underneath and no YOU tag. Screenshot at 2x with headless Chrome:
`Google Chrome --headless=new --window-size=1080,1440 --force-device-scale-factor=2
--virtual-time-budget=40000 --screenshot=out.png "<url>?export=swap"`.

League play matches Dynasty Daddy exactly. Schedule comparison matches 84 of 100 cells;
the rest differ only in the week a team meets itself, where Dynasty Daddy does something
undocumented.

## 0.4.0 — 2026-10-19
New standalone page, **`/leaders.html`**: every NFL player this season ranked by what
they scored under this league's rules.

- Filter by position, rank by total or per game, search by name.
- A **vs standard** column shows what this league's scoring is worth to each player
  against half-PPR — Jaxon Smith-Njigba is +29.0, Josh Allen is −4.0.
- Plain white, no glass, its own URL.

**Totals come from the weekly stat lines, not Sleeper's season aggregate.** That
aggregate lags mid-week — on 19 Oct it had Jaxon Smith-Njigba's week 6 but not Josh
Allen's, so a leaderboard built on it mixes five-game and six-game totals. The page
sums each week instead and keeps finished weeks in localStorage, so only the live
week is refetched.

## 0.3.3 — 2026-10-14
Between the last game of a week and the waiver run, every free agent shows as
**Waivers**, bye-week teams included.

**Why:** 0.3.1 marked players from bye-week teams as free, and told Jasper to add the
Chiefs straight away. Sleeper wanted a claim. The league's history agrees: no one has
added a free agent in that gap all season.

## 0.3.2 — 2026-10-14
Defences' Value and Per wk now come from the betting lines on every tab, not just the
Defence tab.

**Why:** the Waivers tab rated the Chiefs well above the Steelers (Value 14 vs 6) while
the Defence tab had the Steelers ahead, because one used Sleeper's projections and the
other the lines. The lines ranked defences better in the audit, so they win. The board
loads in the background after the league does, and the numbers switch over when it's in.

## 0.3.1 — 2026-10-14
Waiver day shows the week that's coming, not the one just played.

- The tool moves to the next week as soon as the last game ends, instead of a day later.
- **Next waiver run** is the weekly run (Wednesday 6:14pm here), not the last one-off claim
  on a dropped player.
- Free agents who played since the last run show as **Waivers** until it goes through;
  players whose team was on bye show as **Free**, so you can add them straight away.

**Why:** on Wednesday afternoon, the moment waiver claims matter, the tool was still on
week 5: a finished game at 0% to win, Saturday as the next run, and everyone marked free.
Sleeper moves `week` on after Monday's game but `display_week` a day later; the tool read
the late one.

## 0.3.0 — 2026-10-07
A **Defence** tab, and every defence projection now comes from the betting line.

- **This week:** start or stream, in one sentence, with the gap in points and whether
  the pick-up is a free agent or a waiver claim. Flags a playoff stash when one is worth it.
- **Week by week, to week 17:** your defence against the best one nobody owns. Stream at
  a 2-point gap, 4 if it takes a waiver claim.
- **Rest-of-season rankings:** every defence's points a game for the rest of the season,
  the next three weeks and the playoffs, with byes and who owns it.
- **Good, or lucky?** What each defence has scored against what its lines said it would,
  and whether it has faced soft or tough offences.
- Lineup, Waivers and the Brief use the same method for defences: league points =
  27.75 − 0.819 × what the opponent is expected to score. Weeks without a line use
  Sleeper's projected points allowed. The three-and-out patch now uses the league
  average (2.2 and 0.65 in week 1) and no longer double-counts pick-sixes.
- Cancelled games are skipped, so a moved game can't count twice.
- Eight tabs, so each is a little narrower on a phone.

**Why:** the DEF audit found the betting line ranks defences better than Sleeper's
projection, and that a defence's own three-and-out rate made the order worse. Future
weeks have no line yet, so team ratings fitted to every line this season (plus the
second half of last season, lightly) predict one. Tested on next week's real lines it
missed by 1.8 points on average, against 2.7 for guessing the league average. Lines for
finished weeks are kept on the device, so after the first visit the tab only fetches
the new week.


## 0.2.0 — 2026-10-07
Redesigned in Opaline's liquid-glass style and rebuilt as a React app. Same engine,
same calls; what changed is how it looks and moves.

- Glass cards over a field-and-yard-lines backdrop, so the refraction has something to
  bend. Orange stays the one accent, on numbers, times and the active tab.
- A floating tab bar at the bottom with seven icon tabs, sized to fit a phone.
- Team picker, refresh and the league form are glass controls. A toast confirms a
  refresh.
- Rankings is now **Players**. The trade builder jumps to the deal when you tap
  *Try it*, and its verdict stays pinned while you tick players.
- Set up to publish to GitHub Pages on every push, with search engines told to stay out.

**Why:** Jasper asked for the Opaline registry as the design system. Its components are
React, so the vanilla page was rebuilt in React with Vite rather than imitated by hand.
The engine is unchanged and still runs under Node for testing.

## 0.1.0 — 2026-10-07
First working version. Seven tabs:

- **Brief:** the matchup and win chance, four calls (lineup, waivers, trade, watch), how
  the league's scoring differs from standard, and points left on the bench.
- **Lineup:** the best lineup, with kickoff times in local time.
- **Waivers:** a waiver plan and ranked free agents.
- **Trades:** trade ideas plus a trade builder.
- **Rankings:** player values with market buy/sell flags.
- **Team:** positional strength, roster, byes ahead and standings.
- **News:** the injury report and RotoWire notes.

**Why:** standard rankings undervalue receivers badly in this league. Receiving first
downs are worth a full point, so WR and TE score more than 50% above half-PPR. Free
tools don't account for that.
