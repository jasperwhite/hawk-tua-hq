# Changelog

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
