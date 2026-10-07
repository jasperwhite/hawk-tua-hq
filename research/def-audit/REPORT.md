# DEF audit: NFL Casuals scoring

League `1312056164149641216` · back-test of 2025 (weeks 1–18) and 2026 weeks 1–4, with 2024 used for priors and as a replication check · run 7 October 2026, before week 5. Every table in full: `results.md`. Coefficients: `model.json`.

## Bottom line

1. **The league's scoring barely changes which defences are good.** Season rankings under league scoring and half-PPR correlate at 0.96 (2025) and 0.91 (2026 YTD). Three-and-outs plus fourth-down stops are 30% of league DEF points, but they work like a flat bonus of about 2.9 pts a game for every team: between-team spread 0.5 pts a game, against 1.5 for the points-allowed tiers. They explain about 11% of the week-to-week swing; points-allowed tiers explain about 46%.
2. **Sleeper and FantasyPros consensus aren't specifically wrong for this league. They're about equally rough for everyone.** Their weekly rankings track this league's points slightly better than half-PPR points (Sleeper Spearman 0.30 vs 0.25 out of sample; ECR 0.33 vs 0.28), because league scoring stretches the points-allowed tiers, the most predictable part of a DEF score.
3. **The tool's three-and-out patch doesn't help the ranking.** It adds the team's own 3&O rate, 50/50 with the league average. That fixes the level (raw re-scoring runs about 3 pts a game low), but makes the order slightly worse in every period tested. A team's 3&O rate takes about 16 games to be even half signal.
4. **The best single input is the Vegas line.** Ranking defences by the opponent's implied team total, lowest first, beat or matched every other method in every period: Spearman 0.39 out of sample against 0.31 for the tool today (paired gain +0.07, SE 0.02). Top-3 picks +1.1 pts a week, within noise (SE 1.2). Nothing added on top of the line improved out-of-sample ranking.
5. **Recommended formula:** `proj = 27.75 − 0.819 × opponent implied total`. Rank lowest implied first.

## 0. Data and checks

| Source | What | Coverage |
|---|---|---|
| Sleeper `scoring_settings` | league scoring | — |
| Sleeper weekly DEF stats | actuals; `pts_half_ppr` as the every-league baseline | 2024, 2025 wk1–18, 2026 wk1–4: 1,216 team-games |
| Sleeper weekly DEF projections | as served by Sleeper | same weeks |
| FantasyPros DST ECR | public weekly pages, `ecrData` JSON | 2025 wk1–18, 2026 wk1–4 (wk5 partial). 2024 not fetched. |
| ESPN odds | closing spread and O/U from ESPN's core odds endpoint (the scoreboard drops odds once a game is final) | every 2025–26 game; 1 missing in 2024 |
| Sleeper weekly QB stats | opponent's starting QB | 2024–2026 |

- **League scoring reproduced exactly:** 42 of 42 rostered DEF-weeks in 2026 matched Sleeper's own points.
- **Historical projections behave as pre-game numbers.** 2025 wk1–4 rows were re-saved in October 2025, but projected points allowed tracks the Vegas implied total at r = 0.97–0.99 and fits actual points allowed no better than Vegas does (0.43 vs 0.43 in 2025). A post-game overwrite would beat Vegas on actuals.
- **Projection quirks:** no `def_3_and_out` or `def_4_and_stop` keys. Projections carry `pass_int_td`, which the league scores at −2 as a QB key; for DEF it duplicates pick-sixes already in `def_td`, so re-scoring docks about 0.14 pts per DEF. A small bug in `engine.js`.
- **Big week** = 15+ league points, roughly the top quarter.

## 1. Leaderboard (points per game)

### 2025, weeks 1–18
| # | Half-PPR | ppg | League scoring | ppg | Its half-PPR rank |
|---|---|---|---|---|---|
| 1 | SEA | 10.6 | SEA | 15.6 | 1 |
| 2 | HOU | 9.8 | HOU | 15.2 | 2 |
| 3 | MIN | 8.8 | DEN | 13.2 | 5 |
| 4 | JAX | 8.7 | JAX | 12.6 | 4 |
| 5 | DEN | 8.6 | LAR | 12.6 | 8 |
| 6 | CLE | 8.5 | PHI | 12.2 | 7 |
| 7 | PHI | 8.4 | MIN | 12.2 | 3 |
| 8 | LAR | 8.4 | NE | 11.8 | 10 |
| 9 | PIT | 8.3 | CLE | 11.6 | 6 |
| 10 | NE | 7.6 | LAC | 10.5 | 15 |

Rank correlation 0.96, mean move 1.9 places. Biggest movers: GB 30th → 23rd, KC 22nd → 16th, LAC 15th → 10th, MIN 3rd → 7th. KC and GB rise on fourth-down stops and points-allowed tiers; MIN and CLE fall because they relied on splash plays.

### 2026, weeks 1–4 (small sample)
| # | Half-PPR | ppg | League scoring | ppg | Its half-PPR rank |
|---|---|---|---|---|---|
| 1 | MIN | 13.5 | MIN | 18.5 | 1 |
| 2 | LV | 12.0 | JAX | 13.5 | 3 |
| 3 | JAX | 10.8 | LV | 13.5 | 2 |
| 4 | PIT | 10.8 | CHI | 13.2 | 8 |
| 5 | CIN | 10.2 | SEA | 13.2 | 6 |
| 6 | SEA | 8.8 | PIT | 11.8 | 4 |
| 7 | NE | 8.5 | CIN | 11.2 | 5 |
| 8 | CHI | 8.2 | NYG | 11.0 | 10 |
| 9 | CAR | 8.0 | NE | 10.8 | 7 |
| 10 | NYG | 7.8 | CAR | 10.5 | 9 |

Rank correlation 0.91. Biggest movers: ATL 25th → 12th, LAC 11th → 20th, TB 19th → 13th, DET 23rd → 29th.

### Where league DEF points come from
| Source | 2025 share | Per team-game | 2026 share | Share of week-to-week variance (2025) |
|---|---|---|---|---|
| Three-and-outs + 4th-down stops | 30% | 2.85 | 31% | 11% |
| Points-allowed tiers (net) | 10% | 0.94 | 8% | 46% |
| Sacks | 25% | 2.37 | 25% | 12% |
| INT + fumble recoveries | 23% | 2.20 | 26% | 17% |
| Defensive / ST TDs | 8% | 0.79 | 5% | 13% |
| Other | 4% | 0.40 | 5% | 3% |

## 2. Is the league-specific part predictable?

Correlation across 32 teams of per-game rates; inside about ±0.35 is noise.

| Stat | 2025 H1 vs H2 | 2024 vs 2025 | 2025 vs 2026 wk1–4 | Games before rate is 50% signal |
|---|---|---|---|---|
| Three-and-outs | 0.30 | 0.37 | −0.08 | 16 |
| 4th-down stops | 0.00 | 0.21 | −0.02 | 40 |
| Points allowed | 0.23 | 0.38 | 0.31 | 13 |
| Sacks | 0.19 | 0.30 | 0.26 | 23 |
| Turnovers | 0.46 | 0.22 | 0.25 | 21 |
| League DEF points | 0.32 | 0.41 | 0.34 | 13 |

- Three-and-outs depend about as much on the offence as the defence. The Vegas implied total is the strongest predictor of them: one SD (about 4 pts) moves expected 3&Os by 0.44 a game, three to four times either team's prior rate.
- The one stable offensive trait is sacks allowed (r = 0.22 with the next game).

## 3. Projection accuracy: every league vs this league

### Out of sample: 2025 wk10–18 + 2026 wk1–4 (13 weeks)
| Method | Judged on | MAE | Spearman | Top-1 | Top-3 | Top-10 |
|---|---|---|---|---|---|---|
| Sleeper projection | half-PPR | 4.34 | 0.25 | 12.0 | 10.0 | 8.2 |
| ECR | half-PPR | – | 0.28 | 12.0 | 9.7 | 8.4 |
| Sleeper half-PPR ranking | league | – | 0.30 | 16.9 | 14.6 | 12.3 |
| Sleeper re-scored, raw | league | 5.79 (bias −3.1) | 0.34 | 16.2 | 14.8 | 12.5 |
| Patched, own-rate weight 0 | league | 5.41 | 0.34 | 16.2 | 14.8 | 12.5 |
| **Patched, weight 0.5 (tool today)** | league | 5.43 | 0.31 | 16.6 | 13.6 | 12.4 |
| ECR | league | – | 0.33 | 17.2 | 14.2 | 12.2 |
| Team's season-to-date ppg | league | 6.23 | 0.13 | 11.9 | 11.7 | 10.8 |
| Opponent's points allowed to DEFs | league | 5.91 | 0.24 | 12.6 | 13.3 | 12.2 |
| Fitted: Vegas + 3&O rates + sacks, turnovers, new QB | league | 5.36 | 0.37 | 16.1 | 15.0 | 12.5 |
| **Opponent implied total only** | league | **5.29** | **0.39** | **17.2** | **14.7** | **12.6** |

League ceiling: best-3 23.2, field average 9.5. Half-PPR: 18.4 and 6.7.

Paired against the tool today, 13 weeks:

| Method | Spearman change (SE) | Top-3 change, pts (SE) |
|---|---|---|
| Opponent implied total | +0.07 (0.02) | +1.1 (1.2) |
| Patched, weight 0 | +0.02 (0.02) | +1.2 (1.1) |
| ECR | +0.01 (0.04) | +0.5 (0.9) |
| Full matchup model | +0.05 (0.02) | +1.3 (1.0) |
| Team season-to-date average | −0.19 (0.05) | −1.9 (1.4) |

Replication (Spearman vs league actuals): 2025 full season — tool 0.34, weight 0 0.36, ECR 0.35, Vegas 0.39. 2024 — tool 0.39, weight 0 0.41, Vegas 0.41, Sleeper half-PPR 0.41.

**Wrong for this league, or for everyone?** For everyone, about equally. No evidence Sleeper or ECR under-rank defences that force three-and-outs (prior 3&O rate adds 0.37 ± 0.28 holding Sleeper fixed). One small real miss: the opponent's tendency to go three-and-out (+0.94 ± 0.30 per extra 3&O allowed), but the Vegas line already carries it.

## 4. Matchup lessons

| Opponent implied total | n (2025–26) | Avg league pts | P(15+) | P(≤ 2) | 2024 replication: avg / P(15+) |
|---|---|---|---|---|---|
| under 17 | 50 | 15.0 | 50% | 0% | 14.5 / 48% |
| 17–18.9 | 61 | 13.1 | 41% | 7% | 14.4 / 49% |
| 19–20.9 | 114 | 11.4 | 35% | 11% | 12.7 / 39% |
| 21–22.9 | 127 | 10.1 | 24% | 13% | 8.6 / 20% |
| 23–24.9 | 140 | 7.6 | 14% | 24% | 8.4 / 16% |
| 25 or more | 180 | 6.2 | 13% | 33% | 5.7 / 7% |

Each point of opponent implied total is worth about 0.8 league DEF points (−0.82 ± 0.05).

On top of the line: opponent sacks allowed has a consistent sign (top third +0.8, bottom third −0.6; 2024 +0.4 / −1.0) — tiebreaker only. Rookie QB flips sign between seasons. Own 3&O rate, opponent 3&Os allowed, home field: nothing. Road favourites by 7+ underperform in both seasons, but the sample is 40 games.

## 5. Recommended weekly method

```
def_spread      = espn spread if DEF team is home, else -espn spread   (ESPN spread is the home team's)
opp_implied     = overUnder / 2 + def_spread / 2
proj_league_pts = 27.75 - 0.819 * opp_implied
```
- Source: the ESPN scoreboard the tool already loads, `events[].competitions[0].odds[0]`. Map ESPN `WSH` to Sleeper `WAS`.
- Fit: 2024 wk2 – 2026 wk4, n = 1,182. Residual SD 6.9, so ±9 pts (80% band) on any single week.
- **Fallback without odds:** `proj = 27.90 − 0.826 × Sleeper projected pts_allow` (Spearman 0.37 out of sample).
- **Tiebreaker (not validated):** `22.38 − 0.732 × opp_implied + 1.41 × opp_sacks_allowed_per_game`, shrunk as (sum + 4 × 2.4) ÷ (games + 4). Only to split matchups within about a point.
- **Switching rule:** a 4-point gap in implied total is worth about 3.3 points. On rolling waivers, stream only when the target's opponent implied total is 4+ lower than your current DEF's. For a free agent, a 1–2 point gap is enough.

Changes this implies for `engine.js`: use the formula where odds exist and the fallback elsewhere; if the Sleeper-based projection stays anywhere, set the own-rate weight to 0, week-1 defaults to 2.2 and 0.65, and skip `pass_int_td` for DEF; drop the brief's "stingy units beat ball-hawks" note.

### 2026 week 5 (lines as of 7 October; they will move)
| Rank | DEF | Opponent | Spread | Opp implied | Recommended proj | Tool today (rank) | Rostered by |
|---|---|---|---|---|---|---|---|
| 1 | HOU | at TEN | −7.5 | 15.0 | 15.5 | 12.7 (2) | CTESPN |
| 2 | JAX | v PHI | −7.0 | 17.75 | 13.2 | 11.9 (8) | Bill Belichick |
| 3 | CIN | at MIA | −7.0 | 17.75 | 13.2 | 12.4 (4) | free agent |
| 4 | NYJ | v CLE | −2.5 | 18.5 | 12.6 | 12.1 (6) | free agent |
| 5 | DAL | v TB | −8.5 | 19.5 | 11.8 | 12.2 (5) | free agent |
| 6 | DEN | at LAC | −3.5 | 19.5 | 11.8 | 11.7 (9) | Kirks Cousins |
| 7 | WAS | v NYG | −3.5 | 20.0 | 11.4 | 12.0 (7) | free agent |
| 8 | ATL | v BAL | −3.5 | 20.0 | 11.4 | 12.8 (1) | free agent |
| 24 | PHI (Hawk Tua) | at JAX | +7.0 | 24.75 | 7.5 | 7.7 (24) | Hawk Tua |

## Files
`defs_weekly.csv` (one row per team-week, 2025–26) · `model.json` · `results.md` / `results.json` · `fetch.mjs`, `fetch_fp.mjs`, `build.py`, `analysis.py` (re-runnable; responses cached in `cache/`).
