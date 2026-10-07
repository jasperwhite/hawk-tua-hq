import json, csv, re
import numpy as np
exec(open('ros/ros.py').read().split("# validation")[0].replace("print('obs'","pass #"))
r25=[r for r in csv.DictReader(open('defs_weekly.csv')) if r['season']=='2025' and r['implied_total']]
prior=[(-int(r['week']), r['opp'], r['team'], 1-int(r['home']), float(r['implied_total'])) for r in r25 if int(r['week'])>=10]
beta=fit(obs+prior,1.0,lambda o: 0.2 if o[0]<0 else 0.8**(5-o[0]))
mu,h=beta[0],beta[-1]
off={t:beta[1+ti[t]] for t in teams}; dfn={t:beta[1+T+ti[t]] for t in teams}
print('mu',round(mu,2),'home',round(h,2))
proj=lambda imp: A+B*imp
# owners
ro=json.load(open('cache/rosters.json')); us=json.load(open('cache/users.json'))
nm={x['user_id']:(x.get('metadata') or {}).get('team_name') or x['display_name'] for x in us}
own={}
for r in ro:
    for p in (r.get('players') or []):
        if re.fullmatch('[A-Z]{2,3}',p): own[p]=nm.get(r['owner_id'],'?').strip()
# so far
avg_imp=np.mean([float(r['implied_total']) for r in rows])
sofar={}
for t in teams:
    rr=[r for r in rows if r['team']==t]
    g=len(rr); act=np.mean([float(r['actual_league']) for r in rr]); exp=np.mean([proj(float(r['implied_total'])) for r in rr])
    imp=np.mean([float(r['implied_total']) for r in rr]); pa=np.mean([float(r['pts_allowed']) for r in rr])
    oppoff=np.mean([off[r['opp']] for r in rr])
    sofar[t]=dict(g=g,act=act,exp=exp,over=act-exp,imp=imp,ease=avg_imp-imp,pa=pa,pa_vs=pa-imp,oppoff=oppoff,opps=' '.join(r['opp'] for r in sorted(rr,key=lambda r:int(r['week']))))
# rest of season
ros={t:[] for t in teams}
for g in sched:
    w=g['week']
    if w<5 or w>17: continue
    H,Aw=g['home'],g['away']
    if w==5 and (H,Aw) in wk5:
        hi,ai=wk5[(H,Aw)]; src='line'
    else:
        hi=pred(beta,H,Aw,1); ai=pred(beta,Aw,H,0); src='model'
    ros[H].append((w,'v '+Aw,ai,proj(ai),src)); ros[Aw].append((w,'at '+H,hi,proj(hi),src))
out=[]
for t in teams:
    gs=sorted(ros[t]); wks={x[0] for x in gs}
    bye=[w for w in range(5,18) if w not in wks]
    allp=np.mean([x[3] for x in gs]); reg=[x[3] for x in gs if x[0]<=15]; po=[x[3] for x in gs if x[0]>=16]; n3=[x[3] for x in gs if x[0]<=7]
    out.append(dict(team=t,owner=own.get(t,'Available'),ros=allp,games=len(gs),next3=np.mean(n3),n3g=len(n3),reg=np.mean(reg),po=np.mean(po) if po else float('nan'),pog=len(po),bye=bye,sched=gs,defr=dfn[t],offr=off[t],**sofar[t]))
out.sort(key=lambda d:-d['ros'])
json.dump(out,open('ros/board.json','w'),default=float,indent=1)
print(f"{'#':>2} {'DEF':4} {'ROS':>5} {'n':>2} {'nx3':>5} {'wk8-15':>6} {'PO':>5} {'bye':8} {'defR':>5} | {'act':>5} {'exp':>5} {'over':>5} {'ease':>5} {'oppOff':>6} owner")
for i,d in enumerate(out,1):
    print(f"{i:>2} {d['team']:4} {d['ros']:5.1f} {d['games']:>2} {d['next3']:5.1f} {d['reg']:6.1f} {d['po']:5.1f} {str(d['bye']):8} {d['defr']:5.1f} | {d['act']:5.1f} {d['exp']:5.1f} {d['over']:+5.1f} {d['ease']:+5.1f} {d['oppoff']:+6.1f} {d['owner']}")
print('avg implied wk1-4',round(avg_imp,2))
