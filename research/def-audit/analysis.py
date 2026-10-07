"""DEF audit analysis. Reads data.json (from build.py) + cached QB stats; writes results.md (tables) and results.json."""
import json, os, math
from collections import defaultdict
import numpy as np
import warnings
warnings.filterwarnings('ignore', category=RuntimeWarning)  # spurious matmul warnings from numpy 2.0 + Accelerate; results verified against scipy
from scipy.stats import spearmanr, pearsonr

HERE = os.path.dirname(os.path.abspath(__file__))
C = os.path.join(HERE, 'cache')
D = {int(k): v for k, v in json.load(open(os.path.join(HERE, 'data.json'))).items()}
OUT = []
RES = {}


def P(*a):
    s = ' '.join(str(x) for x in a)
    print(s)
    OUT.append(s)


def table(headers, rows, fmt=None):
    P('| ' + ' | '.join(headers) + ' |')
    P('|' + '|'.join(['---'] * len(headers)) + '|')
    for r in rows:
        P('| ' + ' | '.join(f'{x:.2f}' if isinstance(x, float) else ('' if x is None else str(x)) for x in r) + ' |')
    P('')


def mean(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else None


# ------------------------------------------------------------------ QB features
def qb_features():
    starts = defaultdict(int)  # qb id -> starts so far (since 2024 wk1)
    out = {}
    for season, nw in ((2024, 18), (2025, 18), (2026, 4)):
        for w in range(1, nw + 1):
            rows = json.load(open(os.path.join(C, f'qbstats_{season}_{w}.json')))
            byteam = defaultdict(list)
            for r in rows:
                st = r['stats']
                if st.get('gp') and r.get('team'):
                    byteam[r['team']].append(r)
            for t, rs in byteam.items():
                rs.sort(key=lambda r: (r['stats'].get('gs', 0), r['stats'].get('pass_att', 0)), reverse=True)
                q = rs[0]
                ye = q['player'].get('years_exp')
                rookie = (ye is not None and season == 2026 - ye)
                out[(season, w, t)] = dict(qb=f"{q['player'].get('first_name','')} {q['player'].get('last_name','')}", qb_id=q['player_id'],
                                           prior_starts=starts[q['player_id']], rookie=rookie)
            for t, rs in byteam.items():
                starts[rs[0]['player_id']] += 1
    return out


QB = qb_features()
for s in D:
    for r in D[s]:
        q = QB.get((s, r['week'], r['opp']))
        r['opp_qb'] = q['qb'] if q else None
        r['opp_qb_rookie'] = int(q['rookie']) if q else 0
        r['opp_qb_prior_starts'] = q['prior_starts'] if q else None
        r['opp_qb_new'] = int(q is not None and q['prior_starts'] < 4) if s >= 2025 else None  # window starts 2024 wk1

# ------------------------------------------------------------------ Q1 leaderboard
P('## Q1 Leaderboard\n')


def leaderboard(season, weeks):
    rows = [r for r in D[season] if r['week'] in weeks]
    agg = defaultdict(lambda: defaultdict(float))
    for r in rows:
        a = agg[r['team']]
        a['g'] += 1; a['half'] += r['actual_half']; a['lg'] += r['actual_league']
        a['tao'] += r['three_and_outs']; a['fds'] += r['fourth_down_stops']
        for c in ('comp_stops', 'comp_pa', 'comp_sacks', 'comp_to', 'comp_tds', 'comp_other'):
            a[c] += r[c]
    teams = sorted(agg)
    half_rank = {t: i + 1 for i, t in enumerate(sorted(teams, key=lambda t: -agg[t]['half'] / agg[t]['g']))}
    lg_rank = {t: i + 1 for i, t in enumerate(sorted(teams, key=lambda t: -agg[t]['lg'] / agg[t]['g']))}
    out = []
    for t in sorted(teams, key=lambda t: lg_rank[t]):
        a = agg[t]
        out.append(dict(team=t, g=int(a['g']), half_tot=a['half'], half_ppg=a['half'] / a['g'], lg_tot=a['lg'], lg_ppg=a['lg'] / a['g'],
                        rank_half=half_rank[t], rank_lg=lg_rank[t], change=half_rank[t] - lg_rank[t],
                        tao_pg=a['tao'] / a['g'], fds_pg=a['fds'] / a['g'],
                        stops_pg=a['comp_stops'] / a['g'], pa_pg=a['comp_pa'] / a['g'],
                        splash_pg=(a['comp_sacks'] + a['comp_to'] + a['comp_tds'] + a['comp_other']) / a['g']))
    tot = {c: sum(r[c] for r in rows) for c in ('comp_stops', 'comp_pa', 'comp_sacks', 'comp_to', 'comp_tds', 'comp_other', 'actual_league')}
    return out, tot, len(rows)


for season, weeks, label in ((2025, range(1, 19), '2025 weeks 1-18'), (2026, range(1, 5), '2026 weeks 1-4')):
    lb, tot, n = leaderboard(season, weeks)
    RES[f'leaderboard_{season}'] = lb
    P(f'### {label} ({n} team-games). Ranked by league points per game.\n')
    table(['League rank', 'DEF', 'G', 'League pts', 'League ppg', 'Half-PPR pts', 'Half ppg', 'Half rank', 'Rank change', '3&O/g', '4th stops/g', 'Stops pts/g', 'PA-tier pts/g', 'Splash pts/g'],
          [[r['rank_lg'], r['team'], r['g'], r['lg_tot'], r['lg_ppg'], r['half_tot'], r['half_ppg'], r['rank_half'],
            (f"+{r['change']}" if r['change'] > 0 else str(r['change'])), r['tao_pg'], r['fds_pg'], r['stops_pg'], r['pa_pg'], r['splash_pg']] for r in lb])
    T = tot['actual_league']
    comp = [('Three-and-outs + 4th-down stops', tot['comp_stops']), ('Points-allowed tiers (net)', tot['comp_pa']), ('Sacks', tot['comp_sacks']),
            ('INT + fumble recoveries', tot['comp_to']), ('Defensive / ST TDs', tot['comp_tds']), ('Other (safeties, blocks, ST fumbles, 2pt)', tot['comp_other'])]
    RES[f'composition_{season}'] = {k: v for k, v in comp}
    P(f'Composition of league DEF points, {label}:\n')
    table(['Source', 'Points', 'Per team-game', 'Share of net total'], [[k, v, v / n, f'{100 * v / T:.0f}%'] for k, v in comp] + [['Total', T, T / n, '100%']])
    # how different are the two rankings
    rh = [r['rank_half'] for r in lb]; rl = [r['rank_lg'] for r in lb]
    P(f'Spearman between half-PPR and league rankings ({label}): {spearmanr(rh, rl)[0]:.2f}; mean |rank change| {mean([abs(r["change"]) for r in lb]):.1f}; '
      f'teams moving 5+ places: {sum(1 for r in lb if abs(r["change"]) >= 5)}\n')
    # gap between top and bottom in stops vs splash
    sp = [r['stops_pg'] for r in lb]; pa = [r['pa_pg'] for r in lb]; spl = [r['splash_pg'] for r in lb]
    P(f'Between-team spread (sd of per-game values across teams) {label}: stops {np.std(sp):.2f}, PA tier {np.std(pa):.2f}, splash {np.std(spl):.2f}\n')

# ------------------------------------------------------------------ Q2 stability
P('## Q2 Stability\n')


def team_rates(rows, fn):
    acc = defaultdict(list)
    for r in rows:
        acc[r['team']].append(fn(r))
    return {t: sum(v) / len(v) for t, v in acc.items()}


def off_rates(rows, fn):
    acc = defaultdict(list)
    for r in rows:
        acc[r['opp']].append(fn(r))
    return {t: sum(v) / len(v) for t, v in acc.items()}


def corr_maps(a, b, method='pearson'):
    ks = sorted(set(a) & set(b))
    x = [a[k] for k in ks]; y = [b[k] for k in ks]
    return (pearsonr(x, y)[0] if method == 'pearson' else spearmanr(x, y)[0]), len(ks)


def between_share(rows, fn, key='team'):
    """share of game-level variance attributable to stable team differences (one-way random-effects ICC, ANOVA estimator)."""
    acc = defaultdict(list)
    for r in rows:
        acc[r[key]].append(fn(r))
    groups = list(acc.values())
    k = len(groups); N = sum(len(g) for g in groups); gm = sum(sum(g) for g in groups) / N
    ssb = sum(len(g) * (sum(g) / len(g) - gm) ** 2 for g in groups)
    ssw = sum(sum((x - sum(g) / len(g)) ** 2 for x in g) for g in groups)
    msb = ssb / (k - 1); msw = ssw / (N - k); n0 = N / k
    icc = (msb - msw) / (msb + (n0 - 1) * msw)
    return max(icc, 0.0), icc


METRICS = [
    ('Three-and-outs forced', lambda r: r['three_and_outs']),
    ('4th-down stops', lambda r: r['fourth_down_stops']),
    ('Stops points (3&O + 4th)', lambda r: r['comp_stops']),
    ('Points allowed', lambda r: r['pts_allowed']),
    ('PA-tier points', lambda r: r['comp_pa']),
    ('Sacks', lambda r: r['sacks']),
    ('Turnovers (INT+FR)', lambda r: r['ints'] + r['fum_rec']),
    ('Splash points (sacks+TO+TD+other)', lambda r: r['comp_sacks'] + r['comp_to'] + r['comp_tds'] + r['comp_other']),
    ('League DEF points', lambda r: r['actual_league']),
    ('Half-PPR DEF points', lambda r: r['actual_half']),
]
stab_rows = []
for name, fn in METRICS:
    r25 = D[2025]
    h1 = team_rates([r for r in r25 if r['week'] <= 9], fn); h2 = team_rates([r for r in r25 if r['week'] >= 10], fn)
    odd = team_rates([r for r in r25 if r['week'] % 2 == 1], fn); even = team_rates([r for r in r25 if r['week'] % 2 == 0], fn)
    full24 = team_rates(D[2024], fn); full25 = team_rates(r25, fn); ytd26 = team_rates(D[2026], fn)
    c_h, _ = corr_maps(h1, h2); c_oe, _ = corr_maps(odd, even); c_ss, _ = corr_maps(full24, full25); c_26, _ = corr_maps(full25, ytd26)
    icc, _ = between_share(r25, fn)
    # offence side: same stat as allowed by the opposing offence
    o1 = off_rates([r for r in r25 if r['week'] <= 9], fn); o2 = off_rates([r for r in r25 if r['week'] >= 10], fn)
    co, _ = corr_maps(o1, o2)
    icc_o, _ = between_share(r25, fn, key='opp')
    # lag-1: same team, consecutive games, 2025
    pairs = []
    byt = defaultdict(list)
    for r in sorted(r25, key=lambda r: r['week']):
        byt[r['team']].append(fn(r))
    for t, v in byt.items():
        pairs += list(zip(v[:-1], v[1:]))
    lag1 = pearsonr([a for a, b in pairs], [b for a, b in pairs])[0]
    n50 = (1 - icc) / icc if icc > 0 else float('inf')
    stab_rows.append([name, c_h, c_oe, c_ss, c_26, lag1, icc, f'{n50:.0f}' if n50 < 1000 else 'never', co, icc_o])
RES['stability'] = stab_rows
P('Correlation across the 32 teams of per-game rates (Pearson r). "Team share" = share of single-game variance explained by stable team differences in 2025 (ICC). Offence columns = the same stat as conceded by the opposing offence.\n')
table(['Stat', 'DEF: 2025 wk1-9 vs wk10-18', 'DEF: odd vs even wks 2025', 'DEF: 2024 vs 2025', 'DEF: 2025 vs 2026 wk1-4', 'DEF: game-to-next-game r', 'DEF team share of game variance', 'Games before rate is 50% signal', 'Offence: wk1-9 vs wk10-18', 'Offence team share'], stab_rows)
P('Rough 95% noise band for r with 32 teams: about +/-0.35.\n')

# week-to-week predictability from prior-only estimates
P('Game-level correlation of prior-only (shrunk) estimates with what happened, 2025 wk1-18 + 2026 wk1-4 (week-1 estimates lean on the previous season):\n')
pp = [r for s in (2025, 2026) for r in D[s] if r['def_tao_est'] is not None and r['opp_tao_est'] is not None]
rows_pp = []
for lab, est, act in [('3&O: DEF prior rate', 'def_tao_est', lambda r: r['three_and_outs']),
                      ('3&O: opponent offence prior rate allowed', 'opp_tao_est', lambda r: r['three_and_outs']),
                      ('Sacks: DEF prior rate', 'def_sack_est', lambda r: r['sacks']),
                      ('Sacks: opponent prior allowed', 'opp_sack_est', lambda r: r['sacks']),
                      ('Turnovers: DEF prior rate', 'def_to_est', lambda r: r['ints'] + r['fum_rec']),
                      ('Turnovers: opponent prior allowed', 'opp_to_est', lambda r: r['ints'] + r['fum_rec']),
                      ('Pts allowed: Vegas opp implied total', 'implied_total', lambda r: r['pts_allowed'])]:
    x = [r[est] for r in pp]; y = [act(r) for r in pp]
    rows_pp.append([lab, len(pp), pearsonr(x, y)[0]])
x1 = np.array([[1, r['def_tao_est'], r['opp_tao_est'], r['implied_total']] for r in pp]); y1 = np.array([r['three_and_outs'] for r in pp])
b = np.linalg.lstsq(x1, y1, rcond=None)[0]; rr = np.corrcoef(x1 @ b, y1)[0, 1]
rows_pp.append(['3&O: DEF rate + opp rate + Vegas (in-sample multiple R)', len(pp), rr])
table(['Prediction', 'n', 'r'], rows_pp)
RES['prior_predictability'] = rows_pp

# ------------------------------------------------------------------ Q3 accuracy
P('## Q3 Projection accuracy\n')


def fill_baselines():
    for s in D:
        prev = {}
        if s - 1 in D:
            prev = team_rates(D[s - 1], lambda r: r['actual_league'])
            prev_off = off_rates(D[s - 1], lambda r: r['actual_league'])
        else:
            prev_off = {}
        for r in D[s]:
            r['base_team_avg'] = r['ytd_lg_ppg'] if r['ytd_lg_ppg'] is not None else prev.get(r['team'])
            r['base_opp_allowed'] = r['opp_allowed_lg_ppg'] if r['opp_allowed_lg_ppg'] is not None else prev_off.get(r['opp'])


fill_baselines()

# ---------- model f
FEATSETS = {
    'M1 Vegas only': ['implied_total', 'spread', 'home'],
    'M2 Vegas + 3&O rates': ['implied_total', 'spread', 'home', 'def_tao_est', 'opp_tao_est', 'def_fds_est'],
    'M3 Full matchup': ['implied_total', 'spread', 'home', 'def_tao_est', 'opp_tao_est', 'def_fds_est', 'def_sack_est', 'opp_sack_est', 'def_to_est', 'opp_to_est', 'opp_qb_new'],
    'M4 Sleeper half + 3&O rates': ['proj_half', 'def_tao_est', 'opp_tao_est'],
    'M5 Lean: Vegas total + 3&O rates': ['implied_total', 'def_tao_est', 'opp_tao_est'],
}


def X_of(rows, feats):
    return np.array([[1.0] + [float(r[f]) for f in feats] for r in rows])


def ok(r, feats):
    return all(r.get(f) is not None for f in feats)


def fit(rows, feats):
    rows = [r for r in rows if ok(r, feats)]
    X = X_of(rows, feats); y = np.array([r['actual_league'] for r in rows])
    b, *_ = np.linalg.lstsq(X, y, rcond=None)
    resid = y - X @ b
    dof = len(y) - X.shape[1]
    s2 = resid @ resid / dof
    cov = s2 * np.linalg.inv(X.T @ X)
    return b, np.sqrt(np.diag(cov)), len(y)


def predict(b, rows, feats):
    for r in rows:
        pass
    return [float(np.dot(b, [1.0] + [float(r[f]) for f in feats])) if ok(r, feats) else None for r in rows]


def weekly_metrics(rows, predkey, actkey, rank_only=False, higher_better=True):
    byw = defaultdict(list)
    for r in rows:
        if r.get(predkey) is None:
            continue
        byw[(r['season'], r['week'])].append(r)
    res = defaultdict(list)
    for wk, rs in sorted(byw.items()):
        pred = np.array([r[predkey] if higher_better else -r[predkey] for r in rs], float)
        act = np.array([r[actkey] for r in rs], float)
        order = sorted(range(len(rs)), key=lambda i: (-pred[i], rs[i]['team']))
        best = sorted(act, reverse=True)
        res['spearman'].append(spearmanr(pred, act)[0])
        if not rank_only:
            res['mae'].append(float(np.mean(np.abs(pred - act))))
            res['bias'].append(float(np.mean(pred - act)))
        for k in (1, 3, 10):
            res[f'top{k}'].append(float(np.mean(act[order[:k]])))
            res[f'best{k}'].append(float(np.mean(best[:k])))
        res['field'].append(float(np.mean(act)))
        res['weeks'].append(wk)
    return res


def summarise(res):
    n = len(res['weeks'])
    out = {'n_weeks': n}
    for k, v in res.items():
        if k == 'weeks':
            continue
        a = np.array(v, float)
        out[k] = (float(a.mean()), float(a.std(ddof=1) / math.sqrt(n)) if n > 1 else 0.0)
    return out


# leave-one-week-out CV inside training weeks to choose the model spec (no test peeking)
train = [r for r in D[2025] if r['week'] <= 9]
test = [r for r in D[2025] if r['week'] >= 10] + D[2026]
cv = {}
for name, feats in FEATSETS.items():
    preds = {}
    for w in range(1, 10):
        tr = [r for r in train if r['week'] != w]
        b, se, n = fit(tr, feats)
        for r, p in zip([r for r in train if r['week'] == w], predict(b, [r for r in train if r['week'] == w], feats)):
            preds[(r['week'], r['team'])] = p
    for r in train:
        r['_cv'] = preds.get((r['week'], r['team']))
    m = summarise(weekly_metrics(train, '_cv', 'actual_league'))
    cv[name] = m
P('### Model selection: leave-one-week-out CV inside the training weeks (2025 wk1-9 only)\n')
table(['Spec', 'Features', 'CV MAE', 'CV Spearman', 'CV top-3 actual'], [[k, ', '.join(FEATSETS[k]), v['mae'][0], v['spearman'][0], v['top3'][0]] for k, v in cv.items()])
RES['cv'] = {k: {kk: vv for kk, vv in v.items()} for k, v in cv.items()}

# fit every spec on training, predict test (true out-of-sample)
coef = {}
for name, feats in FEATSETS.items():
    b, se, n = fit(train, feats)
    coef[name] = dict(feats=feats, b=b.tolist(), se=se.tolist(), n=n)
    key = 'f_' + name.split()[0]
    for s in D:
        for r, p in zip(D[s], predict(b, D[s], feats)):
            r[key] = p
# variant: train on 2024 all + 2025 wk1-9 (more data), same spec M2/M3/M5
for name in ('M2 Vegas + 3&O rates', 'M5 Lean: Vegas total + 3&O rates', 'M3 Full matchup'):
    feats = FEATSETS[name]
    tr = [r for r in D[2024] if r['week'] >= 2] + train
    b, se, n = fit(tr, [f for f in feats if f != 'opp_qb_new'] if False else feats) if 'opp_qb_new' not in feats else fit(tr, [f for f in feats if f != 'opp_qb_new'])
    f2 = feats if 'opp_qb_new' not in feats else [f for f in feats if f != 'opp_qb_new']
    coef[name + ' (train 2024+2025wk1-9)'] = dict(feats=f2, b=b.tolist(), se=se.tolist(), n=n)
    key = 'f_' + name.split()[0] + 'x'
    for s in D:
        for r, p in zip(D[s], predict(b, D[s], f2)):
            r[key] = p
tr_g = [r for r in D[2024] if r['week'] >= 2] + train
for nm, ft, key in (('G Vegas implied only (train 2024 wk2-18 + 2025 wk1-9)', ['implied_total'], 'g_vegas'),
                    ('G2 Sleeper projected pts allowed only (train 2024 wk2-18 + 2025 wk1-9)', ['proj_pa'], 'g_projpa')):
    b, se, n = fit(tr_g, ft)
    coef[nm] = dict(feats=ft, b=b.tolist(), se=se.tolist(), n=n)
    for s_ in D:
        for r, p in zip(D[s_], predict(b, D[s_], ft)):
            r[key] = p
RES['coef_train'] = coef
P('### Model coefficients (trained on 2025 wk1-9; points of league DEF score per unit)\n')
for name, c in coef.items():
    P(f'**{name}** (n={c["n"]})\n')
    table(['Term', 'Coef', 'SE'], [['intercept', c['b'][0], c['se'][0]]] + [[f, b_, s_] for f, b_, s_ in zip(c['feats'], c['b'][1:], c['se'][1:])])

# ---------- methods table
METHODS = [
    # label, pred key, actual key, rank_only, higher_better
    ('a. Sleeper proj (half-PPR) vs half-PPR actuals [every league]', 'proj_half', 'actual_half', False, True),
    ('d1. ECR rank vs half-PPR actuals [every league]', 'ecr_rank', 'actual_half', True, False),
    ('a2. Sleeper proj (half-PPR) ranks vs league actuals', 'proj_half', 'actual_league', True, True),
    ('b. Sleeper proj re-scored, raw', 'proj_league_raw', 'actual_league', False, True),
    ('c. Patched w=0 (league avg only)', 'proj_patched_w0', 'actual_league', False, True),
    ('c. Patched w=0.25', 'proj_patched_w25', 'actual_league', False, True),
    ('c. Patched w=0.50 (tool today)', 'proj_patched_w50', 'actual_league', False, True),
    ('c. Patched w=0.75', 'proj_patched_w75', 'actual_league', False, True),
    ('c. Patched w=1.0 (own rate only)', 'proj_patched_w100', 'actual_league', False, True),
    ('c2. Patched, shrunk prior rate + smooth PA tier + pass_int_td fix', 'proj_league_patched_smooth', 'actual_league', False, True),
    ('d2. ECR rank vs league actuals', 'ecr_rank', 'actual_league', True, False),
    ('e1. Team season-to-date league ppg', 'base_team_avg', 'actual_league', False, True),
    ('e2. Opponent pts allowed to DEFs (season-to-date)', 'base_opp_allowed', 'actual_league', False, True),
    ('g. RECOMMENDED: opponent implied total (rank = lowest implied first; pts = a - b x implied)', 'g_vegas', 'actual_league', False, True),
    ('g2. Fallback: Sleeper projected pts allowed (same idea, no odds needed)', 'g_projpa', 'actual_league', False, True),
    ('g0. Rank by opponent implied total, no fitting (rank metrics only)', 'implied_total', 'actual_league', True, False),
    ('f1. Model M1 Vegas only', 'f_M1', 'actual_league', False, True),
    ('f2. Model M2 Vegas + 3&O rates', 'f_M2', 'actual_league', False, True),
    ('f3. Model M3 Full matchup', 'f_M3', 'actual_league', False, True),
    ('f4. Model M4 Sleeper half + 3&O rates', 'f_M4', 'actual_league', False, True),
    ('f5. Model M5 Lean', 'f_M5', 'actual_league', False, True),
    ('f2x. M2 trained 2024+2025wk1-9', 'f_M2x', 'actual_league', False, True),
    ('f5x. M5 trained 2024+2025wk1-9', 'f_M5x', 'actual_league', False, True),
    ('f3x. M3 (no QB flag) trained 2024+2025wk1-9', 'f_M3x', 'actual_league', False, True),
]

PERIODS = {
    '2024 wk1-18 (replication, no ECR)': D[2024],
    '2025 wk1-18 (in-sample for f*)': D[2025],
    'Out-of-sample: 2025 wk10-18 + 2026 wk1-4': test,
    '2026 wk1-4 only': D[2026],
}
RES['methods'] = {}
for pname, rows in PERIODS.items():
    P(f'### {pname}\n')
    tab = []
    for lab, key, act, ro, hb in METHODS:
        if (pname.startswith('2025 wk1-18') or pname.startswith('2024')) and lab.startswith('f'):
            continue
        if pname.startswith('2024') and (lab.startswith('d') or (lab.startswith('g') and not lab.startswith('g0'))):
            continue  # no ECR fetched for 2024; g trained on 2024
        s = summarise(weekly_metrics(rows, key, act, ro, hb))
        RES['methods'][f'{pname} | {lab}'] = s
        tab.append([lab, s['n_weeks'], (None if ro else s['mae'][0]), (None if ro else s['bias'][0]), s['spearman'][0], s['spearman'][1],
                    s['top1'][0], s['top3'][0], s['top10'][0], s['best3'][0], s['field'][0]])
    table(['Method', 'Weeks', 'MAE', 'Bias (pred-act)', 'Spearman (avg wk)', 'SE', 'Top-1 actual', 'Top-3 actual', 'Top-10 actual', 'Best-3 possible', 'Field avg'], tab)

# paired comparison vs current tool, OOS
P('### Paired weekly differences vs the tool today (patched w=0.5), out-of-sample weeks\n')
ref = weekly_metrics(test, 'proj_patched_w50', 'actual_league')
pair = []
for lab, key, act, ro, hb in METHODS:
    if act != 'actual_league':
        continue
    m = weekly_metrics(test, key, act, ro, hb)
    for metric in ('spearman', 'top3', 'top10'):
        pass
    d_sp = np.array(m['spearman']) - np.array(ref['spearman'])
    d_t3 = np.array(m['top3']) - np.array(ref['top3'])
    d_t1 = np.array(m['top1']) - np.array(ref['top1'])
    n = len(d_sp)
    pair.append([lab, n, d_sp.mean(), d_sp.std(ddof=1) / math.sqrt(n), d_t1.mean(), d_t1.std(ddof=1) / math.sqrt(n), d_t3.mean(), d_t3.std(ddof=1) / math.sqrt(n), int((d_t3 > 0).sum()), int((d_t3 < 0).sum())])
table(['Method', 'Weeks', 'd Spearman', 'SE', 'd Top-1 pts', 'SE', 'd Top-3 pts', 'SE', 'Weeks better (top-3)', 'Weeks worse'], pair)
RES['paired_oos'] = pair

# ---------- is Sleeper/ECR wrong for this league specifically?
P('### Is Sleeper / ECR wrong for this league specifically?\n')
allr = [r for s in (2025, 2026) for r in D[s] if r['def_tao_est'] is not None]


def ols(rows, y, xs):
    X = np.array([[1.0] + [float(r[x]) for x in xs] for r in rows]); Y = np.array([float(r[y]) for r in rows])
    b, *_ = np.linalg.lstsq(X, Y, rcond=None)
    res = Y - X @ b; s2 = res @ res / (len(Y) - X.shape[1]); se = np.sqrt(np.diag(s2 * np.linalg.inv(X.T @ X)))
    return b, se, len(Y)


for r in allr:
    r['neg_ecr'] = -r['ecr_rank'] if r['ecr_rank'] is not None else None
    r['league_minus_half'] = r['actual_league'] - r['actual_half']
bias_rows = []
for base in ('proj_half', 'neg_ecr'):
    for y in ('actual_league', 'actual_half', 'league_minus_half'):
        rows = [r for r in allr if r[base] is not None]
        b, se, n = ols(rows, y, [base, 'def_tao_est', 'opp_tao_est'])
        bias_rows.append([f'{y} ~ {base} + DEF 3&O rate + opp 3&O-allowed rate', n, b[2], se[2], b[3], se[3]])
table(['Regression (2025 wk1-18 + 2026 wk1-4, prior-only rates)', 'n', 'Coef: DEF prior 3&O rate', 'SE', 'Coef: opp 3&O-allowed rate', 'SE'], bias_rows)
RES['bias_regressions'] = bias_rows
# simple correlations: how much of the league-minus-half gap does Sleeper see?
x = [r['proj_half'] for r in allr]
P(f"r(Sleeper half proj, half actual) = {pearsonr(x, [r['actual_half'] for r in allr])[0]:.3f}; r(Sleeper half proj, league actual) = {pearsonr(x, [r['actual_league'] for r in allr])[0]:.3f}; "
  f"r(Sleeper half proj, league-minus-half points) = {pearsonr(x, [r['league_minus_half'] for r in allr])[0]:.3f}; "
  f"r(DEF prior 3&O rate, league-minus-half) = {pearsonr([r['def_tao_est'] for r in allr], [r['league_minus_half'] for r in allr])[0]:.3f}; "
  f"r(opp 3&O-allowed rate, league-minus-half) = {pearsonr([r['opp_tao_est'] for r in allr], [r['league_minus_half'] for r in allr])[0]:.3f}\n")
P(f"Correlation of half-PPR vs league actual points, same team-game: {pearsonr([r['actual_half'] for r in allr], [r['actual_league'] for r in allr])[0]:.3f}\n")

# ------------------------------------------------------------------ Q4 matchup lessons
P('## Q4 Matchup lessons\n')
BIG = 15


def bucket_table(rows, label, fn, buckets):
    out = []
    for name, cond in buckets:
        rs = [r for r in rows if fn(r) is not None and cond(fn(r))]
        if not rs:
            continue
        lg = [r['actual_league'] for r in rs]
        out.append([name, len(rs), float(np.mean(lg)), float(np.std(lg, ddof=1) / math.sqrt(len(rs))), float(np.mean([r['three_and_outs'] for r in rs])),
                    float(np.mean([r['pts_allowed'] for r in rs])), f"{100 * np.mean([x >= BIG for x in lg]):.0f}%", f"{100 * np.mean([x <= 2 for x in lg]):.0f}%"])
    P(f'**{label}**\n')
    table(['Bucket', 'n', 'League pts', 'SE', '3&O', 'Pts allowed', f'P(>= {BIG})', 'P(<= 2)'], out)
    return out


core = [r for s in (2025, 2026) for r in D[s] if r['implied_total'] is not None]
rep = [r for r in D[2024] if r['implied_total'] is not None]
for rows, tag in ((core, '2025 + 2026 wk1-4'), (rep, '2024 (replication)')):
    P(f'### {tag}: {len(rows)} team-games; base rate P(>= {BIG}) = {100 * np.mean([r["actual_league"] >= BIG for r in rows]):.0f}%\n')
    RES[f'q4_implied_{tag}'] = bucket_table(rows, 'Opponent implied team total (Vegas)', lambda r: r['implied_total'],
                 [('< 17', lambda v: v < 17), ('17 - 18.9', lambda v: 17 <= v < 19), ('19 - 20.9', lambda v: 19 <= v < 21), ('21 - 22.9', lambda v: 21 <= v < 23),
                  ('23 - 24.9', lambda v: 23 <= v < 25), ('>= 25', lambda v: v >= 25)])
    RES[f'q4_spread_{tag}'] = bucket_table(rows, 'Spread x venue (DEF team perspective)', lambda r: (r['spread'], r['home']),
                 [('Home fav by 7+', lambda v: v[0] <= -7 and v[1] == 1), ('Road fav by 7+', lambda v: v[0] <= -7 and v[1] == 0),
                  ('Home fav 3-6.5', lambda v: -7 < v[0] <= -3 and v[1] == 1), ('Road fav 3-6.5', lambda v: -7 < v[0] <= -3 and v[1] == 0),
                  ('Within 2.5', lambda v: abs(v[0]) < 3), ('Dog 3+', lambda v: v[0] >= 3)])
    RES[f'q4_total_{tag}'] = bucket_table(rows, 'Game total (O/U)', lambda r: r['total'],
                 [('< 41', lambda v: v < 41), ('41 - 44.5', lambda v: 41 <= v < 45), ('45 - 47.5', lambda v: 45 <= v < 48), ('>= 48', lambda v: v >= 48)])
    for est, lab in (('opp_tao_est', "Opponent offence prior 3&O-allowed rate (per game)"), ('def_tao_est', "DEF prior 3&O rate (per game)"),
                     ('opp_sack_est', 'Opponent prior sacks allowed per game'), ('opp_to_est', 'Opponent prior turnovers per game')):
        vals = sorted(r[est] for r in rows if r[est] is not None)
        if not vals:
            continue
        q1, q2 = vals[len(vals) // 3], vals[2 * len(vals) // 3]
        RES[f'q4_{est}_{tag}'] = bucket_table(rows, f'{lab} - terciles (cuts {q1:.2f} / {q2:.2f})', lambda r, e=est: r[e],
                     [(f'Low (< {q1:.2f})', lambda v: v < q1), ('Mid', lambda v: q1 <= v < q2), (f'High (>= {q2:.2f})', lambda v: v >= q2)])
    if tag.startswith('2025'):
        RES['q4_qb'] = bucket_table(rows, 'Opponent starting QB experience (starts since 2024 wk1, before this game)', lambda r: r['opp_qb_prior_starts'],
                     [('0-3 starts (rookie / backup / new)', lambda v: v < 4), ('4-11 starts', lambda v: 4 <= v < 12), ('12+ starts', lambda v: v >= 12)])
        RES['q4_rookie'] = bucket_table(rows, 'Opponent starting QB is a rookie', lambda r: r['opp_qb_rookie'], [('Rookie', lambda v: v == 1), ('Not rookie', lambda v: v == 0)])
        # combined rule
        def combo(r):
            return (r['implied_total'] < 20, r['opp_tao_est'] is not None and r['opp_tao_est'] >= sorted(x['opp_tao_est'] for x in rows if x['opp_tao_est'] is not None)[2 * len(rows) // 3])
        RES['q4_combo'] = bucket_table(rows, 'Combined: opp implied < 20 and opponent high 3&O-allowed tercile', combo,
                     [('Both', lambda v: v[0] and v[1]), ('Implied < 20 only', lambda v: v[0] and not v[1]), ('High 3&O opp only', lambda v: (not v[0]) and v[1]), ('Neither', lambda v: not v[0] and not v[1])])

# what Vegas does to 3&outs specifically
P('### Which inputs predict three-and-outs specifically (2025 + 2026, standardised OLS coefs)\n')
rows = [r for r in core if r['def_tao_est'] is not None and r['opp_tao_est'] is not None]
xs = ['implied_total', 'spread', 'home', 'def_tao_est', 'opp_tao_est', 'opp_qb_new']
X = np.array([[float(r[x]) for x in xs] for r in rows]); Y = np.array([r['three_and_outs'] for r in rows], float)
Xs = (X - X.mean(0)) / X.std(0)
Xs1 = np.c_[np.ones(len(Y)), Xs]
b, *_ = np.linalg.lstsq(Xs1, Y, rcond=None); res = Y - Xs1 @ b; s2 = res @ res / (len(Y) - Xs1.shape[1]); se = np.sqrt(np.diag(s2 * np.linalg.inv(Xs1.T @ Xs1)))
table(['Input (1 sd change)', '3&O per game', 'SE'], [[x, bb, ss] for x, bb, ss in zip(xs, b[1:], se[1:])])
RES['tao_drivers'] = [[x, float(bb), float(ss)] for x, bb, ss in zip(xs, b[1:], se[1:])]

# ------------------------------------------------------------------ what adds anything beyond Vegas?
P('### What adds anything beyond the Vegas implied total? (mean residual after a points ~ implied-total fit, league pts)\n')


def resid_rows(rows):
    rows = [r for r in rows if r['implied_total'] is not None]
    b, se, n = fit(rows, ['implied_total'])
    for r in rows:
        r['_res'] = r['actual_league'] - (b[0] + b[1] * r['implied_total'])
    out = {}
    def add(lab, cond):
        rs = [r['_res'] for r in rows if cond(r)]
        out[lab] = (len(rs), float(np.mean(rs)) if rs else None, float(np.std(rs, ddof=1) / math.sqrt(len(rs))) if len(rs) > 2 else None)
    add('Opp QB 0-3 starts since 2024 (2025-26 only)', lambda r: r['season'] >= 2025 and r['opp_qb_prior_starts'] is not None and r['opp_qb_prior_starts'] < 4)
    add('Opp QB is a rookie', lambda r: r['opp_qb_rookie'] == 1)
    for est, lab in (('opp_sack_est', 'Opp sacks allowed'), ('opp_tao_est', 'Opp 3&O allowed'), ('def_tao_est', 'DEF own 3&O rate'),
                     ('def_sack_est', 'DEF own sack rate'), ('opp_to_est', 'Opp turnovers')):
        v = sorted(r[est] for r in rows if r[est] is not None)
        if not v:
            continue
        q1, q2 = v[len(v) // 3], v[2 * len(v) // 3]
        add(f'{lab}: top tercile', lambda r, e=est, q=q2: r[e] is not None and r[e] >= q)
        add(f'{lab}: bottom tercile', lambda r, e=est, q=q1: r[e] is not None and r[e] < q)
    add('Home favourite by 7+', lambda r: r['spread'] <= -7 and r['home'] == 1)
    add('Road favourite by 7+', lambda r: r['spread'] <= -7 and r['home'] == 0)
    add('Home (any)', lambda r: r['home'] == 1)
    return b, out


b_a, ra = resid_rows(D[2025] + D[2026])
b_b, rb = resid_rows(D[2024])
P(f'Fits: 2025-26 pts = {b_a[0]:.2f} {b_a[1]:+.2f} x implied; 2024 pts = {b_b[0]:.2f} {b_b[1]:+.2f} x implied\n')
table(['Subgroup', 'n 2025-26', 'Resid 2025-26', 'SE', 'n 2024', 'Resid 2024', 'SE'],
      [[k, ra[k][0], ra[k][1], ra[k][2], rb.get(k, (None, None, None))[0], rb.get(k, (None, None, None))[1], rb.get(k, (None, None, None))[2]] for k in ra])
RES['beyond_vegas'] = {'2025_26': ra, '2024': rb}

# ------------------------------------------------------------------ deployment refit on everything (2024 wk2 - 2026 wk4)
allfit = [r for r in [r for r in D[2024] if r['week'] >= 2] + D[2025] + D[2026] if r['implied_total'] is not None]
b_all, se_all, n_all = fit(allfit, ['implied_total'])
b_pa, se_pa, _ = fit(allfit, ['proj_pa'])
b_os, se_os, _ = fit(allfit, ['implied_total', 'opp_sack_est'])
RES['deploy'] = dict(implied=(b_all.tolist(), se_all.tolist(), n_all), proj_pa=(b_pa.tolist(), se_pa.tolist()), implied_oppsack=(b_os.tolist(), se_os.tolist()))
resid = [r['actual_league'] - (b_all[0] + b_all[1] * r['implied_total']) for r in allfit]
RES['deploy_resid_sd'] = float(np.std(resid, ddof=2))
P(f'Deployment refit (2024 wk2 - 2026 wk4, n={n_all}): pts = {b_all[0]:.2f} {b_all[1]:+.3f} x implied (SE {se_all[0]:.2f}, {se_all[1]:.3f}); residual sd {RES["deploy_resid_sd"]:.2f}')
P(f'Fallback: pts = {b_pa[0]:.2f} {b_pa[1]:+.3f} x Sleeper projected pts_allow')
P(f'With opp sacks allowed: pts = {b_os[0]:.2f} {b_os[1]:+.3f} x implied {b_os[2]:+.2f} x opp sacks allowed/g (SE {se_os[2]:.2f})\n')

# ------------------------------------------------------------------ week 5 2026 board (lines as cached on 7 Oct 2026)
P('### 2026 week 5 board (lines and projections as fetched 7 Oct 2026)\n')
SC = json.load(open(os.path.join(C, 'league.json')))['scoring_settings']
sb = json.load(open(os.path.join(C, 'espn_sb_2026_5.json')))
proj5 = {r['team']: r['stats'] for r in json.load(open(os.path.join(C, 'proj_2026_5.json')))}
ecr5 = {}
fp5 = os.path.join(C, 'fp_ecr_2026_5.json')
if os.path.exists(fp5):
    for p_ in json.load(open(fp5))['players']:
        ecr5[{'JAC': 'JAX'}.get(p_['player_team_id'], p_['player_team_id'])] = int(p_['rank_ecr'])
rosters = json.load(open(os.path.join(C, 'rosters.json'))); users = {u['user_id']: u for u in json.load(open(os.path.join(C, 'users.json')))}
owner = {}
for ro in rosters:
    u = users.get(ro['owner_id'], {})
    nm = ((u.get('metadata') or {}).get('team_name') or u.get('display_name') or f"Team {ro['roster_id']}")
    for pid in ro.get('players') or []:
        owner[pid] = nm
# tool-today patched projection for week 5 (YTD rates from 2026 wk1-4, 50/50 with league average)
ytd = defaultdict(lambda: [0, 0, 0]);
for r in D[2026]:
    ytd[r['team']][0] += 1; ytd[r['team']][1] += r['three_and_outs']; ytd[r['team']][2] += r['fourth_down_stops']
avg_tao = mean([v[1] / v[0] for v in ytd.values()]); avg_fds = mean([v[2] / v[0] for v in ytd.values()])
board = []
for e in sb['events']:
    comp = e['competitions'][0]
    ha = {c['homeAway']: {'WSH': 'WAS'}.get(c['team']['abbreviation'], c['team']['abbreviation']) for c in comp['competitors']}
    o = (comp.get('odds') or [{}])[0]
    sp_home, ou = o.get('spread'), o.get('overUnder')
    for side, opp_side in (('home', 'away'), ('away', 'home')):
        t, opp = ha[side], ha[opp_side]
        if sp_home is None or ou is None:
            impl = None; tsp = None
        else:
            tsp = sp_home if side == 'home' else -sp_home
            impl = ou / 2 + tsp / 2
        pr = proj5.get(t, {})
        raw = sum(v * SC[k] for k, v in pr.items() if k in SC)
        v = ytd.get(t)
        tool = raw + (0.5 * v[1] / v[0] + 0.5 * avg_tao) + (0.5 * v[2] / v[0] + 0.5 * avg_fds) if v else None
        rec = b_all[0] + b_all[1] * impl if impl is not None else b_pa[0] + b_pa[1] * pr.get('pts_allow', 22)
        board.append(dict(team=t, opp=opp, home=int(side == 'home'), spread=tsp, implied=impl, rec=rec, tool=tool, half=pr.get('pts_half_ppr'),
                          ecr=ecr5.get(t), owner=owner.get(t, 'free agent')))
board.sort(key=lambda r: -r['rec'])
tool_rank = {r['team']: i + 1 for i, r in enumerate(sorted(board, key=lambda r: -(r['tool'] or -99)))}
table(['Rank', 'DEF', 'Opp', 'H/A', 'Spread', 'Opp implied', 'Rec. proj (league)', 'Tool today proj', 'Tool rank', 'Sleeper half proj', 'ECR (partial)', 'Rostered by'],
      [[i + 1, r['team'], r['opp'], 'H' if r['home'] else 'A', r['spread'], r['implied'], r['rec'], r['tool'], tool_rank[r['team']], r['half'], r['ecr'], r['owner']] for i, r in enumerate(board)])
RES['week5_board'] = board

import csv
cols = ['season', 'week', 'team', 'opp', 'home', 'proj_half', 'proj_league_raw', 'proj_league_patched', 'ecr_rank', 'implied_total', 'spread',
        'actual_half', 'actual_league', 'three_and_outs', 'fourth_down_stops', 'pts_allowed', 'sacks', 'ints', 'fum_rec', 'tds',
        'proj_vegas_model', 'opp_qb', 'opp_qb_prior_starts']
with open(os.path.join(HERE, 'defs_weekly.csv'), 'w', newline='') as f:
    wr = csv.writer(f)
    wr.writerow(cols)
    for s_ in (2025, 2026):
        for r in sorted(D[s_], key=lambda x: (x['week'], x['team'])):
            r['proj_vegas_model'] = r.get('g_vegas')
            wr.writerow([('' if r.get(c) is None else (round(r[c], 2) if isinstance(r[c], float) else r[c])) for c in cols])

json.dump(RES, open(os.path.join(HERE, 'results.json'), 'w'), indent=1, default=float)
open(os.path.join(HERE, 'results.md'), 'w').write('\n'.join(OUT))
json.dump({str(k): v for k, v in D.items()}, open(os.path.join(HERE, 'data_enriched.json'), 'w'))
