# Builds trades.html: Dynasty Daddy's GM Scout suggestions, scored on league points.
# Usage: python3 build.py <analysis dir with an.py> <dd market-15 json> <thumb cache dir>
import json, sys, os, base64, urllib.request
AN, DDF, TH = sys.argv[1:4]
here = os.path.dirname(os.path.abspath(__file__))
cwd = os.getcwd(); os.chdir(AN); exec(open('an.py').read()); os.chdir(cwd)
dd = {p['sleeper_id']: p for p in json.load(open(DDF))}
trades = json.load(open(os.path.join(here, 'trades.json')))
os.makedirs(TH, exist_ok=True)

def thumb(pid):
    f = os.path.join(TH, pid + '.jpg')
    if not os.path.exists(f):
        try:
            urllib.request.urlretrieve(f'https://sleepercdn.com/content/nfl/players/thumb/{pid}.jpg', f)
        except Exception:
            return ''
    return 'data:image/jpeg;base64,' + base64.b64encode(open(f, 'rb').read()).decode()

cache = {}
def player(name):
    if name in cache: return cache[name]
    pid = next(p for p, i in info.items() if i['name'].lower() == name.lower())
    r = row(pid); d = dd.get(pid, {})
    cache[name] = dict(id=pid, name=r['name'], pos=r['pos'], team=r['team'], inj=r['inj'] or '',
        avg=round(r['avg'], 1), l3=round(r['l3'], 1), p9=round(r['p'][0], 1), p=[round(x, 1) for x in r['p']],
        bye=r['bye'], dd=d.get('trade_value', 0), fc=r['val'], img=thumb(pid))
    return cache[name]

for t in trades:
    t['get'] = [player(n) for n in t['get']]
    t['give'] = [player(n) for n in t['give']]
html = open(os.path.join(here, 'template.html')).read().replace('/*DATA*/[]', json.dumps(trades))
open(os.path.join(here, 'trades.html'), 'w').write(html)
print('players', len(cache), 'trades', len(trades), 'kb', len(html) // 1024)
