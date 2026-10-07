"""Build the team-week DEF dataset (2024, 2025, 2026 wk1-4) from cached Sleeper / ESPN / FantasyPros JSON.

Everything that is a 'prior' feature uses only weeks before the game (and the previous season).
Output: data.json (all rows, all features) and defs_weekly.csv (the columns Jasper asked for).
"""
import json, os, csv, math
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
C = os.path.join(HERE, 'cache')
J = lambda f: json.load(open(os.path.join(C, f)))

SC = J('league.json')['scoring_settings']
NWEEKS = {2024: 18, 2025: 18, 2026: 4}
ESPN2SLP = {'WSH': 'WAS', 'JAC': 'JAX', 'LA': 'LAR'}


def score(st, sc=SC):
    return sum(v * sc[k] for k, v in st.items() if k in sc and v)


# ---- component groups (league scoring) ----
GROUPS = {
    'stops': ['def_3_and_out', 'def_4_and_stop'],
    'pa_tier': [k for k in SC if k.startswith('pts_allow_')],
    'sacks': ['sack'],
    'turnovers': ['int', 'fum_rec'],
    'tds': ['def_td', 'def_st_td', 'st_td'],
    'other': ['safe', 'blk_kick', 'def_st_fum_rec', 'st_fum_rec', 'st_ff', 'def_2pt', 'def_st_ff', 'ff'],
}


def components(st):
    return {g: sum(st.get(k, 0) * SC.get(k, 0) for k in ks) for g, ks in GROUPS.items()}


PA_TIERS = [(0, 0, 'pts_allow_0'), (1, 6, 'pts_allow_1_6'), (7, 13, 'pts_allow_7_13'), (14, 20, 'pts_allow_14_20'),
            (21, 27, 'pts_allow_21_27'), (28, 34, 'pts_allow_28_34'), (35, 999, 'pts_allow_35p')]


def tier_pts(pa):
    for lo, hi, k in PA_TIERS:
        if lo <= pa <= hi:
            return SC.get(k, 0)
    return SC.get('pts_allow_35p', 0)


def expected_tier_pts(mu, sd=9.5):
    """Expected league points-allowed-tier score if points allowed ~ Normal(mu, sd), discretised to integers."""
    tot = wsum = 0.0
    for pa in range(0, 70):
        w = math.exp(-0.5 * ((pa - mu) / sd) ** 2)
        tot += w * tier_pts(pa)
        wsum += w
    return tot / wsum


# ---- odds ----
def load_odds(season):
    out = {}
    for w in range(1, NWEEKS[season] + 1):
        for e in J(f'espn_sb_{season}_{w}.json').get('events', []):
            comp = e['competitions'][0]
            ha = {c['homeAway']: ESPN2SLP.get(c['team']['abbreviation'], c['team']['abbreviation']) for c in comp['competitors']}
            fp = os.path.join(C, f'espn_core_odds_{e["id"]}.json')
            spread = ou = None
            if os.path.exists(fp):
                items = [i for i in json.load(open(fp)).get('items', []) if 'Live' not in i.get('provider', {}).get('name', '')]
                for it in items:
                    s, t = it.get('spread'), it.get('overUnder')
                    if s is None:
                        try:
                            s = float(it['homeTeamOdds']['close']['pointSpread']['american'])
                        except Exception:
                            s = None
                    if t is None:
                        try:
                            t = float(it['close']['total']['american'])
                        except Exception:
                            t = None
                    if s is not None and t is not None:
                        # sanity: sign of home spread must agree with favourite flag when available
                        fav = it.get('homeTeamOdds', {}).get('favorite')
                        if fav is True and s > 0: s = -s
                        if fav is False and it.get('awayTeamOdds', {}).get('favorite') is True and s < 0: s = -s
                        spread, ou = float(s), float(t)
                        break
            out[(w, ha['home'], ha['away'])] = (spread, ou, e['id'])
    return out


def load_ecr(season):
    out = {}
    for w in range(1, NWEEKS[season] + 1):
        fp = os.path.join(C, f'fp_ecr_{season}_{w}.json')
        if not os.path.exists(fp):
            continue
        d = json.load(open(fp))
        for p in d['players']:
            t = ESPN2SLP.get(p['player_team_id'], p['player_team_id'])
            out[(w, t)] = int(p['rank_ecr'])
    return out


# ---- raw rows ----
raw = {}
for season, nw in NWEEKS.items():
    sched = J(f'schedule_{season}.json')
    homeof = {}
    for g in sched:
        homeof[(g['week'], g['home'])] = (1, g['away'])
        homeof[(g['week'], g['away'])] = (0, g['home'])
    odds = load_odds(season)
    ecr = load_ecr(season) if season >= 2025 else {}
    rows = []
    for w in range(1, nw + 1):
        stats = {r['team']: r for r in J(f'stats_{season}_{w}.json') if r['stats'].get('gp')}
        proj = {r['team']: r['stats'] for r in J(f'proj_{season}_{w}.json')}
        for t, r in stats.items():
            st = r['stats']
            opp = r.get('opponent')
            home, opp2 = homeof.get((w, t), (None, None))
            opp = opp or opp2
            if home is None:
                print('no schedule', season, w, t)
            o = odds.get((w, t, opp)) if home == 1 else odds.get((w, opp, t))
            spread_home, ou, eid = o if o else (None, None, None)
            if spread_home is not None:
                team_spread = spread_home if home == 1 else -spread_home  # negative = favourite
                implied_team = ou / 2 - team_spread / 2
                implied_opp = ou / 2 + team_spread / 2
            else:
                team_spread = implied_team = implied_opp = None
            p = proj.get(t, {})
            comp = components(st)
            rows.append(dict(
                season=season, week=w, team=t, opp=opp, home=home,
                proj_half=p.get('pts_half_ppr', 0.0),
                proj_league_raw=score(p),
                proj_pa=p.get('pts_allow'), proj_sack=p.get('sack', 0), proj_int=p.get('int', 0), proj_fr=p.get('fum_rec', 0),
                proj_td=p.get('def_td', 0) + p.get('st_td', 0), proj_pass_int_td=p.get('pass_int_td', 0),
                proj_tier=sum(p.get(k, 0) * SC.get(k, 0) for k in SC if k.startswith('pts_allow_')),
                ecr_rank=ecr.get((w, t)),
                total=ou, spread=team_spread, implied_total=implied_opp, implied_own=implied_team,
                actual_half=st.get('pts_half_ppr', 0.0), actual_league=score(st),
                three_and_outs=st.get('def_3_and_out', 0), fourth_down_stops=st.get('def_4_and_stop', 0),
                pts_allowed=st.get('pts_allow', 0.0), sacks=st.get('sack', 0), ints=st.get('int', 0), fum_rec=st.get('fum_rec', 0),
                tds=st.get('def_td', 0) + st.get('def_st_td', 0) + st.get('st_td', 0),
                forced_punts=st.get('def_forced_punts', 0), yds_allowed=st.get('yds_allow'),
                comp_stops=comp['stops'], comp_pa=comp['pa_tier'], comp_sacks=comp['sacks'], comp_to=comp['turnovers'],
                comp_tds=comp['tds'], comp_other=comp['other'],
                game_date=r.get('date'),
            ))
    raw[season] = rows

# pts_allowed missing on a few rows -> recompute from tier key presence is impossible; fall back to opponent score not available.
# ---- prior-only features ----
MEANS = {}


def season_team_rates(rows):
    """per-team totals over the given rows: defensive (forced) and offensive (allowed) sides"""
    d = defaultdict(lambda: defaultdict(float))
    for r in rows:
        a = d[('D', r['team'])]
        a['g'] += 1; a['tao'] += r['three_and_outs']; a['fds'] += r['fourth_down_stops']; a['sack'] += r['sacks']
        a['to'] += r['ints'] + r['fum_rec']; a['lg'] += r['actual_league']; a['half'] += r['actual_half']
        a['pa'] += r['pts_allowed'] or 0; a['splash'] += r['comp_sacks'] + r['comp_to'] + r['comp_tds'] + r['comp_other']
        b = d[('O', r['opp'])]  # the opponent offense allowed these to this DEF
        b['g'] += 1; b['tao'] += r['three_and_outs']; b['fds'] += r['fourth_down_stops']; b['sack'] += r['sacks']
        b['to'] += r['ints'] + r['fum_rec']; b['lg'] += r['actual_league']; b['half'] += r['actual_half']
        b['pa'] += r['pts_allowed'] or 0
    return d


FEATS = ['tao', 'fds', 'sack', 'to', 'lg', 'pa']
FVAL = {'tao': lambda x: x['three_and_outs'], 'fds': lambda x: x['fourth_down_stops'], 'sack': lambda x: x['sacks'],
        'to': lambda x: x['ints'] + x['fum_rec'], 'lg': lambda x: x['actual_league'], 'pa': lambda x: x['pts_allowed'] or 0}
K_SHRINK = 4.0  # games of prior weight


def add_priors(season, prev_rows):
    rows = raw[season]
    prev = season_team_rates(prev_rows) if prev_rows else None
    lgmean_prev = {}
    if prev_rows:
        n = len(prev_rows)
        for f, key in [('tao', 'three_and_outs'), ('fds', 'fourth_down_stops'), ('sack', 'sacks'), ('lg', 'actual_league'), ('pa', 'pts_allowed')]:
            lgmean_prev[f] = sum((r[key] or 0) for r in prev_rows) / n
        lgmean_prev['to'] = sum(r['ints'] + r['fum_rec'] for r in prev_rows) / n
    for r in rows:
        w = r['week']
        before = [x for x in rows if x['week'] < w]
        cur = season_team_rates(before)
        n_all = len(before)
        # league average this season so far (team-average of per-game rates, like the tool), fallback prev season / tool constants
        if n_all:
            tool_avg_tao = sum(cur[('D', t)]['tao'] / cur[('D', t)]['g'] for (s, t) in cur if s == 'D') / sum(1 for (s, t) in cur if s == 'D')
            tool_avg_fds = sum(cur[('D', t)]['fds'] / cur[('D', t)]['g'] for (s, t) in cur if s == 'D') / sum(1 for (s, t) in cur if s == 'D')
        else:
            tool_avg_tao, tool_avg_fds = 3.0, 0.5  # engine.js constants when no YTD
        own = cur.get(('D', r['team']))
        r['ytd_g'] = own['g'] if own else 0
        r['ytd_tao_rate'] = own['tao'] / own['g'] if own else None
        r['ytd_fds_rate'] = own['fds'] / own['g'] if own else None
        r['lg_avg_tao'] = tool_avg_tao
        r['lg_avg_fds'] = tool_avg_fds
        r['ytd_lg_ppg'] = own['lg'] / own['g'] if own else None
        oo = cur.get(('O', r['opp']))
        r['opp_ytd_g'] = oo['g'] if oo else 0
        r['opp_allowed_lg_ppg'] = oo['lg'] / oo['g'] if oo else None
        # shrunk estimates: (ytd_sum + K * prior) / (ytd_g + K), prior = 50/50 prev-season team rate and prev league mean
        for side, key in (('D', r['team']), ('O', r['opp'])):
            c = cur.get((side, key))
            p = prev.get((side, key)) if prev else None
            for f in FEATS:
                m = lgmean_prev.get(f)
                if m is None:  # no previous season loaded -> league mean so far this season
                    m = (sum(FVAL[f](x) for x in before) / n_all) if n_all else None
                prior = m
                if p and p['g'] and m is not None:
                    prior = 0.5 * p[f] / p['g'] + 0.5 * m
                cs, cg = (c[f], c['g']) if c else (0.0, 0)
                if prior is None:
                    est = cs / cg if cg else None
                else:
                    est = (cs + K_SHRINK * prior) / (cg + K_SHRINK)
                r[f'{"def" if side == "D" else "opp"}_{f}_est'] = est


add_priors(2024, None)
add_priors(2025, raw[2024])
add_priors(2026, raw[2025])

# ---- patched projections (tool method, several weights) ----
for s in raw:
    for r in raw[s]:
        for wgt in (0.0, 0.25, 0.5, 0.75, 1.0):
            if r['ytd_tao_rate'] is None:
                tao, fds = r['lg_avg_tao'], r['lg_avg_fds']
            else:
                tao = wgt * r['ytd_tao_rate'] + (1 - wgt) * r['lg_avg_tao']
                fds = wgt * r['ytd_fds_rate'] + (1 - wgt) * r['lg_avg_fds']
            r[f'proj_patched_w{int(wgt*100)}'] = r['proj_league_raw'] + SC['def_3_and_out'] * tao + SC['def_4_and_stop'] * fds
        r['proj_league_patched'] = r['proj_patched_w50']
        # cleaned projection: drop the pass_int_td (-2) quirk, smooth the points-allowed tier
        clean = r['proj_league_raw'] - r['proj_pass_int_td'] * SC.get('pass_int_td', 0)
        r['proj_league_clean'] = clean
        r['proj_smooth_tier'] = expected_tier_pts(r['proj_pa']) if r['proj_pa'] is not None else r['proj_tier']
        r['proj_league_patched_smooth'] = clean - r['proj_tier'] + r['proj_smooth_tier'] + r['def_tao_est'] * SC['def_3_and_out'] + r['def_fds_est'] * SC['def_4_and_stop'] if r['def_tao_est'] is not None else None

json.dump({str(k): v for k, v in raw.items()}, open(os.path.join(HERE, 'data.json'), 'w'))

cols = ['season', 'week', 'team', 'opp', 'home', 'proj_half', 'proj_league_raw', 'proj_league_patched', 'ecr_rank', 'implied_total', 'spread',
        'actual_half', 'actual_league', 'three_and_outs', 'fourth_down_stops', 'pts_allowed', 'sacks', 'ints', 'fum_rec', 'tds']
with open(os.path.join(HERE, 'defs_weekly.csv'), 'w', newline='') as f:
    wr = csv.writer(f)
    wr.writerow(cols)
    for s in (2025, 2026):
        for r in sorted(raw[s], key=lambda x: (x['week'], x['team'])):
            wr.writerow([('' if r[c] is None else (round(r[c], 2) if isinstance(r[c], float) else r[c])) for c in cols])

for s in raw:
    rs = raw[s]
    print(s, 'rows', len(rs), 'odds missing', sum(1 for r in rs if r['implied_total'] is None),
          'ecr missing', sum(1 for r in rs if r['ecr_rank'] is None), 'pa missing', sum(1 for r in rs if r['pts_allowed'] is None))
