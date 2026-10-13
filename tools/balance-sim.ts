/**
 * Pacing bot. Plays the REAL model with three player profiles and prints
 * how long each survives and when the key moments happen.
 *
 *   node --experimental-strip-types --no-warnings tools/balance-sim.ts [--seeds 6] [--species raptor] [--zone 0]
 *
 * Targets (DESIGN.md): idle >= 75 s, novice ~ 4 min, level-up every ~15 s early,
 * first evolution ~ 2.5 min.
 */
import { Model, type Offer } from '../src/game/model.ts';
import { isWeapon, type SpeciesId } from '../src/game/config.ts';

const arg = (k: string, d: string) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const SEEDS = +arg('seeds', '6');
const SPECIES = arg('species', 'raptor') as SpeciesId;
const ZONE = +arg('zone', '0');

type Profile = { name: string; skill: number; lag: number; noise: number; idle: boolean };
const PROFILES: Profile[] = [
  { name: 'idle (never moves)', skill: 0, lag: 0, noise: 0, idle: true },
  { name: 'novice', skill: 0.55, lag: 0.45, noise: 0.6, idle: false },
  { name: 'decent', skill: 0.85, lag: 0.2, noise: 0.25, idle: false },
];

function pick(m: Model, offers: Offer[]): number {
  // Weapons first, then the most-levelled thing (a typical player's habit).
  let best = 0, score = -1;
  offers.forEach((o, i) => {
    const s = (isWeapon(o.id as never) ? 10 : 0) + o.level + (m.rng() * 3);
    if (s > score) { score = s; best = i; }
  });
  return best;
}

function run(p: Profile, seed: number) {
  const m = new Model({ species: SPECIES, zone: ZONE, camp: {}, seed });
  m.start();
  const dt = 1 / 60;
  let think = 0, tx = 0, ty = 0, pause = 0;
  const marks: Record<string, number> = {};
  const levelTimes: number[] = [];
  while (m.status === 'play' && m.time < 600) {
    if (m.offers) { m.choose(pick(m, m.offers)); continue; }
    if (!p.idle) {
      think -= dt; pause -= dt;
      if (think <= 0) {
        think = p.lag;
        if (m.rng() < (1 - p.skill) * 0.25) pause = 0.6; // hesitates
        // Flee: sum of pushes from enemies nearby, weighted by closeness.
        let fx = 0, fy = 0;
        for (const e of m.enemies) {
          const dx = m.px - e.x, dy = m.py - e.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 320 * 320) { const w = (e.def.kind === 'boss' ? 6 : 1) / Math.max(400, d2); fx += dx * w; fy += dy * w; }
        }
        for (const pr of m.projs) if (pr.kind === 'enemy') {
          const dx = m.px - pr.x, dy = m.py - pr.y, d2 = dx * dx + dy * dy;
          if (d2 < 150 * 150) { fx += dx * 2 / Math.max(200, d2); fy += dy * 2 / Math.max(200, d2); }
        }
        // Drift toward gems a little when it is calm.
        let gx = 0, gy = 0, gd = 1e9;
        for (const g of m.gems) { const d = Math.hypot(g.x - m.px, g.y - m.py); if (d < gd) { gd = d; gx = g.x - m.px; gy = g.y - m.py; } }
        const fl = Math.hypot(fx, fy);
        if (fl > 0.004) { tx = fx / fl; ty = fy / fl; }
        else if (gd < 500) { tx = gx / gd; ty = gy / gd; }
        // Circle a bit so the flight is not a straight line forever.
        const c = 0.45 * p.skill;
        const rx = tx - ty * c, ry = ty + tx * c;
        tx = rx + (m.rng() - 0.5) * p.noise; ty = ry + (m.rng() - 0.5) * p.noise;
      }
      if (pause > 0) m.setMove(0, 0); else m.setMove(tx, ty);
    }
    const lv = m.level;
    m.step(dt);
    if (m.level > lv) levelTimes.push(m.time);
    for (const t of [60, 120, 180, 300]) if (!marks['L@' + t] && m.time >= t) marks['L@' + t] = m.level;
    if (m.form >= 1 && !marks.evo1) marks.evo1 = Math.round(m.time);
    if (m.form >= 2 && !marks.evo2) marks.evo2 = Math.round(m.time);
  }
  const early = levelTimes.filter((t) => t <= 180);
  return { time: m.time, status: m.status, level: m.level, kills: m.kills, coins: m.coins, marks,
    gap: early.length ? Math.min(180, m.time) / early.length : 0, enemies: m.enemies.length, weapons: [...m.weapons].map(([k, v]) => k + v).join(' ') };
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
for (const p of PROFILES) {
  const rs = Array.from({ length: SEEDS }, (_, i) => run(p, 1000 + i * 7919));
  const avg = rs.reduce((a, r) => a + r.time, 0) / rs.length;
  const over3 = rs.filter((r) => r.time >= 180).length / rs.length;
  console.log(`\n== ${p.name}: avg ${fmt(avg)}  >3min ${(over3 * 100).toFixed(0)}%  won ${rs.filter((r) => r.status === 'won').length}/${rs.length}`);
  for (const r of rs) {
    console.log(`  ${fmt(r.time)} ${r.status.padEnd(4)} L${r.level} kills ${r.kills} coins ${r.coins} | L@1m ${r.marks['L@60'] ?? '-'} L@2m ${r.marks['L@120'] ?? '-'} L@3m ${r.marks['L@180'] ?? '-'} L@5m ${r.marks['L@300'] ?? '-'} | evo ${r.marks.evo1 ?? '-'}/${r.marks.evo2 ?? '-'}s | lvl every ${r.gap.toFixed(1)}s | alive ${r.enemies} | ${r.weapons}`);
  }
}
