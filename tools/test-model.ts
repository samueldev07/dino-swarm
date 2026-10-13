/**
 * Rule tests on the real model.
 *   node --experimental-strip-types --no-warnings tools/test-model.ts
 */
import { Model } from '../src/game/model.ts';
import { xpToNext, WEAPON_IDS, MAX_WEAPONS, TUNING, CAMP } from '../src/game/config.ts';

let fails = 0;
const ok = (c: boolean, msg: string) => { if (!c) { fails++; console.log('FAIL', msg); } else console.log('ok  ', msg); };
const fresh = (seed = 1) => { const m = new Model({ species: 'raptor', zone: 0, camp: {}, seed }); m.start(); return m; };

{ // clock waits for the first move (Poki gameplayStart)
  const m = new Model({ species: 'raptor', zone: 0, camp: {}, seed: 1 });
  m.step(1); ok(m.time === 0 && m.status === 'ready', 'run clock starts only after start()');
}
{ // starting weapon per species
  ok(new Model({ species: 'ankylo', zone: 0, camp: {}, seed: 1 }).weapons.has('stomp'), 'ankylo starts with stomp');
  ok(new Model({ species: 'ptero', zone: 0, camp: {}, seed: 1 }).weapons.has('spit'), 'ptero starts with spit');
}
{ // xp -> level -> offers, and the world pauses while choosing
  const m = fresh();
  m.gems.push({ x: m.px, y: m.py, value: xpToNext(1), flying: false, v: 0 });
  m.step(1 / 60);
  ok(m.level === 2 && !!m.offers, 'collecting enough amber levels up and opens 3 offers');
  ok(m.offers!.filter((o) => WEAPON_IDS.includes(o.id as never) && o.level === 1).length >= 2, 'first offer shows two new weapons');
  const t = m.time; m.step(1); ok(m.time === t, 'time is frozen while choosing');
  const pick = m.offers![0]; m.choose(0);
  ok(!m.offers, 'choosing closes the offer');
  ok((m.weapons.get(pick.id as never) ?? m.passive(pick.id as never)) === pick.level, 'the picked skill gets its level');
}
{ // first evolution (TUNING.evolveAt[0]): full heal, more max HP, world holds
  const m = fresh();
  m.hp = 10;
  let need = 0; for (let l = 1; l < TUNING.evolveAt[0]; l++) need += xpToNext(l);
  m.gems.push({ x: m.px, y: m.py, value: need, flying: false, v: 0 });
  m.step(1 / 60);
  ok(m.form === 1 && m.hp === m.maxHp && m.maxHp === 100 + TUNING.evolveHp, 'first evolution level evolves, heals and adds max HP');
  ok(m.hold > 0, 'evolution holds the world for the celebration');
}
{ // contact damage + mercy frames + death
  const m = fresh();
  const e = m.spawn('grub', 0, 0); e.x = m.px; e.y = m.py;
  m.step(1 / 60);
  const hp1 = m.hp; ok(hp1 < 100, 'touching an enemy hurts');
  m.step(1 / 60); ok(m.hp === hp1, 'mercy frames block the next hit');
  m.hp = 1; m.invuln = 0; m.step(1 / 60);
  ok(m.status === 'dead', 'reaching 0 HP ends the run');
  ok(m.revive() && m.status === 'play' && m.hp > 0, 'revive works once');
  m.hp = 1; m.invuln = 0; m.status = 'play';
  const e2 = m.spawn('beetle', 0, 0); e2.x = m.px; e2.y = m.py; e2.stun = 0;
  m.step(1 / 60);
  ok(m.status === 'dead' && !m.revive(), 'no second revive');
}
{ // weapon slots cap
  const m = fresh();
  for (const id of WEAPON_IDS) m.weapons.set(id, 1);
  ok(!m.candidates().some((o) => o.level === 1 && WEAPON_IDS.includes(o.id as never)) || m.weapons.size < MAX_WEAPONS, 'no new weapon offered when slots are full');
}
{ // kills drop amber; boss at 3:00; win at 10:00
  const m = fresh();
  const e = m.spawn('grub', 0, 300);
  m.hitEnemy(e, 999, 0, 0, 0, false);
  ok(m.kills === 1 && m.gems.length === 1, 'a kill drops amber');
  const b = fresh(3); b.time = 179.99; b.step(1 / 60);
  ok(!!b.boss, 'first boss arrives at 3:00');
  const w = fresh(4); w.time = TUNING.runLength - 0.001; w.invuln = 99; w.step(1 / 60);
  ok(w.status === 'won', 'surviving the clock clears the zone');
}
{ // chest upgrades an owned skill
  const m = fresh();
  m.pickups.push({ kind: 'chest', x: m.px, y: m.py, value: 1, flying: false, v: 0, age: 0 });
  m.step(1 / 60);
  ok(m.weapons.get('bite') === 2 || [...m.passives.values()].some((v) => v > 0) || m.weapons.size > 1, 'a chest grants an upgrade');
}
{ // camp upgrades apply
  const m = new Model({ species: 'raptor', zone: 0, camp: { vitality: 2, greed: 1 }, seed: 1 });
  m.coins = 100;
  ok(m.maxHp === 100 + 2 * CAMP.vitality.step && m.coinsEarned === 110, 'camp vitality and greed apply');
}
{ // weapon evolution: max weapon + partner passive -> next chest evolves it
  const m = fresh();
  m.weapons.set('bite', 5); m.passives.set('might', 1);
  const before = m.wl('bite').damage;
  m.pickups.push({ kind: 'chest', x: m.px, y: m.py, value: 1, flying: false, v: 0, age: 0 });
  m.step(1 / 60);
  ok(m.evolved.has('bite') && m.wl('bite').damage > before, 'chest evolves a max weapon with its partner passive');
}
{ // reroll and banish
  const m = fresh();
  m.gems.push({ x: m.px, y: m.py, value: xpToNext(1), flying: false, v: 0 });
  m.step(1 / 60);
  ok(m.reroll() && m.rerolls === 1 && !!m.offers, 'reroll replaces the offers');
  const id = m.offers![0].id;
  ok(m.banish(0) && !m.candidates().some((o) => o.id === id), 'banished skill never comes back this run');
  ok(!m.banish(0), 'only one banish');
}
{ // crowd: two enemies touching hurt more than one
  const a = fresh(9); const e1 = a.spawn('wolf', 0, 0); e1.x = a.px; e1.y = a.py; a.enemies = [e1]; a.step(1 / 60);
  const b = fresh(9); const f1 = b.spawn('wolf', 0, 0), f2 = b.spawn('wolf', 0, 0);
  for (const f of [f1, f2]) { f.x = b.px; f.y = b.py; } b.enemies = [f1, f2]; b.step(1 / 60);
  ok(100 - b.hp > 100 - a.hp, 'being swarmed hurts more than one touch');
}
{ // Loyal Mutt: a dog appears and bites for 1/10 of the hero's jab
  const m = fresh(5);
  m.weapons.set('thorns', 1);
  const e = m.spawn('beetle', 0, 120); e.speed = 0; e.hp = e.maxHp = 9999; m.enemies = [e];
  for (let i = 0; i < 240; i++) { m.invuln = 9; m.step(1 / 60); }
  ok(m.pets.length === 1 && e.hp < 9999, 'a dog spawns and bites the nearest enemy');
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
