// Cached fetcher for Sleeper / ESPN data. Re-runs only hit the network for missing files.
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const CACHE = path.join(DIR, 'cache');
fs.mkdirSync(CACHE, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, file, { force = false } = {}) {
  const fp = path.join(CACHE, file);
  if (!force && fs.existsSync(fp) && fs.statSync(fp).size > 2) return JSON.parse(fs.readFileSync(fp, 'utf8'));
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (def-audit; personal analysis)' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const txt = await res.text();
      fs.writeFileSync(fp, txt);
      await sleep(250);
      return JSON.parse(txt);
    } catch (e) {
      console.error('fail', url, e.message);
      await sleep(1500);
    }
  }
  return null;
}

const what = process.argv[2] || 'all';
const seasons = { 2024: 18, 2025: 18, 2026: 4 };

if (what === 'all' || what === 'sleeper') {
  for (const [season, nw] of Object.entries(seasons)) {
    await get(`https://api.sleeper.app/schedule/nfl/regular/${season}`, `schedule_${season}.json`);
    for (let w = 1; w <= nw; w++) {
      await get(`https://api.sleeper.app/stats/nfl/${season}/${w}?season_type=regular&position[]=DEF`, `stats_${season}_${w}.json`);
      await get(`https://api.sleeper.app/projections/nfl/${season}/${w}?season_type=regular&position[]=DEF`, `proj_${season}_${w}.json`);
    }
  }
  // week 5 2026 projections (for current-week recommendation sanity check)
  await get(`https://api.sleeper.app/projections/nfl/2026/5?season_type=regular&position[]=DEF`, `proj_2026_5.json`);
  const L = '1312056164149641216';
  await get(`https://api.sleeper.app/v1/league/${L}/rosters`, `rosters.json`);
  await get(`https://api.sleeper.app/v1/league/${L}/users`, `users.json`);
  for (let w = 1; w <= 4; w++) await get(`https://api.sleeper.app/v1/league/${L}/matchups/${w}`, `matchups_${w}.json`);
}

if (what === 'all' || what === 'espn') {
  for (const season of [2024, 2025, 2026]) {
    const nw = seasons[season] + (season === 2026 ? 1 : 0); // 2026 wk5 for upcoming lines
    for (let w = 1; w <= nw; w++) {
      await get(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${w}&dates=${season}`, `espn_sb_${season}_${w}.json`);
    }
  }
}

if (what === 'summaries') {
  // fetch event summaries for events whose scoreboard has no odds
  const ids = JSON.parse(fs.readFileSync(path.join(CACHE, 'need_summary.json'), 'utf8'));
  let i = 0;
  for (const id of ids) {
    await get(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${id}`, `espn_sum_${id}.json`);
    if (++i % 25 === 0) console.log(i, '/', ids.length);
  }
}
console.log('done', what);

if (what === 'odds') {
  // ESPN core API odds (scoreboard drops odds once a game is final)
  for (const season of [2024, 2025, 2026]) {
    for (let w = 1; w <= seasons[season]; w++) {
      const sb = JSON.parse(fs.readFileSync(path.join(CACHE, `espn_sb_${season}_${w}.json`), 'utf8'));
      for (const e of sb.events || []) {
        await get(`https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/${e.id}/competitions/${e.id}/odds`, `espn_core_odds_${e.id}.json`);
      }
    }
    console.log('odds season', season);
  }
}

if (what === 'qb') {
  for (const [season, nw] of Object.entries(seasons)) {
    for (let w = 1; w <= nw; w++) {
      await get(`https://api.sleeper.app/stats/nfl/${season}/${w}?season_type=regular&position[]=QB`, `qbstats_${season}_${w}.json`);
    }
  }
  console.log('qb done');
}
