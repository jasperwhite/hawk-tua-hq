import json,statistics as st,math,sys
OLD='/private/tmp/claude-503/-Users-jasperwhite-1/c6e05ed4-68b1-44ae-bdc9-bb4b83fdca81/scratchpad/sl'
LIVE=sys.argv[1]; OUT=sys.argv[2]
sc=json.load(open(OLD+'/league.json'))['scoring_settings']
pts=lambda s:sum(v*sc.get(k,0) for k,v in (s or {}).items())
users={x['user_id']:(x.get('metadata',{}).get('team_name') or x['display_name']).strip() for x in json.load(open(LIVE+'/users.json'))}
ros=json.load(open(LIVE+'/rosters.json'))
REPL={'QB':11,'RB':26,'WR':31,'TE':12}
logs={};pos={};name={};team={}
weeks=0
for w in range(1,19):
    try: data=json.load(open(f'{OLD}/s{w}.json'))
    except FileNotFoundError: break
    weeks=w
    for r in data:
        s=r.get('stats') or {}
        if not s.get('gp'): continue
        pl=r.get('player') or {}
        if pl.get('position') not in REPL: continue
        pid=r['player_id'];logs.setdefault(pid,[]).append(pts(s));pos[pid]=pl['position']
        name[pid]=(pl.get('first_name','')+' '+pl.get('last_name','')).strip()
inj={};nfl={}
for r in json.load(open(LIVE+'/p8.json')):
    pl=r.get('player') or {};pid=r['player_id']
    inj[pid]=pl.get('injury_status') or '';nfl[pid]=pl.get('team') or ''
    if pl.get('position') in REPL:
        pos.setdefault(pid,pl['position']);name.setdefault(pid,(pl.get('first_name','')+' '+pl.get('last_name','')).strip())
fc={}
for x in json.load(open(LIVE+'/fc.json')):
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
                        f=round(l5w(g),1) if n else None,m=round(M,1),i=inj.get(p,''))
        ids.append(p)
    teams.append(dict(id=r['roster_id'],name=tname,players=ids,rec='%d-%d'%(r['settings']['wins'],r['settings']['losses'])))
out=dict(asOf='After week %d'%weeks,weeks=weeks,repl={k:round(v,1) for k,v in repl.items()},curve=[round(a,2),round(b,2)],teams=teams,players=players)
json.dump(out,open(OUT,'w'),separators=(',',':'))
print('fit',round(a,2),round(b,2),'n',len(fit),'repl',out['repl'],'players',len(players))
for t in teams:
    print(t['name'],t['rec'],len(t['players']))
me=[t for t in teams if t['name']=='Hawk Tua'][0]
for p in sorted(me['players'],key=lambda p:-players[p]['v']): print(' ',players[p])
