# Changelog

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
