// FantasyPros public weekly DST ECR pages (no key, no login). Extract ecrData JSON only.
import fs from 'node:fs'; import path from 'node:path';
const DIR = path.dirname(new URL(import.meta.url).pathname); const CACHE = path.join(DIR, 'cache');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jobs = [];
for (let w = 1; w <= 18; w++) jobs.push([2025, w]);
for (let w = 1; w <= 5; w++) jobs.push([2026, w]);
for (const [y, w] of jobs) {
  const fp = path.join(CACHE, `fp_ecr_${y}_${w}.json`);
  if (fs.existsSync(fp)) continue;
  const res = await fetch(`https://www.fantasypros.com/nfl/rankings/dst.php?week=${w}&year=${y}`, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36' } });
  const html = await res.text();
  const m = html.match(/ecrData\s*=\s*(\{.*?\});\s*\n/s) || html.match(/ecrData\s*=\s*(\{.*?\});/s);
  if (!m) { console.log('no ecrData', y, w, res.status); await sleep(2000); continue; }
  const data = JSON.parse(m[1]);
  fs.writeFileSync(fp, JSON.stringify(data));
  console.log(y, w, 'year', data.year, 'week', data.week, 'n', data.players?.length, 'updated', data.last_updated, 'experts', data.total_experts);
  await sleep(1500);
}
