/* Hawk Tua HQ — engine.
   Pulls a Sleeper league plus free public feeds, re-scores every player with the league's own
   scoring settings, and works out the lineup, waiver, trade and ranking calls. No UI in here,
   so it also runs under Node for testing. */
(function (root) {
  'use strict';

  const SLEEPER = 'https://api.sleeper.app';
  const FPOS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
  const POS_QS = FPOS.map(p => 'position[]=' + p).join('&');

  const SLOT_ELIG = {
    QB: ['QB'], RB: ['RB'], WR: ['WR'], TE: ['TE'], K: ['K'], DEF: ['DEF'],
    FLEX: ['RB', 'WR', 'TE'], WRRB_FLEX: ['RB', 'WR'], REC_FLEX: ['WR', 'TE'],
    SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
  };
  // Fill the narrowest slots first so the greedy fill stays optimal.
  const SLOT_ORDER = { WRRB_FLEX: 1, REC_FLEX: 1, FLEX: 2, SUPER_FLEX: 3 };
  const SLOT_LABEL = { FLEX: 'FLX', SUPER_FLEX: 'SFX', WRRB_FLEX: 'W/R', REC_FLEX: 'W/T' };

  const NOT_PLAYING = new Set(['Out', 'IR', 'PUP', 'Sus', 'NA', 'DNR', 'COV']);
  const LONG_TERM = new Set(['IR', 'PUP', 'NA', 'Sus']);
  const ESPN_ABBR = { WSH: 'WAS' };
  const DAY = 864e5;

  // Defences: league points = A + B × the opponent's implied total from the betting line.
  // Fitted on NFL Casuals scoring, 2024 to week 4 of 2026 (research/def-audit). Without a line,
  // Sleeper's projected points allowed stands in for it (they track each other at r = 0.98).
  const DEF_LINE = { a: 27.754, b: -0.8194 };
  const DEF_PTS_ALLOW = { a: 27.898, b: -0.826 };
  // Last season's late lines (weeks 10–18), a light prior for the team ratings while this season's
  // sample is small. "week home away homeImplied awayImplied", one game per entry.
  const LINE_PRIOR = {
    2026:
      '10 CAR NO 22 16.5|10 CHI NYG 24.5 20|10 DEN LV 25.5 16|10 GB PHI 23 21.5|10 HOU JAX 20.5 18|10 IND ATL 27 21.5|10 LAC PIT 24.5 21|10 MIA BUF 21 29.5|10 MIN BAL 22.5 27|10 NYJ CLE 17.5 20|10 SEA ARI 26 18.5|10 SF LAR 21.5 28|10 TB NE 25.5 23|10 WAS DET 20.5 28|' +
      '11 ARI SF 22.5 26|11 ATL CAR 23 18.5|11 BUF TB 25.5 19|11 CLE BAL 15 22.5|11 DEN KC 20.5 25|11 JAX LAC 20 22.5|11 LAR SEA 26.5 23|11 LV DAL 22.5 26|11 MIA WAS 24.5 22|11 MIN CHI 25.25 22.25|11 NE NYJ 27.5 15|11 NYG GB 17.5 25|11 PHI DET 24 21.5|11 PIT CIN 26.5 21|11 TEN HOU 16 21.5|' +
      '12 ARI JAX 22.5 24|12 BAL NYJ 29.5 15|12 CHI PIT 25 22.5|12 CIN NE 21.5 29|12 DAL PHI 23 25.5|12 DET NYG 32.5 18|12 GB MIN 24 17.5|12 HOU BUF 20 24.5|12 KC IND 27 22.5|12 LAR TB 29 21.5|12 LV CLE 20 16.5|12 NO ATL 21 19.5|12 SF CAR 27.75 20.75|12 TEN SEA 15 26.5|' +
      '13 BAL CIN 29.75 22.75|13 CAR LAR 17.25 27.25|13 CLE SF 15 20.5|13 DAL KC 24.5 28|13 DET GB 25.25 22.25|13 IND HOU 23.5 20|13 LAC LV 25 15.5|13 MIA NO 23.5 18|13 NE NYG 26.75 19.75|13 NYJ ATL 17.75 20.75|13 PHI CHI 25.25 18.25|13 PIT BUF 20.75 23.75|13 SEA MIN 27.5 15|13 TB ARI 25 20.5|13 TEN JAX 18.25 24.25|13 WAS DEN 18.5 25|' +
      '14 ARI LAR 20 29.5|14 ATL SEA 18.75 25.75|14 BAL PIT 24.5 19|14 BUF CIN 30.25 24.25|14 CLE TEN 19 14.5|14 DET DAL 29.5 26|14 GB CHI 25.5 19|14 JAX IND 21 23.5|14 KC HOU 23 18.5|14 LAC PHI 20 21.5|14 LV DEN 16 24.5|14 MIN WAS 22.5 21|14 NYJ MIA 19.5 22|14 TB NO 24.5 17|' +
      '15 CHI CLE 23 15.5|15 CIN BAL 24.5 27|15 DAL MIN 26.5 21|15 DEN GB 20.5 22|15 HOU ARI 26.5 16|15 JAX NYJ 27 13.5|15 KC LAC 23.5 18|15 LAR DET 30 24.5|15 NE BUF 23.5 26|15 NO CAR 19.5 22|15 NYG WAS 24.25 21.25|15 PHI LV 24.5 12|15 PIT MIA 23.25 20.25|15 SEA IND 27 14.5|15 SF TEN 28.5 16|15 TB ATL 24.75 18.75|' +
      '16 ARI ATL 23 25.5|16 BAL NE 25.5 22|16 CAR TB 20.75 23.75|16 CHI GB 23 21.5|16 CLE BUF 15.5 26|16 DAL LAC 26 24.5|16 DEN JAX 25 21.5|16 DET PIT 30 22.5|16 HOU LV 27 12.5|16 IND SF 21 25.5|16 MIA CIN 22.5 26|16 NO NYJ 23.25 16.25|16 NYG MIN 19.5 22|16 SEA LAR 22 20.5|16 TEN KC 17 20.5|16 WAS PHI 18.25 25.25|' +
      '17 ATL LAR 20.5 28|17 BUF PHI 24.5 21|17 CAR SEA 18 24.5|17 CIN ARI 30.25 23.25|17 CLE PIT 15.5 19|17 GB BAL 20 17.5|17 IND JAX 22 26.5|17 KC DEN 12 25.5|17 LAC HOU 21 19.5|17 LV NYG 18.75 21.75|17 MIA TB 19.5 25|17 MIN DET 19 26.5|17 NYJ NE 15 27.5|17 SF CHI 28 23.5|17 TEN NO 18.5 20|17 WAS DAL 21 29.5|' +
      '18 ATL NO 23.5 20|18 BUF NYJ 26.5 13|18 CHI DET 27.25 24.25|18 CIN CLE 28 19.5|18 DEN LAC 26.5 11|18 HOU IND 23.5 14|18 JAX TEN 30 16.5|18 LAR ARI 32 17.5|18 LV KC 16 19.5|18 MIN GB 25.5 12|18 NE MIA 29 14.5|18 NYG DAL 23.75 26.75|18 PHI WAS 20.75 17.75|18 PIT BAL 18.5 23|18 SF SEA 23 25.5|18 TB CAR 22.75 19.75',
  };

  const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
  const sum = a => a.reduce((s, x) => s + x, 0);
  const avg = a => a.length ? sum(a) / a.length : 0;

  async function getJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${r.status} from ${url}`);
    return r.json();
  }
  const soft = p => p.catch(() => null);

  /* ---------- scoring ---------- */

  function scoreStats(st, sc) {
    let t = 0;
    for (const k in sc) { const v = st[k]; if (v) t += v * sc[k]; }
    return t;
  }

  // Projections leave out a few keys the league scores. Fill them from the keys they do carry.
  function fillProjection(st, pos, sc, defRates) {
    const s = Object.assign({}, st);
    const alias = (to, from) => { if (sc[to] && !sc[from] && s[to] == null && s[from] != null) s[to] = s[from]; };
    if (pos === 'K') {
      if (sc.fgm_yds_over_30 && s.fgm_yds_over_30 == null) {
        s.fgm_yds_over_30 = 4.5 * (s.fgm_30_39 || 0) + 14.5 * (s.fgm_40_49 || 0) +
          (s.fgm_50_59 != null ? 24 * s.fgm_50_59 + 33 * (s.fgm_60p || 0) : 23 * (s.fgm_50p || 0));
      }
      alias('fgmiss_50_59', 'fgmiss_50p');
      alias('fgm_50_59', 'fgm_50p');
    }
    if (pos === 'DEF') {
      // A quarterback key: on a defence it double-counts pick-sixes already inside def_td.
      delete s.pass_int_td;
      if (defRates) for (const k of ['def_3_and_out', 'def_4_and_stop']) {
        if (sc[k] && s[k] == null) s[k] = defRates[k];
      }
    }
    return s;
  }

  function injuryFactor(status) {
    if (!status) return 1;
    if (NOT_PLAYING.has(status)) return 0;
    if (status === 'Doubtful') return 0.25;
    if (status === 'Questionable') return 0.85;
    return 1;
  }

  /* ---------- load ---------- */

  async function load(leagueId, onStep) {
    const step = m => onStep && onStep(m);
    step('Reading your league');
    const [state, league, users, rosters] = await Promise.all([
      getJSON(`${SLEEPER}/v1/state/nfl`),
      getJSON(`${SLEEPER}/v1/league/${leagueId}`),
      getJSON(`${SLEEPER}/v1/league/${leagueId}/users`),
      getJSON(`${SLEEPER}/v1/league/${leagueId}/rosters`),
    ]);
    if (!league || !league.league_id) throw new Error('Sleeper has no league with that ID.');

    const season = league.season;
    const ls = league.settings || {};
    const pws = ls.playoff_week_start || 15;
    const rounds = Math.ceil(Math.log2(Math.max(2, ls.playoff_teams || 4)));
    const lastWeek = Math.min(18, pws + rounds - 1);
    let week = 1;
    if (state.season === season && state.season_type === 'regular') week = state.display_week || state.week || 1;
    else if (+state.season > +season || (state.season === season && state.season_type === 'post')) week = lastWeek;
    week = Math.min(Math.max(1, week), lastWeek);

    const scoring = league.scoring_settings || {};
    const positions = league.roster_positions || [];
    const slots = positions.filter(s => s !== 'BN' && s !== 'IR' && s !== 'TAXI');
    const rosterLimit = positions.filter(s => s !== 'IR' && s !== 'TAXI').length;
    const nTeams = league.total_rosters || rosters.length;
    const projWeeks = range(week, Math.min(week + 3, lastWeek));
    const pastWeeks = range(1, week - 1);
    const formWeeks = pastWeeks.slice(-3);
    const qbs = slots.includes('SUPER_FLEX') || slots.filter(s => s === 'QB').length > 1 ? 2 : 1;
    const ppr = [0, 0.5, 1].reduce((b, x) => Math.abs(x - (scoring.rec || 0)) < Math.abs(b - (scoring.rec || 0)) ? x : b, 0);

    step('Pulling projections and stats');
    const lg = `${SLEEPER}/v1/league/${leagueId}`;
    const [projs, seasonProj, seasonStats, forms, schedule, matchups, txs, trend, market, scoreboard] = await Promise.all([
      Promise.all(projWeeks.map(w => getJSON(`${SLEEPER}/projections/nfl/${season}/${w}?season_type=regular&${POS_QS}`))),
      soft(getJSON(`${SLEEPER}/projections/nfl/${season}?season_type=regular&${POS_QS}`)),
      pastWeeks.length ? soft(getJSON(`${SLEEPER}/stats/nfl/${season}?season_type=regular&${POS_QS}`)) : Promise.resolve([]),
      Promise.all(formWeeks.map(w => soft(getJSON(`${SLEEPER}/stats/nfl/${season}/${w}?season_type=regular&${POS_QS}`)))),
      soft(getJSON(`${SLEEPER}/schedule/nfl/regular/${season}`)),
      Promise.all(range(1, week).map(w => soft(getJSON(`${lg}/matchups/${w}`)))),
      Promise.all(range(Math.max(1, week - 1), week).map(w => soft(getJSON(`${lg}/transactions/${w}`)))),
      soft(getJSON(`${SLEEPER}/v1/players/nfl/trending/add?lookback_hours=24&limit=60`)),
      soft(getJSON(`https://api.fantasycalc.com/values/current?isDynasty=false&numQbs=${qbs}&numTeams=${nTeams}&ppr=${ppr}`)),
      soft(getJSON(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${week}&dates=${season}`)),
    ]);
    step('Scoring every player your way');

    /* schedule: games[week][team] */
    const games = {};
    for (const g of schedule || []) {
      if (g.status === 'canceled') continue; // a moved game stays in the feed under its old slot
      const w = g.week; games[w] = games[w] || {};
      games[w][g.home] = { opp: g.away, home: true, status: g.status, date: g.date };
      games[w][g.away] = { opp: g.home, home: false, status: g.status, date: g.date };
    }
    const haveSchedule = Object.keys(games).length > 0;
    const plays = (team, w) => !haveSchedule || !!(games[w] && games[w][team]);
    const byeWeek = {};
    if (haveSchedule) {
      const teamsSeen = new Set(); Object.values(games).forEach(g => Object.keys(g).forEach(t => teamsSeen.add(t)));
      teamsSeen.forEach(t => { const b = range(1, 18).find(w => games[w] && !games[w][t]); if (b) byeWeek[t] = b; });
    }

    /* kickoffs this week (ESPN), keyed by Sleeper team abbreviation */
    const kick = {};
    for (const e of (scoreboard && scoreboard.events) || []) {
      const c = e.competitions && e.competitions[0]; if (!c) continue;
      const st = (e.status && e.status.type && e.status.type.state) || 'pre';
      for (const comp of c.competitors || []) {
        const ab = comp.team && comp.team.abbreviation; if (!ab) continue;
        kick[ESPN_ABBR[ab] || ab] = { at: Date.parse(e.date), state: st };
      }
    }
    /* this week's betting lines: points each team is expected to score */
    const lines = linesFromScoreboard(scoreboard, week);
    const lineFor = {};
    for (const g of lines) { lineFor[g.home] = { opp: g.away, oppImplied: g.awayImplied }; lineFor[g.away] = { opp: g.home, oppImplied: g.homeImplied }; }

    /* players */
    const P = {};
    const ensure = row => {
      const id = row.player_id; if (!id) return null;
      let p = P[id];
      if (!p) {
        const m = row.player || {};
        const pos = m.position || (m.fantasy_positions || [])[0];
        if (!FPOS.includes(pos)) return null;
        p = P[id] = {
          id, pos, first: m.first_name || '', last: m.last_name || '',
          fpos: (m.fantasy_positions || [pos]).filter(x => FPOS.includes(x)),
          team: m.team || row.team || null,
          inj: m.injury_status || null, injBody: m.injury_body_part || null, injNotes: m.injury_notes || null,
          yrs: m.years_exp, projRaw: {}, proj: {}, half: {}, opp: {}, form: {},
          ytd: null, pre: null, owner: null,
        };
        p.name = pos === 'DEF' ? `${p.last || id} D/ST` : `${p.first} ${p.last}`.trim();
        p.short = pos === 'DEF' ? `${p.last || id}` : `${p.first ? p.first[0] + '. ' : ''}${p.last}`;
      }
      return p;
    };

    projWeeks.forEach((w, i) => {
      for (const row of projs[i] || []) {
        const p = ensure(row); if (!p) continue;
        p.projRaw[w] = row.stats || {};
        p.opp[w] = row.opponent || null;
      }
    });
    for (const row of seasonStats || []) {
      const p = ensure(row); if (!p) continue;
      p.ytd = { stats: row.stats || {}, gp: (row.stats && row.stats.gp) || 0 };
    }
    for (const row of seasonProj || []) {
      const p = ensure(row); if (!p) continue;
      p.pre = { stats: row.stats || {}, gp: (row.stats && row.stats.gp) || 0 };
    }
    formWeeks.forEach((w, i) => {
      for (const row of forms[i] || []) {
        const p = ensure(row); if (!p) continue;
        if (row.stats && row.stats.gp) p.form[w] = scoreStats(row.stats, scoring);
      }
    });

    /* defence extras the projections leave out (three-and-outs, fourth-down stops).
       League average for everyone: a team's own rate takes most of a season to mean anything,
       and blending it in made the weekly order worse in every season tested. */
    const allDef = Object.values(P).filter(p => p.pos === 'DEF' && p.ytd && p.ytd.gp);
    const defGames = sum(allDef.map(p => p.ytd.gp));
    const dr = {
      def_3_and_out: defGames ? sum(allDef.map(p => p.ytd.stats.def_3_and_out || 0)) / defGames : 2.2,
      def_4_and_stop: defGames ? sum(allDef.map(p => p.ytd.stats.def_4_and_stop || 0)) / defGames : 0.65,
    };

    for (const p of Object.values(P)) {
      const isDef = p.pos === 'DEF';
      for (const w of projWeeks) {
        const raw = p.projRaw[w]; if (!raw) continue;
        p.half[w] = raw.pts_half_ppr || 0;
        const line = isDef && w === week && lineFor[p.team];
        if (line) { p.proj[w] = DEF_LINE.a + DEF_LINE.b * line.oppImplied; p.line = line.oppImplied; }
        else if (isDef && raw.pts_allow != null) p.proj[w] = DEF_PTS_ALLOW.a + DEF_PTS_ALLOW.b * raw.pts_allow;
        else p.proj[w] = scoreStats(fillProjection(raw, p.pos, scoring, isDef ? dr : null), scoring);
      }
      if (p.ytd) p.ytd.pts = scoreStats(p.ytd.stats, scoring);
      if (p.pre) p.pre.pts = scoreStats(fillProjection(p.pre.stats, p.pos, scoring, isDef ? { def_3_and_out: dr.def_3_and_out * 17, def_4_and_stop: dr.def_4_and_stop * 17 } : null), scoring);
    }

    /* teams */
    const userById = Object.fromEntries((users || []).map(u => [u.user_id, u]));
    const teams = (rosters || []).map(r => {
      const u = userById[r.owner_id] || {};
      const s = r.settings || {};
      return {
        rid: r.roster_id, ownerId: r.owner_id, user: u.display_name || 'Open slot',
        name: ((u.metadata && u.metadata.team_name) || u.display_name || `Team ${r.roster_id}`).trim(),
        ids: (r.players || []).filter(Boolean), starters: r.starters || [],
        reserve: r.reserve || [], taxi: r.taxi || [],
        wins: s.wins || 0, losses: s.losses || 0, ties: s.ties || 0,
        pf: (s.fpts || 0) + (s.fpts_decimal || 0) / 100,
        pa: (s.fpts_against || 0) + (s.fpts_against_decimal || 0) / 100,
        waiver: s.waiver_position || null,
        faabLeft: (ls.waiver_budget || 0) - (s.waiver_budget_used || 0),
      };
    });
    teams.slice().sort((a, b) => (b.wins + b.ties / 2) - (a.wins + a.ties / 2) || b.pf - a.pf)
      .forEach((t, i) => { t.rank = i + 1; });
    const teamByRid = Object.fromEntries(teams.map(t => [t.rid, t]));
    for (const t of teams) for (const id of t.ids) {
      if (!P[id]) P[id] = { id, pos: '?', fpos: [], name: `Player ${id}`, short: `#${id}`, team: null, projRaw: {}, proj: {}, half: {}, opp: {}, form: {} };
      P[id].owner = t.rid;
    }

    /* this week's live points for rostered players */
    const live = {};
    const cur = matchups[week - 1] || [];
    for (const m of cur) for (const id in (m.players_points || {})) live[id] = m.players_points[id];

    /* market values (FantasyCalc: built from real trades in similar leagues) */
    const mkt = {};
    for (const v of market || []) {
      const sid = v.player && v.player.sleeperId; if (!sid) continue;
      mkt[sid] = { value: v.value, rank: v.overallRank, posRank: v.positionRank, trend: v.trend30Day || 0, espnId: v.player.espnId || null };
    }
    const trending = {};
    for (const t of trend || []) trending[t.player_id] = t.count;

    /* waivers: rolling order, FAAB, last run, recently dropped */
    const txAll = [].concat(...txs.map(x => x || []));
    const runs = txAll.filter(t => t.type === 'waiver' && (t.status === 'complete' || t.status === 'failed')).map(t => t.status_updated);
    let nextRun = null;
    if (runs.length) { nextRun = Math.max(...runs); while (nextRun < Date.now()) nextRun += 7 * DAY; }
    const clearMs = (ls.waiver_clear_days || 1) * DAY;
    const recentlyDropped = new Set();
    for (const t of txAll) {
      if (t.status !== 'complete' || !t.drops) continue;
      if (Date.now() - t.status_updated < clearMs) Object.keys(t.drops).forEach(id => recentlyDropped.add(id));
    }

    const L = {
      leagueId, league, name: league.name, season, week, lastWeek, playoffStart: pws,
      tradeDeadline: ls.trade_deadline || null, scoring, slots, rosterLimit, nTeams,
      projWeeks, pastWeeks, weeksLeft: range(week, lastWeek),
      players: P, teams, teamByRid, games, plays, byeWeek, kick, lines, live, matchups,
      market: mkt, hasMarket: Object.keys(mkt).length > 0, trending,
      waiver: {
        type: ls.waiver_type === 2 ? 'faab' : (ls.waiver_type === 1 ? 'rolling' : 'priority'),
        budget: ls.waiver_budget || 0, nextRun, recentlyDropped,
      },
      loadedAt: Date.now(),
    };
    computeValues(L);
    return L;
  }

  /* ---------- values ---------- */

  function computeValues(L) {
    const { players: P, projWeeks, weeksLeft, plays } = L;
    const all = Object.values(P).filter(p => FPOS.includes(p.pos));
    const lastNear = projWeeks[projWeeks.length - 1];
    for (const p of all) {
      p.thisWk = 0; p.ros = 0; p.rosWk = 0; p.rate = 0; p.vorp = 0;
      if (!p.team) continue;
      const inj = p.inj;
      const near = projWeeks.map((w, i) => {
        if (!plays(p.team, w)) return 0;
        let v = p.proj[w] || 0;
        if (i === 0) v *= injuryFactor(inj);
        else if (LONG_TERM.has(inj)) v = 0;
        return v;
      });
      const healthy = projWeeks.filter(w => plays(p.team, w) && (p.proj[w] || 0) > 0).map(w => p.proj[w]);
      const parts = [];
      if (healthy.length) parts.push([avg(healthy), 0.6]);
      if (p.ytd && p.ytd.gp > 0) parts.push([p.ytd.pts / p.ytd.gp, 0.25 * Math.min(p.ytd.gp, 4) / 4]);
      if (p.pre && p.pre.pts) parts.push([p.pre.pts / 17, 0.15]); // season totals; gp in this feed is unreliable
      const wsum = sum(parts.map(x => x[1]));
      p.rate = wsum ? sum(parts.map(x => x[0] * x[1])) / wsum : 0;
      const later = weeksLeft.filter(w => w > lastNear && plays(p.team, w)).length;
      p.thisWk = near[0];
      p.ros = sum(near) + p.rate * later * (LONG_TERM.has(inj) ? 0.75 : 1);
      p.rosWk = weeksLeft.length ? p.ros / weeksLeft.length : 0;
      const half = p.half[projWeeks[0]];
      p.boost = half > 3 ? (p.proj[projWeeks[0]] - half) / half : null;
    }

    // replacement level = first player outside the league's combined starting pool
    const pools = {};
    FPOS.forEach(pos => { pools[pos] = all.filter(p => p.pos === pos && p.team).sort((a, b) => b.ros - a.ros); });
    const take = Object.fromEntries(FPOS.map(p => [p, 0]));
    L.slots.filter(s => SLOT_ELIG[s] && !SLOT_ORDER[s]).forEach(s => { take[s] += L.nTeams; });
    L.slots.filter(s => SLOT_ORDER[s]).sort((a, b) => SLOT_ORDER[a] - SLOT_ORDER[b]).forEach(s => {
      for (let i = 0; i < L.nTeams; i++) {
        let best = null;
        for (const pos of SLOT_ELIG[s]) {
          const c = pools[pos][take[pos]];
          if (c && (!best || c.ros > best.c.ros)) best = { c, pos };
        }
        if (best) take[best.pos]++;
      }
    });
    L.replacement = {};
    FPOS.forEach(pos => {
      const r = pools[pos][take[pos]];
      L.replacement[pos] = r ? r.ros : 0;
      pools[pos].forEach((p, i) => { p.posRank = i + 1; });
    });
    L.starterPool = take;
    for (const p of all) p.vorp = p.team ? p.ros - L.replacement[p.pos] : -999;
    all.filter(p => p.team).sort((a, b) => b.vorp - a.vorp).forEach((p, i) => { p.rank = i + 1; });

    L.freeAgents = all.filter(p => p.team && p.owner == null).sort((a, b) => b.ros - a.ros);
  }

  /* ---------- game state ---------- */

  function gameOf(L, team, w) { return (L.games[w || L.week] || {})[team] || null; }
  function kickoff(L, team) {
    const k = L.kick[team]; if (k) return k.at;
    const g = gameOf(L, team); return g && g.date ? Date.parse(g.date + 'T17:00:00Z') : null;
  }
  function isLocked(L, id, now) {
    const p = L.players[id]; if (!p || !p.team) return false;
    const k = L.kick[p.team];
    if (k && k.state !== 'pre') return true;
    const g = gameOf(L, p.team);
    if (g && g.status === 'complete') return true;
    const at = kickoff(L, p.team);
    return at != null && (now || Date.now()) >= at;
  }
  function weekPts(L, p) {
    if (!p) return 0;
    if (p.owner != null && L.live[p.id] != null && isLocked(L, p.id)) return L.live[p.id];
    return p.thisWk || 0;
  }

  /* ---------- lineup optimiser ---------- */

  function eligible(p, slot) {
    const e = SLOT_ELIG[slot]; if (!e || !p) return false;
    return (p.fpos && p.fpos.length ? p.fpos : [p.pos]).some(x => e.includes(x));
  }

  // Best lineup for `ids` scored by fn(p). `fixed` pins slot index → id (locked players).
  function optimize(L, ids, fn, fixed) {
    const P = L.players;
    const slots = L.slots;
    const lineup = slots.map((_, i) => (fixed && fixed[i]) || null);
    const used = new Set(lineup.filter(Boolean));
    let total = sum(lineup.filter(Boolean).map(id => fn(P[id])));
    const order = slots.map((s, i) => ({ s, i })).filter(x => !lineup[x.i])
      .sort((a, b) => (SLOT_ORDER[a.s] || 0) - (SLOT_ORDER[b.s] || 0));
    const cands = ids.map(id => P[id]).filter(Boolean);
    for (const { s, i } of order) {
      let best = null, bv = -Infinity;
      for (const p of cands) {
        if (used.has(p.id) || !eligible(p, s)) continue;
        const v = fn(p);
        if (v > bv || (v === bv && best && (p.rosWk || 0) > (best.rosWk || 0))) { bv = v; best = p; }
      }
      if (best) { used.add(best.id); lineup[i] = best.id; total += bv; }
    }
    return { lineup, total, bench: ids.filter(id => !used.has(id)) };
  }

  const activeIds = t => t.ids.filter(id => !t.reserve.includes(id) && !t.taxi.includes(id));

  // A roster's rest-of-season strength, in points per week: best lineup plus a little for depth.
  // Bench players only count if they could cover a starting slot; a backup QB in a one-QB league barely does.
  function depthWeight(L, p) {
    if (!p || p.pos === 'K' || p.pos === 'DEF') return 0;
    if (p.pos === 'QB') return L.slots.filter(s => SLOT_ELIG[s] && SLOT_ELIG[s].includes('QB')).length > 1 ? 0.1 : 0.03;
    return 0.1;
  }
  function strength(L, ids) {
    const r = optimize(L, ids, p => p.rosWk || 0);
    const bench = r.bench.map(id => L.players[id]).filter(Boolean)
      .map(p => depthWeight(L, p) * (p.rosWk || 0)).sort((a, b) => b - a).slice(0, 3);
    return r.total + sum(bench);
  }

  // Keep a roster legal: drop the lowest-value players over the limit, fill open spots from free agents.
  function settleRoster(L, ids, limit, exclude) {
    const P = L.players;
    let out = ids.slice();
    const dropped = [], added = [];
    while (out.length > limit) {
      const worst = out.map(id => P[id]).filter(Boolean).sort((a, b) => (a.vorp || 0) - (b.vorp || 0))[0];
      out = out.filter(id => id !== worst.id); dropped.push(worst.id);
    }
    if (out.length < limit) {
      const fa = L.freeAgents.filter(p => !exclude.has(p.id) && ['RB', 'WR', 'TE'].includes(p.pos));
      while (out.length < limit && fa.length) { const p = fa.shift(); out.push(p.id); added.push(p.id); exclude.add(p.id); }
    }
    return { ids: out, dropped, added };
  }

  /* ---------- this week: start / sit ---------- */

  function sdOf(p, pts) { return (p.pos === 'K' || p.pos === 'DEF') ? 4.5 : 0.45 * pts + 2; }
  function normCdf(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - q : q;
  }

  function teamWeek(L, t) {
    const P = L.players;
    const active = activeIds(t);
    const pts = p => weekPts(L, p);
    const cur = L.slots.map((_, i) => { const id = t.starters[i]; return id && id !== '0' ? id : null; });
    const fixed = cur.map(id => (id && isLocked(L, id) ? id : null));
    const pool = active.filter(id => !fixed.includes(id) && !(isLocked(L, id) && !cur.includes(id)));
    const opt = optimize(L, pool, pts, fixed);
    const curTotal = sum(cur.map(id => (id ? pts(P[id]) : 0)));
    const lockedSet = new Set(fixed.filter(Boolean));
    const vari = sum(opt.lineup.filter(Boolean).map(id => lockedSet.has(id) ? 0 : Math.pow(sdOf(P[id], pts(P[id])), 2)));
    return { cur, opt, curTotal, optTotal: opt.total, vari, pool, pts };
  }

  function lineupCall(L, rid) {
    const P = L.players;
    const t = L.teamByRid[rid];
    const me = teamWeek(L, t);
    const { cur, opt, pts } = me;

    const ins = opt.lineup.filter(id => id && !cur.includes(id));
    const outs = cur.filter(id => id && !opt.lineup.includes(id));
    const swaps = [];
    const outsLeft = outs.slice();
    for (const id of ins) {
      const p = P[id];
      let k = outsLeft.findIndex(o => P[o] && P[o].pos === p.pos);
      if (k < 0) k = 0;
      const o = outsLeft.length ? outsLeft.splice(k, 1)[0] : null;
      swaps.push({ start: id, sit: o, gain: pts(p) - (o ? pts(P[o]) : 0) });
    }

    const benchPool = me.pool.filter(id => !opt.lineup.includes(id));
    const close = [];
    L.slots.forEach((s, i) => {
      const id = opt.lineup[i]; if (!id || isLocked(L, id)) return;
      let alt = null, av = -Infinity;
      for (const b of benchPool) { const bp = P[b]; if (eligible(bp, s) && pts(bp) > av) { av = pts(bp); alt = b; } }
      const margin = pts(P[id]) - av;
      if (alt && av > 0 && margin < 1.5 && !close.some(c => c.alt === alt)) close.push({ slot: s, start: id, alt, margin });
    });

    // opponent this week
    const m = (L.matchups[L.week - 1] || []);
    const mine = m.find(x => x.roster_id === rid);
    const oppM = mine && mine.matchup_id != null ? m.find(x => x.matchup_id === mine.matchup_id && x.roster_id !== rid) : null;
    let opp = null;
    if (oppM) {
      const ot = L.teamByRid[oppM.roster_id];
      const ow = teamWeek(L, ot);
      const diff = me.optTotal - ow.optTotal;
      const sd = Math.sqrt(me.vari + ow.vari) || 1;
      opp = { team: ot, proj: ow.optTotal, curProj: ow.curTotal, winProb: normCdf(diff / sd) };
    }

    const watch = opt.lineup.filter(Boolean).map(id => P[id]).filter(p => p.inj && !isLocked(L, p.id));
    // slots nobody on the roster can fill this week (bye, injury) — the waiver wire has to
    const holes = L.slots.map((s, i) => ({ slot: s, i, id: opt.lineup[i] }))
      .filter(h => SLOT_ELIG[h.slot] && (!h.id || (!isLocked(L, h.id) && pts(P[h.id]) < 1)));
    return {
      slots: L.slots, cur, opt: opt.lineup, bench: benchPool, swaps, close, holes,
      curTotal: me.curTotal, optTotal: me.optTotal, opp, watch, pts,
      locked: id => isLocked(L, id), empty: cur.filter(x => !x).length,
    };
  }

  /* ---------- waivers ---------- */

  function faStatus(L, p) {
    if (L.waiver.recentlyDropped.has(p.id)) return 'waivers';
    if (isLocked(L, p.id)) return 'waivers';
    return 'free';
  }

  function waiverCalls(L, rid, idsOverride, skip) {
    const P = L.players;
    const t = L.teamByRid[rid];
    const active = idsOverride || activeIds(t);
    const room = L.rosterLimit - active.length;
    const base = strength(L, active);
    const wkBase = optimize(L, active, p => weekPts(L, p)).total;
    const remaining = L.weeksLeft.length;
    const droppable = active.filter(id => !isLocked(L, id));

    const cands = [].concat(
      L.freeAgents.filter(p => p.pos !== 'K' && p.pos !== 'DEF').slice(0, 60),
      L.freeAgents.filter(p => p.pos === 'K').sort((a, b) => b.thisWk - a.thisWk).slice(0, 6),
      L.freeAgents.filter(p => p.pos === 'DEF').sort((a, b) => b.thisWk - a.thisWk).slice(0, 6),
    );
    const out = [];
    for (const fa of cands) {
      if (skip && skip.has(fa.id)) continue;
      // kickers and defences swap like for like; never carry two
      const sameSlot = (fa.pos === 'K' || fa.pos === 'DEF') ? droppable.filter(id => P[id] && P[id].pos === fa.pos) : null;
      const tries = room > 0 ? [null] : (sameSlot && sameSlot.length ? sameSlot : droppable);
      let best = null;
      for (const d of tries) {
        const ids = active.filter(x => x !== d).concat(fa.id);
        const gWk = strength(L, ids) - base;
        const gNow = isLocked(L, fa.id) ? 0 : optimize(L, ids, p => weekPts(L, p)).total - wkBase;
        const total = gWk * Math.max(0, remaining - 1) + gNow;
        if (!best || total > best.total) best = { add: fa.id, drop: d, perWk: gWk, now: gNow, total };
      }
      if (best && best.total > 1) out.push(best);
    }
    // On rolling waivers a claim sends you to the back of the line, so an instant free-agent add wins a near tie.
    out.forEach(a => {
      a.status = faStatus(L, P[a.add]);
      a.score = a.total - (a.status === 'waivers' && L.waiver.type !== 'faab' ? 3 : 0);
    });
    out.sort((a, b) => b.score - a.score);
    const perPos = {};
    const adds = out.filter(x => { const k = P[x.add].pos; perPos[k] = (perPos[k] || 0) + 1; return perPos[k] <= 3; }).slice(0, 8);
    adds.forEach(a => { a.trend = L.trending[a.add] || 0; a.bid = faabBid(L, t, a); });
    return { adds, room, priority: t.waiver, type: L.waiver.type, nextRun: L.waiver.nextRun, faabLeft: t.faabLeft };
  }

  // Up to three moves in order, each one judged on the roster the previous move left behind.
  function waiverPlan(L, rid, n) {
    let ids = activeIds(L.teamByRid[rid]);
    const skip = new Set(), plan = [];
    for (let i = 0; i < (n || 3); i++) {
      const w = waiverCalls(L, rid, ids, skip);
      const best = w.adds.find(a => a.score > 2 && !plan.some(p => p.drop && p.drop === a.drop));
      if (!best) break;
      plan.push(best); skip.add(best.add);
      ids = ids.filter(x => x !== best.drop).concat(best.add);
    }
    return plan;
  }

  function faabBid(L, t, a) {
    if (L.waiver.type !== 'faab' || !t.faabLeft) return null;
    const share = Math.min(0.45, Math.max(0.01, a.total / 120));
    return Math.max(L.league.settings.waiver_bid_min || 0, Math.round(t.faabLeft * share));
  }

  /* ---------- trades ---------- */

  function mv(L, ids) { return sum(ids.map(id => (L.market[id] ? L.market[id].value : 0))); }

  function evalTrade(L, ridA, ridB, give, get) {
    const A = L.teamByRid[ridA], B = L.teamByRid[ridB];
    const aIds = activeIds(A), bIds = activeIds(B);
    const exclude = new Set([...give, ...get]);
    const aAfter = settleRoster(L, aIds.filter(id => !give.includes(id)).concat(get), L.rosterLimit, new Set(exclude));
    const bAfter = settleRoster(L, bIds.filter(id => !get.includes(id)).concat(give), L.rosterLimit, new Set([...exclude, ...aAfter.added]));
    const dA = strength(L, aAfter.ids) - strength(L, aIds);
    const dB = strength(L, bAfter.ids) - strength(L, bIds);
    const mGive = mv(L, give), mGet = mv(L, get);
    return { give, get, dA, dB, mGive, mGet, aDrops: aAfter.dropped, aAdds: aAfter.added, bDrops: bAfter.dropped, bAdds: bAfter.added };
  }

  function tradeIdeas(L, rid, limit) {
    const P = L.players;
    const A = L.teamByRid[rid];
    const pick = t => activeIds(t).map(id => P[id]).filter(p => p && p.team && p.pos !== 'K' && p.pos !== 'DEF')
      .sort((a, b) => b.vorp - a.vorp).slice(0, 11).map(p => p.id);
    const mine = pick(A);
    const ideas = [];
    for (const B of L.teams) {
      if (B.rid === rid) continue;
      const theirs = pick(B);
      const combos = [];
      for (const a of mine) for (const b of theirs) combos.push([[a], [b]]);
      for (let i = 0; i < mine.length; i++) for (let j = i + 1; j < mine.length; j++) for (const b of theirs.slice(0, 8)) combos.push([[mine[i], mine[j]], [b]]);
      for (const a of mine.slice(0, 8)) for (let i = 0; i < theirs.length; i++) for (let j = i + 1; j < theirs.length; j++) combos.push([[a], [theirs[i], theirs[j]]]);
      const found = [];
      for (const [give, get] of combos) {
        const r = evalTrade(L, rid, B.rid, give, get);
        if (r.dA < 0.6 || r.dB < 0.15) continue;
        if (L.hasMarket && r.mGet > 0 && r.mGive < 0.85 * r.mGet) continue; // they'd likely say no
        // ~700 market points buys about a point a week; don't hand over much more than you get back
        const overpay = L.hasMarket ? Math.max(0, r.mGive - 1.15 * r.mGet) / 700 : 0;
        r.team = B; r.score = r.dA + 0.5 * Math.min(r.dB, r.dA) - 0.5 * overpay;
        found.push(r);
      }
      found.sort((x, y) => y.score - x.score);
      const kept = [];
      for (const f of found) {
        if (kept.some(k => k.get.some(id => f.get.includes(id)) || k.give.join() === f.give.join())) continue;
        kept.push(f); if (kept.length >= 2) break;
      }
      ideas.push(...kept);
    }
    ideas.sort((x, y) => y.score - x.score);
    return ideas.slice(0, limit || 8);
  }

  /* ---------- team report ---------- */

  function positionRanks(L) {
    const P = L.players;
    const groups = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    const table = L.teams.map(t => {
      const r = optimize(L, activeIds(t), p => p.rosWk || 0);
      const by = Object.fromEntries(groups.map(g => [g, 0]));
      r.lineup.filter(Boolean).forEach(id => { const p = P[id]; if (by[p.pos] != null) by[p.pos] += p.rosWk || 0; });
      return { rid: t.rid, by, total: r.total };
    });
    const ranks = {};
    for (const g of groups.concat(['total'])) {
      const sorted = table.slice().sort((a, b) => (g === 'total' ? b.total - a.total : b.by[g] - a.by[g]));
      sorted.forEach((row, i) => { (ranks[row.rid] = ranks[row.rid] || {})[g] = { rank: i + 1, pts: g === 'total' ? row.total : row.by[g] }; });
    }
    return ranks;
  }

  function benchLoss(L) {
    const out = {};
    L.pastWeeks.forEach(w => {
      for (const m of L.matchups[w - 1] || []) {
        const pts = m.players_points || {};
        const got = sum((m.starters_points || []).map(x => x || 0));
        const best = optimize(L, (m.players || []).filter(Boolean), p => pts[p.id] || 0).total;
        (out[m.roster_id] = out[m.roster_id] || []).push({ week: w, got, best, left: Math.max(0, best - got) });
      }
    });
    return out;
  }

  function byesAhead(L, rid) {
    const P = L.players;
    const t = L.teamByRid[rid];
    const r = optimize(L, activeIds(t), p => p.rosWk || 0);
    const starters = r.lineup.filter(Boolean).map(id => P[id]);
    return L.weeksLeft.map(w => ({ week: w, out: starters.filter(p => p.team && !L.plays(p.team, w)) })).filter(x => x.out.length);
  }

  /* ---------- defences: betting lines, team ratings, rest of season ---------- */

  const ESPN_SB = (season, w) => `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${w}&dates=${season}`;
  const ESPN_ODDS = id => `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/${id}/competitions/${id}/odds`;

  // ESPN quotes the HOME team's spread (negative = home favoured). Live in-game odds are skipped.
  function readLine(o) {
    if (!o || /live/i.test((o.provider && o.provider.name) || '')) return null;
    let sp = o.spread, ou = o.overUnder;
    if (sp == null) sp = parseFloat(o.homeTeamOdds && o.homeTeamOdds.close && o.homeTeamOdds.close.pointSpread && o.homeTeamOdds.close.pointSpread.american);
    if (ou == null) ou = parseFloat(o.close && o.close.total && o.close.total.american);
    if (sp == null || ou == null || isNaN(sp) || isNaN(ou)) return null;
    const hf = o.homeTeamOdds && o.homeTeamOdds.favorite, af = o.awayTeamOdds && o.awayTeamOdds.favorite;
    if (hf === true && sp > 0) sp = -sp;
    if (hf === false && af === true && sp < 0) sp = -sp;
    return { spread: +sp, total: +ou };
  }
  function sides(c) {
    const out = {};
    for (const x of c.competitors || []) { const ab = x.team && x.team.abbreviation; if (ab) out[x.homeAway] = ESPN_ABBR[ab] || ab; }
    return out;
  }
  const gameLine = (w, s, l) => ({ week: w, home: s.home, away: s.away, homeImplied: l.total / 2 - l.spread / 2, awayImplied: l.total / 2 + l.spread / 2 });

  function linesFromScoreboard(sb, w) {
    const out = [];
    for (const e of (sb && sb.events) || []) {
      const c = e.competitions && e.competitions[0]; if (!c) continue;
      const s = sides(c), l = readLine((c.odds || [])[0]);
      if (s.home && s.away && l) out.push(gameLine(w, s, l));
    }
    return out;
  }

  // Every line for one week. The scoreboard drops a game's odds at kickoff, so games under way or
  // finished come from ESPN's odds feed, one call each. A finished week never changes, so it's cached.
  async function weekLines(season, w, cache) {
    const key = `lines:${season}:${w}`;
    const hit = cache && cache.get(key);
    if (hit) { try { return JSON.parse(hit); } catch (e) { /* fetch again */ } }
    const sb = await getJSON(ESPN_SB(season, w));
    let final = true, missing = false;
    const out = await Promise.all(((sb && sb.events) || []).map(async e => {
      const c = e.competitions && e.competitions[0]; if (!c) return null;
      const st = (e.status && e.status.type) || {};
      if (/CANCEL|POSTPON/.test(st.name || '')) return null;
      if (st.state !== 'post') final = false;
      const s = sides(c); if (!s.home || !s.away) return null;
      let l = readLine((c.odds || [])[0]);
      if (!l && st.state !== 'pre') {
        const d = await soft(getJSON(ESPN_ODDS(e.id)));
        for (const it of (d && d.items) || []) { l = readLine(it); if (l) break; }
      }
      if (!l) missing = true;
      return l ? gameLine(w, s, l) : null;
    }));
    const lines = out.filter(Boolean);
    if (cache && final && !missing && lines.length) cache.set(key, JSON.stringify(lines));
    return lines;
  }

  // Ridge regression on implied totals: points = base + attack[scoring team] + defence[defending team] + home.
  // Light shrinkage (lambda 1) on the team terms; base and home are left free.
  function fitRatings(obs, teams) {
    const T = teams.length, n = 2 * T + 2, ti = Object.fromEntries(teams.map((t, i) => [t, i]));
    const A = Array.from({ length: n }, () => new Array(n + 1).fill(0));
    for (let i = 1; i < n - 1; i++) A[i][i] = 1;
    for (const o of obs) {
      if (ti[o.s] == null || ti[o.d] == null) continue;
      const idx = [0, 1 + ti[o.s], 1 + T + ti[o.d]]; if (o.home) idx.push(n - 1);
      for (const a of idx) { A[a][n] += o.wt * o.y; for (const b of idx) A[a][b] += o.wt; }
    }
    // Gaussian elimination with partial pivoting
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      const tmp = A[c]; A[c] = A[p]; A[p] = tmp;
      for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; if (f) for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; }
    }
    const x = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) { let s = A[r][n]; for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]; x[r] = s / A[r][r]; }
    return {
      base: x[0], home: x[n - 1],
      att: Object.fromEntries(teams.map((t, i) => [t, x[1 + i]])),
      def: Object.fromEntries(teams.map((t, i) => [t, x[1 + T + i]])),
    };
  }

  // Every defence's rest of season: each game's line where one exists, otherwise the line the team
  // ratings predict, turned into league points. Plus how each one's season so far compares with its lines.
  async function defBoard(L, opts) {
    const cache = opts && opts.cache;
    const { season, week: cur, players: P, games } = L;
    const byWeek = await Promise.all(range(1, cur).map(w => soft(weekLines(season, w, cache)).then(x => x || [])));
    const played = [].concat(...byWeek);
    const teams = [...new Set([].concat(...Object.values(games).map(g => Object.keys(g))))].sort();
    const obs = [];
    const add = (g, wt) => {
      obs.push({ s: g.home, d: g.away, home: 1, y: g.homeImplied, wt });
      obs.push({ s: g.away, d: g.home, home: 0, y: g.awayImplied, wt });
    };
    played.forEach(g => add(g, Math.pow(0.8, cur - g.week)));
    (LINE_PRIOR[season] || '').split('|').filter(Boolean).forEach(e => {
      const [, home, away, hi, ai] = e.split(' ');
      add({ home, away, homeImplied: +hi, awayImplied: +ai }, 0.2);
    });
    if (!teams.length || !obs.length) return null;
    const R = fitRatings(obs, teams);
    const implied = (s, d, home) => R.base + R.att[s] + R.def[d] + (home ? R.home : 0);
    const pts = imp => DEF_LINE.a + DEF_LINE.b * imp;
    const real = {}; // `${week}:${team}` -> what its opponent is expected to score, from an actual line
    for (const g of played) { real[g.week + ':' + g.home] = g.awayImplied; real[g.week + ':' + g.away] = g.homeImplied; }
    const mean = a => (a.length ? avg(a) : null);

    const rows = teams.map(t => {
      const sched = [];
      for (const w of L.weeksLeft) {
        const g = (games[w] || {})[t]; if (!g) continue;
        const k = w + ':' + t, imp = real[k] != null ? real[k] : implied(g.opp, t, !g.home);
        sched.push({ week: w, opp: g.opp, home: g.home, implied: imp, pts: pts(imp), line: real[k] != null });
      }
      const faced = played.filter(g => g.week < cur && (g.home === t || g.away === t))
        .map(g => (g.home === t ? { opp: g.away, imp: g.awayImplied } : { opp: g.home, imp: g.homeImplied }));
      const p = P[t];
      return {
        team: t, name: p ? p.name : t, owner: p ? p.owner : null, sched,
        ros: mean(sched.map(x => x.pts)),
        next3: mean(sched.filter(x => x.week < cur + 3).map(x => x.pts)),
        playoffs: mean(sched.filter(x => x.week >= L.playoffStart).map(x => x.pts)),
        byes: L.weeksLeft.filter(w => !(games[w] || {})[t]),
        rating: R.def[t], // points this defence takes off an average offence's line; lower is better
        soFar: p && p.ytd && p.ytd.gp ? p.ytd.pts / p.ytd.gp : null,
        expected: mean(faced.map(x => pts(x.imp))),
        oppAttack: mean(faced.map(x => R.att[x.opp])), // offences faced, points above an average one
        faced: faced.length,
      };
    });
    rows.slice().sort((a, b) => a.rating - b.rating).forEach((r, i) => { r.marketRank = i + 1; });
    rows.sort((a, b) => (b.ros || 0) - (a.ros || 0)).forEach((r, i) => { r.rank = i + 1; });
    return { rows, lines: played.length, ratings: R };
  }

  // Week by week: your best defence against the best one nobody owns. Switch at a 2-point gap,
  // or 4 when it takes a waiver claim this week.
  function defPlan(L, board, rid) {
    const P = L.players;
    const mine = activeIds(L.teamByRid[rid]).filter(id => P[id] && P[id].pos === 'DEF');
    const by = Object.fromEntries(board.rows.map(r => [r.team, r]));
    const at = (team, w) => (by[team] ? by[team].sched.find(x => x.week === w) : null) || null;
    return L.weeksLeft.map(w => {
      let you = null, best = null;
      const now = w === L.week;
      for (const id of mine) { const g = at(id, w); if (g && (!you || g.pts > you.pts)) you = Object.assign({ team: id }, g); }
      for (const r of board.rows) {
        if (r.owner != null || (now && isLocked(L, r.team))) continue;
        const g = at(r.team, w); if (g && (!best || g.pts > best.pts)) best = Object.assign({ team: r.team }, g);
      }
      const claim = now && !!best && !!P[best.team] && faStatus(L, P[best.team]) === 'waivers';
      const locked = now && !!you && isLocked(L, you.team); // yours has kicked off: nothing left to decide
      const gap = best ? best.pts - (you ? you.pts : 0) : 0;
      return { week: w, you, best, gap, claim, locked, stream: !locked && !!best && (!you || gap >= (claim ? 4 : 2)) };
    });
  }

  /* ---------- how this league scores ---------- */

  function scoringNotes(L) {
    const sc = L.scoring, notes = [];
    const P = Object.values(L.players);
    const w0 = L.projWeeks[0];
    const boostFor = pos => {
      const top = P.filter(p => p.pos === pos && p.half[w0] > 4).sort((a, b) => b.half[w0] - a.half[w0]).slice(0, pos === 'QB' || pos === 'TE' ? 12 : 30);
      const a = sum(top.map(p => p.proj[w0] || 0)), b = sum(top.map(p => p.half[w0]));
      return b ? (a - b) / b : 0;
    };
    const boosts = { QB: boostFor('QB'), RB: boostFor('RB'), WR: boostFor('WR'), TE: boostFor('TE') };
    if (sc.rec_fd) notes.push({ key: 'rec_fd', text: `Every receiving first down is worth ${fmtNum(sc.rec_fd)} pt. Players who catch the ball for chains score far more here than standard rankings say.` });
    if (sc.rush_fd) notes.push({ key: 'rush_fd', text: `Every rushing first down is worth ${fmtNum(sc.rush_fd)} pt, which lifts goal-line and early-down backs.` });
    if (sc.rec != null) notes.push({ key: 'rec', text: sc.rec === 0.5 ? 'Half a point per catch.' : sc.rec === 1 ? 'A full point per catch.' : sc.rec ? `${fmtNum(sc.rec)} pts per catch.` : 'No points per catch.' });
    if (sc.pass_td && sc.pass_td <= 4) notes.push({ key: 'pass_td', text: `Passing touchdowns are worth ${fmtNum(sc.pass_td)}, so quarterbacks are deep. Don't pay up for one.` });
    if (sc.bonus_rec_te) notes.push({ key: 'te', text: `Tight ends get +${fmtNum(sc.bonus_rec_te)} a catch.` });
    if (sc.fgm_yds_over_30 || sc.fgmiss_0_19 || sc.fgmiss_20_29) notes.push({ key: 'k', text: `Kickers earn ${fmtNum(sc.fgm || 0)} per make plus ${fmtNum(sc.fgm_yds_over_30 || 0)} for every yard past 30, and lose up to ${fmtNum(Math.abs(Math.min(sc.fgmiss_0_19 || 0, sc.fgmiss_20_29 || 0)))} for a short miss. Favour big legs in domes.` });
    if (sc.def_3_and_out) notes.push({ key: 'def', text: `Defences get ${fmtNum(sc.def_3_and_out)} pt per three-and-out${sc.def_4_and_stop ? ' and per fourth-down stop' : ''}, but no defence is reliably better at them. The betting line is the best guide: start the one whose opponent is expected to score least.` });
    return { notes, boosts };
  }
  function fmtNum(n) { return (Math.round(n * 100) / 100).toString(); }

  const api = {
    load, computeValues, optimize, strength, lineupCall, waiverCalls, waiverPlan, evalTrade, tradeIdeas,
    positionRanks, benchLoss, byesAhead, scoringNotes, isLocked, weekPts, kickoff, gameOf, faStatus,
    activeIds, eligible, SLOT_LABEL, FPOS, scoreStats, defBoard, defPlan, DEF_LINE,
  };
  // Always on the global too: the bundler may hand this file a `module` object of its own.
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.HQ = api;
})(typeof window !== 'undefined' ? window : globalThis);
