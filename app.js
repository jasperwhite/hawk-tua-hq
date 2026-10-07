/* Hawk Tua HQ — the page. Asks engine.js for the calls and lays them out. */
(function () {
  'use strict';

  const VERSION = '0.1.0';
  const DEFAULT_LEAGUE = '1312056164149641216';
  const DEFAULT_USER = 'jasperwhite';
  const TABS = [
    ['brief', 'Brief'], ['lineup', 'Lineup'], ['waivers', 'Waivers'], ['trades', 'Trades'],
    ['rankings', 'Rankings'], ['team', 'Team'], ['news', 'News'],
  ];
  const POS_NAME = { QB: 'quarterback', RB: 'running back', WR: 'receiver', TE: 'tight end', K: 'kicker', DEF: 'defence', FLEX: 'flex', SUPER_FLEX: 'superflex', WRRB_FLEX: 'flex', REC_FLEX: 'flex' };
  const POS_PLURAL = { QB: 'Quarterbacks', RB: 'Running backs', WR: 'Receivers', TE: 'Tight ends', K: 'Kickers', DEF: 'Defences' };

  const store = {
    get(k) { try { return localStorage.getItem('hq.' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('hq.' + k, v); } catch (e) { /* private window */ } },
  };

  let L = null, RID = null, memo = {};
  const ui = { tab: 'brief', rkPos: 'ALL', rkOwn: 'all', rkQ: '', rkLimit: 60, faPos: 'ALL', tbTeam: null, tbGive: new Set(), tbGet: new Set() };

  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => (Math.round((n || 0) * 10) / 10).toFixed(1);
  const f0 = n => Math.round(n || 0).toLocaleString();
  const sgn = n => (n >= 0 ? '+' : '−') + f1(Math.abs(n));
  const num = (s, extra) => `<span class="num${extra ? ' ' + extra : ''}">${s}</span>`;
  const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
  const chip = (t, cls, title) => `<span class="chip ${cls || ''}"${title ? ` title="${esc(title)}"` : ''}>${esc(t)}</span>`;
  const plural = (n, a, b) => `${n} ${n === 1 ? a : (b || a + 's')}`;

  const tfmt = new Intl.DateTimeFormat('en-AU', { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
  const dfmt = new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
  const tidy = s => s.replace(/\s?([ap])\.?m\.?/i, (m, x) => x.toLowerCase() + 'm').replace(/,/g, '').replace(':00', '');
  const when = ms => ms ? tidy(tfmt.format(new Date(ms))) : '';
  const whenLong = ms => ms ? tidy(dfmt.format(new Date(ms))) : '';
  const ago = ms => {
    const m = Math.round((Date.now() - ms) / 60000);
    if (m < 60) return `${m}m ago`; const h = Math.round(m / 60);
    if (h < 36) return `${h}h ago`; return `${Math.round(h / 24)}d ago`;
  };

  /* ---------- memoised engine calls for the chosen team ---------- */
  function get(key) {
    const k = RID + ':' + key;
    if (memo[k] !== undefined) return memo[k];
    const f = {
      lineup: () => HQ.lineupCall(L, RID),
      plan: () => HQ.waiverPlan(L, RID, 3),
      waivers: () => HQ.waiverCalls(L, RID),
      trades: () => HQ.tradeIdeas(L, RID, 8),
      notes: () => HQ.scoringNotes(L),
      ranks: () => HQ.positionRanks(L),
      bench: () => HQ.benchLoss(L),
      byes: () => HQ.byesAhead(L, RID),
    }[key];
    return (memo[k] = f());
  }
  const P = id => L.players[id];
  const team = rid => L.teamByRid[rid == null ? RID : rid];

  /* ---------- small renderers ---------- */
  function statusChip(p) {
    if (!p.team) return chip('No team', 'bad');
    if (!L.plays(p.team, L.week)) return chip('Bye', 'bad');
    const s = p.inj; if (!s) return '';
    const m = { Questionable: ['Q', 'q'], Doubtful: ['Doubtful', 'bad'], Out: ['Out', 'bad'], IR: ['IR', 'bad'], PUP: ['PUP', 'bad'], Sus: ['Suspended', 'bad'], NA: ['N/A', 'bad'] }[s] || [s, 'q'];
    return chip(m[0], m[1], p.injBody ? `${s} · ${p.injBody}` : s);
  }
  function game(p) {
    if (!p.team) return '';
    const g = HQ.gameOf(L, p.team);
    if (!g) return 'Bye';
    const k = HQ.kickoff(L, p.team);
    return `${g.home ? 'vs' : '@'} ${g.opp}${k ? ` · ${when(k)}` : ''}`;
  }
  function pcell(p, extra) {
    return `<div class="pl"><span class="pl-name">${esc(p.name)}</span><span class="pl-meta">${p.pos} · ${p.team || 'FA'} ${statusChip(p)}${extra || ''}</span></div>`;
  }
  function form(p) {
    const ws = L.pastWeeks.slice(-3);
    if (!ws.length) return '';
    return `<span class="form">${ws.map(w => (p.form && p.form[w] != null ? f1(p.form[w]) : '–')).join(' · ')}</span>`;
  }
  function ownerName(p) { return p.owner != null ? team(p.owner).name : 'Free agent'; }
  function whyOut(p) {
    if (!p.team) return 'has no team';
    if (!L.plays(p.team, L.week)) return 'is on bye';
    if (p.inj && ['Out', 'IR', 'PUP', 'Sus', 'NA'].includes(p.inj)) return `is ${p.inj === 'IR' ? 'on IR' : 'out'}`;
    if (p.inj === 'Doubtful') return 'is doubtful';
    return 'projects next to nothing';
  }
  function faLine(a) {
    if (a.status === 'free') {
      return L.waiver.type === 'faab' ? 'Free agent now, so no bid needed.' : `Free agent now: add in Sleeper straight away and keep your #${team().waiver || '–'} waiver spot.`;
    }
    const run = L.waiver.nextRun ? ` until ${whenLong(L.waiver.nextRun)}` : '';
    if (L.waiver.type === 'faab') return `On waivers${run}. Bid ${num('$' + (a.bid || 0))} of your ${num('$' + team().faabLeft)}.`;
    return `On waivers${run}. A claim sends you to the back of the waiver line.`;
  }
  function deal(r) {
    const n = ids => ids.map(id => `<strong>${esc(P(id).name)}</strong>`).join(' + ');
    return `${n(r.give)} for ${n(r.get)}`;
  }

  /* ---------- masthead ---------- */
  function renderMast() {
    const t = team();
    $('#m-kicker').textContent = `${L.name} · Week ${L.week} of ${L.lastWeek}`;
    $('#m-team').textContent = t.name;
    document.title = `${t.name} HQ`;
    const rec = `${t.wins}–${t.losses}${t.ties ? '–' + t.ties : ''}`;
    const wv = L.waiver.type === 'faab' ? `${num('$' + t.faabLeft)} FAAB left` : `${num('#' + (t.waiver || '–'))} on waivers`;
    $('#m-line').innerHTML = `<span>${num(rec)}</span><span>${num(ord(t.rank))} of ${L.nTeams}</span><span>${num(f1(t.pf))} pts for</span><span>${wv}</span>`;

    const weeks = [];
    for (let w = 1; w <= L.lastWeek; w++) {
      const c = ['wk'];
      if (w < L.week) c.push('past');
      if (w === L.week) c.push('now');
      if (w >= L.playoffStart) c.push('po');
      if (L.tradeDeadline && w === L.tradeDeadline) c.push('dl');
      weeks.push(`<div class="${c.join(' ')}" title="Week ${w}">${w}</div>`);
    }
    $('#ruler').style.setProperty('--weeks', L.lastWeek);
    $('#ruler').innerHTML = weeks.join('');
    $('#ruler-key').innerHTML = `<span><i style="background:var(--accent)"></i>This week</span><span><i style="height:10px;background:repeating-linear-gradient(135deg,var(--muted) 0 2px,transparent 2px 5px)"></i>Playoffs from week ${L.playoffStart}</span>${L.tradeDeadline ? `<span><i style="background:var(--bad);width:2px;height:10px"></i>Trade deadline after week ${L.tradeDeadline}</span>` : ''}`;

    $('#f-meta').textContent = `Loaded ${when(L.loadedAt)} · v${VERSION}`;

    const sel = $('#team-select');
    sel.innerHTML = L.teams.slice().sort((a, b) => a.name.localeCompare(b.name))
      .map(x => `<option value="${x.rid}"${x.rid === RID ? ' selected' : ''}>${esc(x.name)}</option>`).join('');
  }

  function renderTabs() {
    $('#tabs').innerHTML = TABS.map(([k, label]) => `<button class="tab" role="tab" type="button" data-tab="${k}" aria-selected="${ui.tab === k}">${label}</button>`).join('');
  }

  /* ---------- BRIEF ---------- */
  function scoreboard(lc) {
    const t = team();
    if (!lc.opp) return `<div class="board"><div class="side"><span class="tname">${esc(t.name)}</span><span class="big">${f1(lc.optTotal)}</span></div><div class="vs">BYE</div><div class="side r"><span class="tname">No opponent this week</span></div></div>`;
    const wp = Math.round(lc.opp.winProb * 100);
    return `<div class="board">
      <div class="side"><span class="tname">${esc(t.name)}</span><span class="big">${f1(lc.optTotal)}</span></div>
      <div class="vs">VS</div>
      <div class="side r"><span class="tname">${esc(lc.opp.team.name)}</span><span class="big">${f1(lc.opp.proj)}</span></div>
      <div class="foot">
        <div class="wp" role="img" aria-label="${wp}% chance to win"><span style="width:${wp}%"></span></div>
        <p>${num(wp + '%')} to win if you make the calls below and they set their best lineup. ${lc.opp.team.wins}–${lc.opp.team.losses}, ${ord(lc.opp.team.rank)} in the league.</p>
      </div>
    </div>`;
  }

  function lineupCard(lc) {
    const items = [];
    let verdict = '', flag = false;
    const plan = get('plan');
    for (const h of lc.holes) {
      const holder = h.id ? P(h.id) : null;
      const fix = plan.find(a => HQ.eligible(P(a.add), h.slot));
      const label = POS_NAME[h.slot] || h.slot;
      if (!verdict) {
        verdict = holder ? `${esc(holder.name)} ${whyOut(holder)} and nobody on your bench can play ${label}.` : `Your ${label} spot is empty.`;
        flag = true;
      }
      if (fix) items.push(`Pick up <strong>${esc(P(fix.add).name)}</strong> to start there: ${num(f1(P(fix.add).thisWk))} projected. ${fix.status === 'free' ? 'Free agent now.' : 'On waivers.'}`);
    }
    if (lc.swaps.length) {
      if (!verdict) verdict = lc.swaps.length === 1
        ? `Start ${esc(P(lc.swaps[0].start).name)}${lc.swaps[0].sit ? ` over ${esc(P(lc.swaps[0].sit).name)}` : ''}.`
        : `Make ${lc.swaps.length} changes to your lineup.`;
      lc.swaps.forEach(s => items.push(`Start <strong>${esc(P(s.start).name)}</strong>${s.sit ? `, sit ${esc(P(s.sit).name)}` : ''}: ${num(sgn(s.gain))}`));
    }
    if (!verdict) verdict = 'Your lineup is already your best one.';
    lc.close.slice(0, 2).forEach(c => items.push(`Close call: ${esc(P(c.start).name)} over ${esc(P(c.alt).name)} by ${num(f1(c.margin))}. Check news before kickoff.`));
    if (lc.empty) items.push(`${plural(lc.empty, 'starting spot')} empty in Sleeper right now.`);
    return { k: 'Lineup', verdict, items, flag, tab: 'lineup' };
  }

  function gainLine(a) {
    if (a.perWk < 0.3 && a.now > 1) return `${num(sgn(a.now))} this week. A one-week fill-in.`;
    if (a.now < 0.3) return `${num(sgn(a.perWk))} a week from next week.`;
    return `${num(sgn(a.now))} this week, ${num(sgn(a.perWk))} a week after.`;
  }
  const moveName = a => `Add ${esc(P(a.add).name)}${a.drop ? `, drop ${esc(P(a.drop).name)}` : ''}`;

  function waiverCard() {
    const plan = get('plan');
    if (!plan.length) return { k: 'Waivers', verdict: 'Nothing on the wire beats what you have.', items: [`You keep your ${num('#' + (team().waiver || '–'))} waiver spot for when someone breaks out.`], tab: 'waivers' };
    if (plan.length === 1) return { k: 'Waivers', verdict: moveName(plan[0]) + '.', items: [gainLine(plan[0]), faLine(plan[0])], tab: 'waivers' };
    const allFree = plan.every(a => a.status === 'free');
    const items = plan.map(a => `<strong>${moveName(a)}</strong>: ${gainLine(a)}`);
    if (allFree && L.waiver.type !== 'faab') items.push(`Add them in Sleeper now and you keep your ${num('#' + (team().waiver || '–'))} waiver spot.`);
    return { k: 'Waivers', verdict: `${plan.length} pickups${allFree ? ', all free agents now' : ''}.`, items, tab: 'waivers' };
  }

  function tradeCard() {
    const ideas = get('trades');
    if (L.tradeDeadline && L.week > L.tradeDeadline) return { k: 'Trade', verdict: 'The trade deadline has passed.', items: [], tab: 'trades' };
    if (!ideas.length) return { k: 'Trade', verdict: 'No trade clearly helps both sides right now.', items: ['Check again after waivers run. Rosters shift every week.'], tab: 'trades' };
    const r = ideas[0];
    const items = [];
    const why = tradeWhy(r);
    if (why) items.push(why);
    items.push(`You gain ${num(sgn(r.dA))} a week, ${esc(r.team.name)} gain ${num(sgn(r.dB))}. Both lineups improve, so it has a real chance.`);
    if (L.hasMarket) items.push(`Market value: you send ${num(f0(r.mGive))}, get ${num(f0(r.mGet))}.`);
    return { k: 'Trade', verdict: `Offer ${r.give.map(id => esc(P(id).name)).join(' + ')} to ${esc(r.team.name)} for ${r.get.map(id => esc(P(id).name)).join(' + ')}.`, items, tab: 'trades' };
  }

  function tradeWhy(r) {
    const ranks = get('ranks')[RID];
    const got = r.get.map(id => P(id).pos);
    const weak = ['QB', 'RB', 'WR', 'TE'].filter(pos => got.includes(pos)).sort((a, b) => ranks[b].rank - ranks[a].rank)[0];
    if (weak && ranks[weak].rank >= Math.ceil(L.nTeams / 2)) return `Fixes ${POS_NAME[weak]}, where your starters rank ${num(ord(ranks[weak].rank))} of ${L.nTeams}.`;
    if (r.give.length > r.get.length) return 'Turns two of your players into one better starter, and frees a bench spot.';
    if (r.get.length > r.give.length) return 'Splits one player into two starters for your thinner spots.';
    return null;
  }

  function watchCard(lc) {
    const items = [];
    const starters = lc.opt.filter(Boolean).map(P);
    lc.watch.forEach(p => items.push(`<strong>${esc(p.name)}</strong> is ${esc((p.inj || '').toLowerCase())}${p.injBody ? ` (${esc(p.injBody.toLowerCase())})` : ''}. Check before ${when(HQ.kickoff(L, p.team)) || 'kickoff'}.`));
    const kicks = Object.values(L.kick).map(k => k.at).filter(Boolean).sort((a, b) => a - b);
    if (kicks.length) {
      const first = kicks[0];
      const early = starters.filter(p => p.team && HQ.kickoff(L, p.team) === first && !HQ.isLocked(L, p.id));
      if (first > Date.now()) items.push(early.length
        ? `<strong>${early.map(p => esc(p.name)).join(', ')}</strong> play${early.length === 1 ? 's' : ''} first, locking ${num(when(first))}.`
        : `First game locks ${num(when(first))}. None of your starters play in it.`);
    }
    const next = L.week + 1;
    if (next <= L.lastWeek) {
      const off = starters.filter(p => p.team && !L.plays(p.team, next));
      if (off.length) items.push(`Week ${next} byes: ${off.map(p => esc(p.name)).join(', ')}. Plan the cover now.`);
    }
    if (L.tradeDeadline && L.week <= L.tradeDeadline && L.tradeDeadline - L.week <= 3) items.push(`Trade deadline is after week ${L.tradeDeadline}.`);
    const verdict = lc.watch.length ? `${esc(lc.watch[0].name)} is ${esc((lc.watch[0].inj || '').toLowerCase())}.` : 'No injury worries in your lineup.';
    return { k: 'Watch', verdict, items, tab: 'news' };
  }

  function callCard(c) {
    return `<article class="call${c.flag ? ' flag' : ''}">
      <span class="kicker">${c.k}</span>
      <p class="verdict">${c.verdict}</p>
      ${c.items.length ? `<ul>${c.items.map(i => `<li>${i}</li>`).join('')}</ul>` : ''}
      <button class="fbtn more" type="button" data-go="${c.tab}">Open ${c.tab}</button>
    </article>`;
  }

  function viewBrief() {
    const lc = get('lineup');
    const sn = get('notes');
    const bl = get('bench');
    const cards = [lineupCard(lc), waiverCard(), tradeCard(), watchCard(lc)];
    const bmax = Math.max(...Object.values(sn.boosts).map(Math.abs), 0.01);

    let bench = '';
    if (L.pastWeeks.length && bl[RID]) {
      const mine = bl[RID];
      const left = mine.reduce((s, x) => s + x.left, 0);
      const table = Object.entries(bl).map(([rid, ws]) => ({ rid: +rid, left: ws.reduce((s, x) => s + x.left, 0) })).sort((a, b) => a.left - b.left);
      const least = table.findIndex(x => x.rid === RID) + 1, most = L.nTeams - least + 1;
      const wmax = Math.max(...mine.map(x => x.left), 1);
      bench = `<section>
        <div class="sec-head"><h2>Points left on your bench</h2><span class="kicker">Weeks 1–${L.pastWeeks.length}</span></div>
        <p class="lede">You've left ${num(f1(left))} points on your bench, the ${most <= least ? (most === 1 ? 'most' : ord(most) + ' most') : (least === 1 ? 'least' : ord(least) + ' least')} in the league. Best possible lineup each week, with hindsight, against the one you played.</p>
        <div class="bars">${mine.map(x => `<div class="bar-row"><span class="lab">WK ${x.week}</span><div class="bar-track"><span style="width:${(x.left / wmax) * 100}%"></span></div><span class="r num">${f1(x.left)}</span></div>`).join('')}</div>
      </section>`;
    }

    return `<section>${scoreboard(lc)}</section>
      <section aria-label="This week's calls"><div class="calls">${cards.map(callCard).join('')}</div></section>
      <section>
        <div class="sec-head"><h2>Why these aren't normal rankings</h2><span class="kicker">${esc(L.name)} scoring</span></div>
        <div class="split">
          <div class="bars" aria-label="Points versus standard half-PPR">
            <p class="lede">What the top players at each position score in your league, against the same stat lines in standard half-PPR.</p>
            ${['QB', 'RB', 'WR', 'TE'].map(pos => { const b = sn.boosts[pos]; return `<div class="bar-row"><span class="lab">${pos}</span><div class="bar-track"><span style="width:${Math.max(0, b) / bmax * 100}%"></span></div><span class="r num">${b >= 0 ? '+' : '−'}${Math.abs(Math.round(b * 100))}%</span></div>`; }).join('')}
          </div>
          <ul class="notes">${sn.notes.map(n => `<li>${esc(n.text)}</li>`).join('')}</ul>
        </div>
      </section>
      ${bench}`;
  }

  /* ---------- LINEUP ---------- */
  function viewLineup() {
    const lc = get('lineup');
    const curSet = new Set(lc.cur.filter(Boolean));
    const optSet = new Set(lc.opt.filter(Boolean));
    const closeIds = new Set(lc.close.map(c => c.start));
    const pts = id => lc.pts(P(id));
    const row = (slot, id) => {
      if (!id) return `<tr><td class="slot">${HQ.SLOT_LABEL[slot] || slot}</td><td colspan="4" class="muted">Nobody available</td></tr>`;
      const p = P(id);
      const tags = [];
      if (lc.locked(id)) tags.push(chip('Locked'));
      else if (!curSet.has(id)) tags.push(chip('In', 'in'));
      if (closeIds.has(id)) tags.push(chip('Close', 'q'));
      return `<tr><td class="slot">${HQ.SLOT_LABEL[slot] || slot}</td><td>${pcell(p, tags.join(' '))}</td><td class="wide">${esc(game(p))}</td><td class="wide">${form(p)}</td><td class="r">${num(f1(pts(id)))}</td></tr>`;
    };
    const benchRows = lc.bench.map(P).sort((a, b) => lc.pts(b) - lc.pts(a)).map(p => {
      const tag = curSet.has(p.id) && !optSet.has(p.id) ? chip('Out', 'out') : '';
      return `<tr class="dim"><td class="slot">BN</td><td>${pcell(p, tag)}</td><td class="wide">${esc(game(p))}</td><td class="wide">${form(p)}</td><td class="r">${f1(lc.pts(p))}</td></tr>`;
    }).join('');
    const reserve = team().reserve.map(P).filter(Boolean);
    const swaps = lc.swaps.length
      ? `<ol class="steps">${lc.swaps.map(s => `<li><span class="what">Start ${esc(P(s.start).name)}${s.sit ? `, bench ${esc(P(s.sit).name)}` : ''}</span><span class="why">${num(sgn(s.gain))} projected. In Sleeper: tap ${esc(s.sit ? P(s.sit).short : 'the empty slot')}, then pick ${esc(P(s.start).short)}.</span></li>`).join('')}</ol>`
      : `<p class="lede"><strong>No changes.</strong> The lineup you have set is the best one on your roster.</p>`;
    const plan = get('plan');
    const holes = lc.holes.map(h => {
      const fix = plan.find(a => HQ.eligible(P(a.add), h.slot));
      const what = h.id ? `${esc(P(h.id).name)} ${whyOut(P(h.id))}` : `Your ${POS_NAME[h.slot] || h.slot} spot is empty`;
      return `<p class="lede"><strong>${what}.</strong> Nobody on your bench can cover it. ${fix ? `Add <strong>${esc(P(fix.add).name)}</strong>${fix.drop ? ` (drop ${esc(P(fix.drop).name)})` : ''} to start there: ${num(f1(P(fix.add).thisWk))} projected.` : 'Nobody on the wire helps either.'}</p>`;
    }).join('');
    return `<section>
        <div class="sec-head"><h2>Week ${L.week} lineup</h2><span class="kicker">Best ${num(f1(lc.optTotal))} · as set ${num(f1(lc.curTotal))}</span></div>
        ${holes}${swaps}
      </section>
      <section>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Slot</th><th>Player</th><th class="wide">Game · your time</th><th class="wide">Last 3</th><th class="r">Proj</th></tr></thead>
          <tbody>${lc.slots.map((s, i) => row(s, lc.opt[i])).join('')}${benchRows}
          ${reserve.map(p => `<tr class="dim"><td class="slot">IR</td><td>${pcell(p)}</td><td class="wide">${esc(game(p))}</td><td class="wide">${form(p)}</td><td class="r">–</td></tr>`).join('')}</tbody>
        </table></div>
        <p class="lede">Projections are Sleeper's stat lines, re-scored with your league's settings. Questionable players are marked down 15%, doubtful 75%. Once a game starts the player locks and shows the live score.</p>
      </section>`;
  }

  /* ---------- WAIVERS ---------- */
  function viewWaivers() {
    const plan = get('plan');
    const wc = get('waivers');
    const t = team();
    const rules = L.waiver.type === 'faab'
      ? `You have ${num('$' + t.faabLeft)} of ${num('$' + L.waiver.budget)} FAAB left.`
      : `You're ${num('#' + (t.waiver || '–'))} of ${L.nTeams} on rolling waivers: use a claim and you drop to last. Free agents cost nothing, so grab them first.`;
    const runTxt = L.waiver.nextRun ? ` Next waiver run: ${num(whenLong(L.waiver.nextRun))}.` : '';
    const planHtml = plan.length
      ? `<ol class="steps">${plan.map(a => `<li><span class="what">${moveName(a)}</span><span class="why">${gainLine(a)} ${faLine(a)}</span></li>`).join('')}</ol>`
      : `<p class="lede"><strong>Hold.</strong> No free agent improves your team enough to be worth a roster spot.</p>`;

    const pos = ui.faPos;
    const list = L.freeAgents.filter(p => pos === 'ALL' ? true : p.pos === pos)
      .sort((a, b) => pos === 'ALL' ? b.vorp - a.vorp : (pos === 'K' || pos === 'DEF') ? b.thisWk - a.thisWk : b.ros - a.ros).slice(0, 40);
    const filt = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'].map(x => `<button class="fbtn" type="button" data-fapos="${x}" aria-pressed="${pos === x}">${x === 'ALL' ? 'All' : x}</button>`).join('');
    return `<section>
        <div class="sec-head"><h2>Your waiver plan</h2><span class="kicker">In this order</span></div>
        <p class="lede">${rules}${runTxt}</p>
        ${planHtml}
      </section>
      <section>
        <div class="sec-head"><h2>Free agents</h2><span class="kicker">Ranked for your scoring</span></div>
        <div class="filters">${filt}</div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Player</th><th class="wide">Game</th><th class="r">This wk</th><th class="r">Per wk</th><th class="r wide">Value</th><th class="r wide">Adds 24h</th><th>Status</th></tr></thead>
          <tbody>${list.map(p => `<tr><td>${pcell(p)}</td><td class="wide">${esc(game(p))}</td><td class="r">${num(f1(p.thisWk))}</td><td class="r">${f1(p.rosWk)}</td><td class="r wide">${f0(p.vorp)}</td><td class="r wide">${L.trending[p.id] ? f0(L.trending[p.id]) : '–'}</td><td>${HQ.faStatus(L, p) === 'free' ? chip('Free agent', 'in') : chip('Waivers')}</td></tr>`).join('')}</tbody>
        </table></div>
        <p class="lede">Per wk is expected points for the rest of the season, byes included. Value is points above a replacement-level starter over that stretch. Adds 24h counts pickups across all Sleeper leagues.</p>
      </section>`;
  }

  /* ---------- TRADES ---------- */
  function viewTrades() {
    const ideas = get('trades');
    if (ui.tbTeam == null) ui.tbTeam = (ideas[0] && ideas[0].team.rid) || L.teams.find(t => t.rid !== RID).rid;
    const ideasHtml = ideas.length
      ? `<div class="ideas">${ideas.map((r, i) => `<div class="idea">
          <p class="deal">Send ${deal(r)} <span class="muted">· ${esc(r.team.name)}</span></p>
          <button class="fbtn" type="button" data-idea="${i}">Try it</button>
          <div class="meta"><span>You ${num(sgn(r.dA))}/wk</span><span>Them ${num(sgn(r.dB))}/wk</span>${L.hasMarket ? `<span>Market ${f0(r.mGive)} → ${f0(r.mGet)}</span>` : ''}${tradeWhy(r) ? `<span>${tradeWhy(r)}</span>` : ''}</div>
        </div>`).join('')}</div>`
      : `<p class="lede"><strong>Nothing clean right now.</strong> No one-for-one or two-for-one deal makes both teams better.</p>`;
    const deadline = L.tradeDeadline ? ` Deadline: after week ${L.tradeDeadline}.` : '';
    return `<section>
        <div class="sec-head"><h2>Trades that help both teams</h2><span class="kicker">Best deals first</span></div>
        <p class="lede">Every one-for-one and two-for-one swap with every team, judged by what it does to <strong>both</strong> starting lineups for the rest of the season. A deal only shows if the other side improves too and the market values are close, so it has a real chance of being accepted.${deadline}</p>
        ${ideasHtml}
      </section>
      <section id="builder-sec">${builder()}</section>`;
  }

  function builder() {
    const other = team(ui.tbTeam);
    const list = (t, set, side) => HQ.activeIds(t).map(P).filter(Boolean).sort((a, b) => b.vorp - a.vorp).map(p =>
      `<label class="pick"><input type="checkbox" data-side="${side}" value="${esc(p.id)}"${set.has(p.id) ? ' checked' : ''}><span>${pcell(p)}</span><span class="num">${f1(p.rosWk)}</span></label>`).join('');
    return `<div class="sec-head"><h2>Trade builder</h2><span class="kicker">Points per week, rest of season</span></div>
      <div class="builder">
        <div class="filters"><label class="kicker" for="tb-team">Trade with</label>
          <select class="ctl" id="tb-team">${L.teams.filter(t => t.rid !== RID).map(t => `<option value="${t.rid}"${t.rid === ui.tbTeam ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
          <button class="fbtn" type="button" id="tb-clear">Clear</button></div>
        <div class="verdict-box" id="tb-result">${builderResult()}</div>
        <div class="tb-cols">
          <div><p class="kicker">You send</p><div class="picks">${list(team(), ui.tbGive, 'give')}</div></div>
          <div><p class="kicker">You get from ${esc(other.name)}</p><div class="picks">${list(other, ui.tbGet, 'get')}</div></div>
        </div>
      </div>`;
  }

  function builderResult() {
    const give = [...ui.tbGive], getIds = [...ui.tbGet];
    if (!give.length && !getIds.length) return `<p class="lede">Tick players on both sides to see what the deal does to each lineup.</p>`;
    const r = HQ.evalTrade(L, RID, ui.tbTeam, give, getIds);
    const other = team(ui.tbTeam);
    let v;
    if (r.dA > 0.4 && r.dB > 0.1) v = 'Good for both of you. Send it.';
    else if (r.dA > 0.4) v = `Good for you, worse for ${esc(other.name)}. Expect a no.`;
    else if (r.dA < -0.4) v = 'Bad for you. Pass.';
    else v = 'About even. Only worth it if you need the roster spot or the bye cover.';
    const names = ids => ids.map(id => esc(P(id).name)).join(', ');
    const notes = [];
    if (r.aDrops.length) notes.push(`You'd have to drop ${names(r.aDrops)}.`);
    if (r.aAdds.length) notes.push(`Frees a spot; best pickup would be ${names(r.aAdds)}.`);
    if (r.bDrops.length) notes.push(`They'd have to drop ${names(r.bDrops)}.`);
    return `<p class="verdict">${v}</p>
      <div class="vb-grid">
        <div><span class="kicker">You</span>${num(sgn(r.dA) + '/wk')}</div>
        <div><span class="kicker">${esc(other.name)}</span>${num(sgn(r.dB) + '/wk')}</div>
        ${L.hasMarket ? `<div><span class="kicker">Market: send / get</span>${num(f0(r.mGive) + ' / ' + f0(r.mGet))}</div>` : ''}
      </div>
      ${notes.length ? `<p class="lede">${notes.join(' ')}</p>` : ''}`;
  }

  /* ---------- RANKINGS ---------- */
  function viewRankings() {
    const q = ui.rkQ.trim().toLowerCase();
    let list = Object.values(L.players).filter(p => p.rank);
    if (ui.rkPos !== 'ALL') list = list.filter(p => p.pos === ui.rkPos);
    if (ui.rkOwn === 'fa') list = list.filter(p => p.owner == null);
    if (ui.rkOwn === 'mine') list = list.filter(p => p.owner === RID);
    if (q) list = list.filter(p => p.name.toLowerCase().includes(q));
    list.sort((a, b) => a.rank - b.rank);
    const total = list.length;
    list = list.slice(0, ui.rkLimit);
    const pos = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'].map(x => `<button class="fbtn" type="button" data-rkpos="${x}" aria-pressed="${ui.rkPos === x}">${x === 'ALL' ? 'All' : x}</button>`).join('');
    const own = [['all', 'Everyone'], ['fa', 'Free agents'], ['mine', 'Mine']].map(([k, l]) => `<button class="fbtn" type="button" data-rkown="${k}" aria-pressed="${ui.rkOwn === k}">${l}</button>`).join('');
    const mk = p => {
      const m = L.market[p.id]; if (!m) return { txt: '–', tag: '' };
      const d = m.posRank - p.posRank;
      let tag = '';
      if (d >= 5 && p.owner != null && p.owner !== RID) tag = chip('Buy', 'acc', `Market: ${p.pos}${m.posRank}. Your scoring: ${p.pos}${p.posRank}`);
      if (d <= -5 && p.owner === RID) tag = chip('Sell', 'q', `Market: ${p.pos}${m.posRank}. Your scoring: ${p.pos}${p.posRank}`);
      return { txt: `${p.pos}${m.posRank}`, tag };
    };
    return `<section>
        <div class="sec-head"><h2>Player values</h2><span class="kicker">Rest of season · your scoring</span></div>
        <p class="lede">Ranked by points above a replacement-level starter for the rest of the season, scored your league's way. <strong>Market</strong> is each player's rank from real trades in similar leagues. A big gap is your edge: <strong>Buy</strong> players your scoring likes more than the market does, <strong>Sell</strong> the opposite.</p>
        <div class="filters">${pos}</div>
        <div class="filters">${own}<input class="ctl search" id="rk-q" type="search" placeholder="Find a player" value="${esc(ui.rkQ)}" aria-label="Find a player"></div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th class="r">#</th><th>Player</th><th class="wide">Team</th><th class="r">Pos</th><th class="r">This wk</th><th class="r">Per wk</th><th class="r">Value</th>${L.hasMarket ? '<th class="r wide">Market</th><th></th>' : ''}<th class="r wide">vs half-PPR</th></tr></thead>
          <tbody>${list.map(p => { const m = mk(p); return `<tr class="${p.owner === RID ? 'mine' : ''}"><td class="r muted">${p.rank}</td><td>${pcell(p)}</td><td class="wide muted">${esc(ownerName(p))}</td><td class="r">${p.pos}${p.posRank}</td><td class="r">${f1(p.thisWk)}</td><td class="r">${num(f1(p.rosWk))}</td><td class="r">${f0(p.vorp)}</td>${L.hasMarket ? `<td class="r wide muted">${m.txt}</td><td>${m.tag}</td>` : ''}<td class="r wide muted">${p.boost == null || p.pos === 'K' || p.pos === 'DEF' ? '–' : (p.boost >= 0 ? '+' : '−') + Math.abs(Math.round(p.boost * 100)) + '%'}</td></tr>`; }).join('')}</tbody>
        </table></div>
        ${total > ui.rkLimit ? `<button class="fbtn more" type="button" id="rk-more">Show ${Math.min(60, total - ui.rkLimit)} more</button>` : ''}
      </section>`;
  }

  /* ---------- TEAM ---------- */
  function viewTeam() {
    const t = team();
    const ranks = get('ranks');
    const mine = ranks[RID];
    const byes = get('byes');
    const standings = L.teams.slice().sort((a, b) => a.rank - b.rank);
    const groups = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    const roster = HQ.activeIds(t).concat(t.reserve).map(P).filter(Boolean).sort((a, b) => b.vorp - a.vorp);
    return `<section>
        <div class="sec-head"><h2>Where you're strong</h2><span class="kicker">Starters vs the league, rest of season</span></div>
        <div class="bars">${groups.map(g => { const r = mine[g]; return `<div class="bar-row"><span class="lab">${g}</span><div class="bar-track"><span style="width:${((L.nTeams - r.rank + 1) / L.nTeams) * 100}%"></span></div><span class="r"><span class="num">${ord(r.rank)}</span> <span class="muted">of ${L.nTeams}</span></span></div>`; }).join('')}</div>
        <p class="lede">Your best lineup projects ${num(f1(mine.total.pts))} a week for the rest of the season, ${ord(mine.total.rank)} in the league.</p>
      </section>
      <section>
        <div class="sec-head"><h2>Roster</h2><span class="kicker">By value</span></div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Player</th><th class="r">Bye</th><th class="r">This wk</th><th class="r">Per wk</th><th class="r">Value</th><th class="wide">Last 3</th></tr></thead>
          <tbody>${roster.map(p => `<tr${t.reserve.includes(p.id) ? ' class="dim"' : ''}><td>${pcell(p, t.reserve.includes(p.id) ? chip('IR slot') : '')}</td><td class="r">${L.byeWeek[p.team] || '–'}</td><td class="r">${f1(p.thisWk)}</td><td class="r">${num(f1(p.rosWk))}</td><td class="r">${f0(p.vorp)}</td><td class="wide">${form(p)}</td></tr>`).join('')}</tbody>
        </table></div>
      </section>
      <section>
        <div class="sec-head"><h2>Byes ahead</h2><span class="kicker">Your starters</span></div>
        ${byes.length ? `<div class="tbl-wrap"><table class="tbl"><tbody>${byes.map(b => `<tr><td class="slot">WK ${b.week}</td><td>${b.out.map(p => esc(p.name)).join(', ')}</td><td class="r">${b.out.length > 1 ? chip(b.out.length + ' out', 'bad') : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="lede">None of your starters have a bye left.</p>'}
      </section>
      <section>
        <div class="sec-head"><h2>Standings</h2><span class="kicker">Top ${L.league.settings.playoff_teams || 4} make the playoffs</span></div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th class="r">#</th><th>Team</th><th class="r">W–L</th><th class="r">Pts for</th><th class="r wide">Pts against</th><th class="r wide">Strength</th><th class="r wide">Waiver</th></tr></thead>
          <tbody>${standings.map(s => `<tr class="${s.rid === RID ? 'mine' : ''}"><td class="r muted">${s.rank}</td><td><div class="pl"><span class="pl-name">${esc(s.name)}</span><span class="pl-meta">${esc(s.user)}</span></div></td><td class="r">${s.wins}–${s.losses}${s.ties ? '–' + s.ties : ''}</td><td class="r">${num(f1(s.pf))}</td><td class="r wide">${f1(s.pa)}</td><td class="r wide">${ord(ranks[s.rid].total.rank)}</td><td class="r wide">${L.waiver.type === 'faab' ? '$' + s.faabLeft : '#' + (s.waiver || '–')}</td></tr>`).join('')}</tbody>
        </table></div>
        <p class="lede">Strength ranks each team's best lineup for the rest of the season.</p>
      </section>`;
  }

  /* ---------- NEWS ---------- */
  const newsCache = {};
  function viewNews() {
    const t = team();
    const ids = HQ.activeIds(t).concat(t.reserve);
    const inj = ids.map(P).filter(p => p && p.inj);
    const injHtml = inj.length
      ? `<div class="tbl-wrap"><table class="tbl"><tbody>${inj.map(p => `<tr><td>${pcell(p)}</td><td>${esc([p.inj, p.injBody, p.injNotes].filter(Boolean).join(' · '))}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="lede">Nobody on your roster carries an injury tag.</p>';
    const key = RID;
    if (!newsCache[key]) loadNews(key, ids);
    const items = newsCache[key] && newsCache[key].items;
    const newsHtml = !items ? '<p class="lede">Fetching the latest notes on your players…</p>'
      : !items.length ? '<p class="lede">No recent notes on your players.</p>'
      : `<div class="news">${items.slice(0, 30).map(n => `<article><span class="kicker">${esc(n.player)} · ${ago(n.at)}</span><h3>${esc(n.headline)}</h3>${n.story ? `<p>${esc(n.story)}</p>` : ''}</article>`).join('')}</div>`;
    return `<section>
        <div class="sec-head"><h2>Injury report</h2><span class="kicker">Your roster</span></div>
        ${injHtml}
      </section>
      <section>
        <div class="sec-head"><h2>Player notes</h2><span class="kicker">RotoWire via ESPN</span></div>
        ${newsHtml}
      </section>`;
  }
  async function loadNews(key, ids) {
    newsCache[key] = { items: null };
    const targets = ids.map(P).filter(p => p && L.market[p.id] && L.market[p.id].espnId);
    const res = await Promise.all(targets.map(p =>
      fetch(`https://site.api.espn.com/apis/fantasy/v2/games/ffl/news/players?limit=8&playerId=${L.market[p.id].espnId}`)
        .then(r => r.ok ? r.json() : null).catch(() => null)
        .then(d => ((d && d.feed) || []).filter(x => x.type === 'Rotowire').slice(0, 3).map(x => ({ player: p.name, headline: x.headline, story: trimStory(x.story), at: Date.parse(x.published) })))));
    const seen = new Set();
    newsCache[key].items = [].concat(...res).filter(x => x.headline && !seen.has(x.headline) && seen.add(x.headline)).sort((a, b) => b.at - a.at);
    if (ui.tab === 'news' && RID === key) render();
  }
  function trimStory(s) {
    if (!s) return '';
    const t = s.replace(/<[^>]+>/g, '').trim();
    const cut = t.split(/(?<=\.)\s/).slice(0, 2).join(' ');
    return cut.length > 320 ? cut.slice(0, 317) + '…' : cut;
  }

  /* ---------- shell ---------- */
  function render() {
    renderTabs();
    const v = { brief: viewBrief, lineup: viewLineup, waivers: viewWaivers, trades: viewTrades, rankings: viewRankings, team: viewTeam, news: viewNews }[ui.tab] || viewBrief;
    try { $('#view').innerHTML = v(); }
    catch (e) { console.error(e); $('#view').innerHTML = `<div class="state"><p class="verdict">This section hit a snag.</p><p class="lede">${esc(e.message)}</p></div>`; }
  }

  function setTab(k, push) {
    ui.tab = TABS.some(t => t[0] === k) ? k : 'brief';
    if (push) { try { history.replaceState(null, '', '#' + ui.tab); } catch (e) { location.hash = ui.tab; } }
    render();
    if (push) window.scrollTo({ top: Math.max(0, $('.tabs-bar').offsetTop - 1), behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  function pickTeam() {
    const saved = +store.get('rid:' + L.leagueId);
    if (saved && L.teamByRid[saved]) return saved;
    const me = L.teams.find(t => t.user && t.user.toLowerCase() === DEFAULT_USER);
    return (me || L.teams[0]).rid;
  }

  async function boot() {
    const leagueId = store.get('league') || DEFAULT_LEAGUE;
    $('#lg-id').value = leagueId;
    const steps = ['Reading your league', 'Pulling projections and stats', 'Scoring every player your way'];
    const done = new Set();
    const paint = () => { $('#view').innerHTML = `<div class="state"><p class="verdict">Getting this week's calls ready.</p><ul class="steps-load">${steps.map(s => `<li class="${done.has(s) ? 'done' : ''}">${s}</li>`).join('')}</ul></div>`; };
    paint();
    try {
      L = await HQ.load(leagueId, m => { const i = steps.indexOf(m); steps.slice(0, i).forEach(s => done.add(s)); paint(); });
      memo = {};
      RID = pickTeam();
      ui.tbTeam = null; ui.tbGive.clear(); ui.tbGet.clear();
      renderMast();
      const h = (location.hash || '').slice(1);
      setTab(h || ui.tab, false);
    } catch (e) {
      console.error(e);
      $('#view').innerHTML = `<div class="state"><p class="verdict">Couldn't load the league.</p><p class="lede">${esc(e.message)}. Check the league ID below, or your connection, then try again.</p><button class="ctl" type="button" id="retry">Try again</button></div>`;
    }
  }

  /* ---------- events ---------- */
  document.addEventListener('click', e => {
    const tab = e.target.closest('[data-tab]'); if (tab) return setTab(tab.dataset.tab, true);
    const go = e.target.closest('[data-go]'); if (go) return setTab(go.dataset.go, true);
    const fp = e.target.closest('[data-fapos]'); if (fp) { ui.faPos = fp.dataset.fapos; return render(); }
    const rp = e.target.closest('[data-rkpos]'); if (rp) { ui.rkPos = rp.dataset.rkpos; ui.rkLimit = 60; return render(); }
    const ro = e.target.closest('[data-rkown]'); if (ro) { ui.rkOwn = ro.dataset.rkown; ui.rkLimit = 60; return render(); }
    if (e.target.closest('#rk-more')) { ui.rkLimit += 60; return render(); }
    const idea = e.target.closest('[data-idea]');
    if (idea) {
      const r = get('trades')[+idea.dataset.idea];
      ui.tbTeam = r.team.rid; ui.tbGive = new Set(r.give); ui.tbGet = new Set(r.get);
      $('#builder-sec').innerHTML = builder();
      $('#builder-sec').scrollIntoView({ block: 'start' });
      return;
    }
    if (e.target.closest('#tb-clear')) { ui.tbGive.clear(); ui.tbGet.clear(); $('#builder-sec').innerHTML = builder(); return; }
    if (e.target.closest('#refresh') || e.target.closest('#retry')) return boot();
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'team-select') {
      RID = +e.target.value; store.set('rid:' + L.leagueId, RID);
      ui.tbTeam = null; ui.tbGive.clear(); ui.tbGet.clear();
      renderMast(); render(); return;
    }
    if (e.target.id === 'tb-team') { ui.tbTeam = +e.target.value; ui.tbGet.clear(); $('#builder-sec').innerHTML = builder(); return; }
    if (e.target.matches('.pick input')) {
      const set = e.target.dataset.side === 'give' ? ui.tbGive : ui.tbGet;
      e.target.checked ? set.add(e.target.value) : set.delete(e.target.value);
      $('#tb-result').innerHTML = builderResult();
    }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'rk-q') {
      ui.rkQ = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const el = $('#rk-q'); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (x) { /* ignore */ } }
    }
  });
  $('#lg-form').addEventListener('submit', e => {
    e.preventDefault();
    const id = ($('#lg-id').value || '').trim().replace(/\D/g, '');
    if (!id) return;
    store.set('league', id); boot();
  });
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (L && h && h !== ui.tab) setTab(h, false); });

  boot();
})();
