import json, csv, re
import numpy as np
ESPN2SL={'WSH':'WAS'}
A, B = 27.754, -0.8194          # audit formula: league pts = A + B * opp implied
rows=[r for r in csv.DictReader(open('defs_weekly.csv')) if r['season']=='2026']
sched=[g for g in json.load(open('cache/schedule_2026.json')) if g['status']!='canceled']
teams=sorted(set([g['home'] for g in sched]+[g['away'] for g in sched])); ti={t:i for i,t in enumerate(teams)}; T=len(teams)

# observations: (week, scoring team, defending team, scoring team at home, implied)
obs=[]
for r in rows:
    obs.append((int(r['week']), r['opp'], r['team'], 1-int(r['home']), float(r['implied_total'])))
sb=json.load(open('cache/espn_sb_2026_5.json'))
wk5={}
for e in sb['events']:
    c=e['competitions'][0]; o=(c.get('odds') or [{}])[0]
    if o.get('overUnder') is None: continue
    side={x['homeAway']:ESPN2SL.get(x['team']['abbreviation'],x['team']['abbreviation']) for x in c['competitors']}
    h,a=side['home'],side['away']; ou=float(o['overUnder']); sp=float(o['spread'])  # home spread
    hi=ou/2-sp/2; ai=ou/2+sp/2
    obs.append((5,h,a,1,hi)); obs.append((5,a,h,0,ai))
    wk5[(h,a)]=(hi,ai)
print('obs',len(obs),'wk5 games',len(wk5))

def fit(ob, lam=1.0, w=None):
    n=len(ob); X=np.zeros((n,2*T+2)); y=np.zeros(n)
    for k,(wk,s,d,hm,imp) in enumerate(ob):
        X[k,0]=1; X[k,1+ti[s]]=1; X[k,1+T+ti[d]]=1; X[k,-1]=hm; y[k]=imp
    W=np.ones(n) if w is None else np.array([w(o) for o in ob])
    P=np.eye(2*T+2)*lam; P[0,0]=0; P[-1,-1]=0
    beta=np.linalg.solve(X.T@(X*W[:,None])+P, X.T@(W*y))
    return beta
def pred(beta,s,d,hm): return beta[0]+beta[1+ti[s]]+beta[1+T+ti[d]]+beta[-1]*hm

# validation: fit wk1-3, predict wk4 lines; fit wk1-4, predict wk5 lines
for lam in [0.5,1,2,4]:
    out=[]
    for tw in [4,5]:
        b=fit([o for o in obs if o[0]<tw],lam)
        e=[abs(pred(b,s,d,hm)-imp) for (wk,s,d,hm,imp) in obs if wk==tw]
        out.append(round(float(np.mean(e)),2))
    print('lam',lam,'MAE next-week lines',out)
# naive baseline: league mean
for tw in [4,5]:
    m=np.mean([o[4] for o in obs if o[0]<tw]); print('naive',tw,round(float(np.mean([abs(m-o[4]) for o in obs if o[0]==tw])),2))
json.dump({'obs':obs},open('ros/obs.json','w'))
