import json,statistics as st
exec(open(__file__.replace('needs.py','search.py')).read().split("nm=lambda")[0])
WA=D['wa']
def slots(ids):
    pool=sorted([i for i in ids if P[i]['i'] not in OUT],key=lambda i:-P[i]['v']);used=set();out=[]
    for need in ['QB','RB','RB','WR','WR','TE','F','F']:
        for i in pool:
            if i in used: continue
            if (need=='F' and P[i]['p']!='QB') or P[i]['p']==need: used.add(i);out.append((need,i,P[i]['v']));break
        else: out.append((need,None,max([WA[p]['v'] for p in (['RB','WR','TE'] if need=='F' else [need])])))
    return out,used
L={t:slots(T[t]['players']) for t in T}
lab=['QB','RB1','RB2','WR1','WR2','TE','FLX1','FLX2']
med=[st.median(L[t][0][k][2] for t in T) for k in range(8)]
print('league median by slot',dict(zip(lab,[round(m,1) for m in med])))
# benchmark: a solid starter = 6th best rostered healthy at the position
bench={p:sorted([P[i]['v'] for t in T for i in T[t]['players'] if P[i]['p']==p and P[i]['i'] not in OUT],reverse=True)[5] for p in ['QB','RB','WR','TE']}
print('benchmark (6th best)',{k:round(v,1) for k,v in bench.items()})
me=T['Hawk Tua']['players']
for t in sorted(T,key=lambda t:-lineup(T[t]['players'])):
    sl,used=L[t]; tot=sum(x[2] for x in sl)
    gaps=[(lab[k],round(sl[k][2]-med[k],1),P[sl[k][1]]['n'] if sl[k][1] else 'waiver') for k in range(8)]
    base=lineup(T[t]['players'])
    need={}
    for p,v in bench.items():
        fake='__x';P[fake]=dict(n='x',p=p,v=v,i='',fc=0)
        need[p]=round(lineup(T[t]['players']+[fake])-base,1); del P[fake]
    hurt=[P[i]['n']+' ('+P[i]['i']+')' for i in T[t]['players'] if P[i]['i'] in OUT and P[i]['fc']>1500]
    surplus=sorted([i for i in T[t]['players'] if i not in used and P[i]['i'] not in OUT],key=lambda i:-P[i]['fc'])[:3]
    fits=sorted([(round(lineup(T[t]['players']+[i])-base,1),P[i]['n']) for i in me if P[i]['i'] not in OUT],reverse=True)[:3]
    print(f"\n== {t} {T[t]['rec']} lineup {tot:.1f}")
    print('  slots vs median:',' '.join(f"{a}:{b:+} {c}" for a,b,c in gaps))
    print('  gain from a solid starter:',need)
    print('  injured:',hurt)
    print('  bench surplus (by FC):',[(P[i]['n'],P[i]['p'],P[i]['v'],P[i]['fc']) for i in surplus])
    print('  best of mine for them:',fits)
