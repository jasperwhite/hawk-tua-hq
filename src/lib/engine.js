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
    if (pos === 'DEF' && defRates) {
      for (const k of ['def_3_and_out', 'def_4_and_stop']) {
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

    /* defence extras the projections leave out (three-and-outs, fourth-down stops) */
    const defRatesByTeam = {}; const allDef = [];
    for (const p of Object.values(P)) {
      if (p.pos !== 'DEF' || !p.ytd || !p.ytd.gp) continue;
      const r = { def_3_and_out: (p.ytd.stats.def_3_and_out || 0) / p.ytd.gp, def_4_and_stop: (p.ytd.stats.def_4_and_stop || 0) / p.ytd.gp };
      defRatesByTeam[p.id] = r; allDef.push(r);
    }
    const defAvg = {
      def_3_and_out: allDef.length ? avg(allDef.map(r => r.def_3_and_out)) : 3,
      def_4_and_stop: allDef.length ? avg(allDef.map(r => r.def_4_and_stop)) : 0.5,
    };
    const defRates = id => {
      const own = defRatesByTeam[id]; if (!own) return defAvg;
      // shrink toward league average: a few games is a small sample
      return { def_3_and_out: (own.def_3_and_out + defAvg.def_3_and_out) / 2, def_4_and_stop: (own.def_4_and_stop + defAvg.def_4_and_stop) / 2 };
    };

    for (const p of Object.values(P)) {
      const dr = p.pos === 'DEF' ? defRates(p.id) : null;
      for (const w of projWeeks) {
        const raw = p.projRaw[w]; if (!raw) continue;
        p.proj[w] = scoreStats(fillProjection(raw, p.pos, scoring, dr), scoring);
        p.half[w] = raw.pts_half_ppr || 0;
      }
      if (p.ytd) p.ytd.pts = scoreStats(p.ytd.stats, scoring);
        if (p.pre) p.pre.pts = scoreStats(fillProjection(p.pre.stats, p.pos, scoring, dr ? { def_3_and_out: dr.def_3_and_out * 17, def_4_and_stop: dr.def_4_and_stop * 17 } : null), scoring);
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
      players: P, teams, teamByRid, games, plays, byeWeek, kick, live, matchups,
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
    if (sc.def_3_and_out) notes.push({ key: 'def', text: `Defences get ${fmtNum(sc.def_3_and_out)} pt per three-and-out${sc.def_4_and_stop ? ' and per fourth-down stop' : ''}, so stingy units beat ball-hawks.` });
    return { notes, boosts };
  }
  function fmtNum(n) { return (Math.round(n * 100) / 100).toString(); }

  const api = {
    load, computeValues, optimize, strength, lineupCall, waiverCalls, waiverPlan, evalTrade, tradeIdeas,
    positionRanks, benchLoss, byesAhead, scoringNotes, isLocked, weekPts, kickoff, gameOf, faStatus,
    activeIds, eligible, SLOT_LABEL, FPOS, scoreStats,
  };
  // Always on the global too: the bundler may hand this file a `module` object of its own.
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.HQ = api;
})(typeof window !== 'undefined' ? window : globalThis);
