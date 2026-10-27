# Fetches everything fresh from Sleeper + FantasyCalc and writes data.json.
# Usage: python3 build_data.py [data.json]   then   python3 build.py
import json,statistics as st,math,sys,urllib.request
LEAGUE='1312056164149641216'; OUT=sys.argv[1] if len(sys.argv)>1 else 'data.json'
POSQ='&position[]=QB&position[]=RB&position[]=WR&position[]=TE'
get=lambda u:json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'trade-desk'}),timeout=30))
league=get(f'https://api.sleeper.app/v1/league/{LEAGUE}'); season=league['season']
sc=league['scoring_settings']
pts=lambda s:sum(v*sc.get(k,0) for k,v in (s or {}).items())
users={x['user_id']:(x.get('metadata',{}).get('team_name') or x['display_name']).strip() for x in get(f'https://api.sleeper.app/v1/league/{LEAGUE}/users')}
ros=get(f'https://api.sleeper.app/v1/league/{LEAGUE}/rosters')
REPL={'QB':11,'RB':26,'WR':31,'TE':12}
logs={};pos={};name={};team={};wk={}
weeks=0
for w in range(1,19):
    data=get(f'https://api.sleeper.app/stats/nfl/{season}/{w}?season_type=regular'+POSQ)
    if not any((r.get('stats') or {}).get('gp') for r in data): break
    weeks=w
    for r in data:
        s=r.get('stats') or {}
        if not s.get('gp'): continue
        pl=r.get('player') or {}
        if pl.get('position') not in REPL: continue
        pid=r['player_id'];logs.setdefault(pid,[]).append(pts(s));pos[pid]=pl['position'];wk.setdefault(pid,{})[w]=round(pts(s),1)
        name[pid]=(pl.get('first_name','')+' '+pl.get('last_name','')).strip()
inj={};nfl={};pj={}
# Sleeper projections run high by position (docs/tooling/sleeper.md), so take the measured bias off
BIAS={'QB':0.0,'RB':1.4,'WR':3.3,'TE':2.1}
for r in get(f'https://api.sleeper.app/projections/nfl/{season}/{weeks+1}?season_type=regular'+POSQ):
    pl=r.get('player') or {};pid=r['player_id']
    inj[pid]=pl.get('injury_status') or '';nfl[pid]=pl.get('team') or ''
    if r.get('stats') and pl.get('position') in BIAS: pj[pid]=round(max(0,pts(r['stats'])-BIAS[pl['position']]),1)
    if pl.get('position') in REPL:
        pos.setdefault(pid,pl['position']);name.setdefault(pid,(pl.get('first_name','')+' '+pl.get('last_name','')).strip())
fc={}
for x in get('https://api.fantasycalc.com/values/current?isDynasty=false&numQbs=1&numTeams=10&ppr=0.5'):
    sid=str(x['player'].get('sleeperId'));fc[sid]=x['value']
    if x['player'].get('position') in REPL:
        pos.setdefault(sid,x['player']['position']);name.setdefault(sid,x['player']['name'])
OUTS={'Out','IR','PUP','Doubtful','Sus','NA'}
S={p:st.mean(g) for p,g in logs.items() if len(g)>=3}
repl={P:sorted([S[p] for p in S if pos[p]==P],reverse=True)[k-1] for P,k in REPL.items()}
# market curve: one fit across positions, healthy players with 3+ games and FC value
fit=[p for p in S if fc.get(p,0)>200 and inj.get(p,'') not in OUTS]
xs=[math.log(fc[p]) for p in fit];ys=[S[p]-repl[pos[p]] for p in fit]
mx,my=st.mean(xs),st.mean(ys);b=sum((x-mx)*(y-my) for x,y in zip(xs,ys))/sum((x-mx)**2 for x in xs);a=my-b*mx
def market(p): return max(-6.0,a+b*math.log(fc[p])) if fc.get(p,0)>0 else -6.0
def l5w(g):
    g=g[-5:][::-1];w=[.85**i for i in range(len(g))];return sum(x*y for x,y in zip(g,w))/sum(w)
players={};teams=[]
for r in sorted(ros,key=lambda r:r['roster_id']):
    tname=users.get(r['owner_id'],'Team %d'%r['roster_id'])
    ids=[]
    for p in r['players'] or []:
        P=pos.get(p)
        if P not in REPL: continue
        g=logs.get(p,[]);n=len(g);R=repl[P];M=R+market(p)
        if n: w=n/(n+7);v=w*l5w(g)+(1-w)*M
        else: w=0;v=M
        players[p]=dict(n=name.get(p,p),p=P,t=nfl.get(p,''),v=round(v,1),fc=fc.get(p,0),g=n,
                        f=round(l5w(g),1) if n else None,m=round(M,1),i=inj.get(p,''),wk=wk.get(p,{}),pj=pj.get(p,0))
        ids.append(p)
    teams.append(dict(id=r['roster_id'],name=tname,players=ids,rec='%d-%d'%(r['settings']['wins'],r['settings']['losses'])))
# best healthy free agent per position (3+ games) fills a starting slot a trade leaves empty
rostered={p for r in ros for p in (r['players'] or [])}
wa={}
for p,g in logs.items():
    P=pos.get(p)
    if p in rostered or P not in REPL or len(g)<3 or inj.get(p,'') in OUTS: continue
    n=len(g);w=n/(n+7);v=w*l5w(g)+(1-w)*(repl[P]+market(p))
    if v>wa.get(P,(0,''))[0]: wa[P]=(round(v,1),name.get(p,p))
# weekly results for the league table
match={}
for w in range(1,weeks+1):
    match[w]=[dict(r=m['roster_id'],m=m['matchup_id'],p=m['points']) for m in get(f'https://api.sleeper.app/v1/league/{LEAGUE}/matchups/{w}')]
out=dict(match=match,wa={k:{'v':v,'n':n} for k,(v,n) in wa.items()},asOf='After week %d'%weeks,weeks=weeks,repl={k:round(v,1) for k,v in repl.items()},curve=[round(a,2),round(b,2)],teams=teams,players=players)
json.dump(out,open(OUT,'w'),separators=(',',':'))
print('fit',round(a,2),round(b,2),'n',len(fit),'repl',out['repl'],'players',len(players))
for t in teams:
    print(t['name'],t['rec'],len(t['players']))
me=[t for t in teams if t['name']=='Hawk Tua'][0]
for p in sorted(me['players'],key=lambda p:-players[p]['v']): print(' ',players[p])
