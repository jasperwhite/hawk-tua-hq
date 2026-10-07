# Changelog

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
