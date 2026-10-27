import json,itertools,sys
D=json.load(open('/Users/jasperwhite_1/Personal/Fantasy Football/research/trade-desk/data.json'))
P=D['players'];T={t['name']:t for t in D['teams']}
OUT={'Out','IR','PUP','Doubtful','Sus','NA'}
def lineup(ids):
    pool=sorted([i for i in ids if P[i]['i'] not in OUT],key=lambda i:-P[i]['v']);used=set();tot=0
    WA=D.get('wa',{})
    for need in ['QB','RB','RB','WR','WR','TE','F','F']:
        for i in pool:
            if i in used: continue
            if (need=='F' and P[i]['p']!='QB') or P[i]['p']==need: used.add(i);tot+=P[i]['v'];break
        else:
            tot+=max([WA[p]['v'] for p in (['RB','WR','TE'] if need=='F' else [need]) if p in WA] or [0])
    return tot
def ev(A,B,give,get):
    a=[i for i in T[A]['players'] if i not in give]+list(get); b=[i for i in T[B]['players'] if i not in get]+list(give)
    dA=lineup(a)-lineup(T[A]['players']); dB=lineup(b)-lineup(T[B]['players'])
    fg=sum(P[i]['fc'] for i in give); ft=sum(P[i]['fc'] for i in get)
    return dA,dB,(fg/ft if ft else 0)
nm=lambda ids:' + '.join(P[i]['n'] for i in ids)
byn=lambda n:[i for i in P if P[i]['n'].startswith(n)][0]
ME='Hawk Tua'
if sys.argv[1]=='mine':
    owner={i:t for t in T for i in T[t]['players']}
    deals=[("Bhayshul Tuten",["Tetairoa McMillan"]),("Bhayshul Tuten",["Mike Evans","Rhamondre Stevenson"]),
     ("Chuba Hubbard",["Tetairoa McMillan"]),("Chuba Hubbard",["Mike Evans","Zach Charbonnet"]),("Chuba Hubbard",["A.J. Brown","Zach Charbonnet"]),("Chuba Hubbard",["Matthew Golden"]),
     ("James Cook",["Tetairoa McMillan","Matthew Golden"]),("James Cook",["Tetairoa McMillan","Jeremiyah Love"]),("Kyren Williams",["Matthew Golden","Jeremiyah Love"]),
     ("D'Andre Swift",["Mike Evans","Jordan Love"]),("D'Andre Swift",["Mike Evans","Jeremiyah Love"]),("D'Andre Swift",["Tetairoa McMillan"]),("D'Andre Swift",["A.J. Brown"]),
     ("Jahmyr Gibbs",["Derrick Henry","Matthew Golden"]),("Jahmyr Gibbs",["Ja'Marr Chase","Omar Cooper"]),("Jahmyr Gibbs",["Ja'Marr Chase","Jeremiyah Love"]),("Jahmyr Gibbs",["Ja'Marr Chase","Rhamondre Stevenson","Mike Evans"]),
     ("Trey McBride",["Matthew Golden","Jordan Love"]),("Jaxon Smith-Njigba",["Ja'Marr Chase","Jeremiyah Love","Matthew Golden"]),("Jaxon Smith-Njigba",["Ja'Marr Chase","Rhamondre Stevenson","Mike Evans"])]
    for g,gv in deals:
        gid=byn(g);B=owner[gid];give=[byn(x) for x in gv]
        dA,dB,r=ev(ME,B,give,[gid]);ok=dA>=2 and dB>=-2 and r>=1.15
        print(f"{'PASS' if ok else '    '}|{B}|{P[gid]['n']}|{nm(give)}|{dA:+.1f}|{dB:+.1f}|{r:.2f}")
else:
    mine=T[ME]['players'];res=[]
    for B in T:
        if B==ME: continue
        theirs=T[B]['players']
        for ng in (1,2):
            for get in itertools.combinations(theirs,ng):
                if max(P[i]['v'] for i in get)<15: continue
                ft=sum(P[i]['fc'] for i in get)
                for nv in range(ng,5):
                    for give in itertools.combinations(mine,nv):
                        fg=sum(P[i]['fc'] for i in give)
                        if fg<1.15*ft or fg>1.6*ft: continue
                        dA,dB,r=ev(ME,B,give,get)
                        if dA>=2 and dB>=-2: res.append((dA,dB,r,B,get,give))
    res.sort(key=lambda x:-x[0]);json.dump([[a,b,c,B,list(g),list(v)] for a,b,c,B,g,v in res],open(sys.argv[2],'w'))
    print(len(res))
