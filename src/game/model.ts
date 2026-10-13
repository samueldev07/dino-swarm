/**
 * All rules of a run. Pure: no DOM, no canvas, no timers. The browser view,
 * the tests and the balance bot all drive this same class, so pacing claims
 * are measured on the real rules.
 *
 * World units = virtual pixels at camera zoom 1. +x right, +y down.
 * The model advances in fixed steps (STEP) so results never depend on the
 * frame rate.
 */
import {
  STEP, TUNING, type Tuning, ENEMIES, type EnemyKind, type EnemyDef, SPAWN_MIX, EVENTS,
  WEAPONS, type WeaponId, type PassiveId, type SkillId, PASSIVE_STEP, WEAPON_IDS, PASSIVE_IDS,
  isWeapon, MAX_LEVEL, MAX_WEAPONS, THORN_LIFE, THORN_TICK, ROAR_STUN, METEOR_DELAY,
  xpToNext, SPECIES, EVOLUTIONS, EVOLVED, type SpeciesId, ZONES, CAMP, type CampId,
} from './config.ts';

// ------------------------------------------------------------------ types
export interface Enemy {
  id: number;
  def: EnemyDef;
  x: number; y: number;
  /** Knockback velocity, decays quickly. */
  kx: number; ky: number;
  hp: number; maxHp: number;
  r: number;
  speed: number;
  damage: number;
  /** Seconds left of the white hit flash (view). */
  flash: number;
  stun: number;
  age: number;
  /** Behaviour timer (dash, spit, boss attacks). */
  act: number;
  /** 0 idle, 1 wind-up, 2 dashing / charging. */
  mode: number;
  dx: number; dy: number;
  orbitCd: number;
  facing: 1 | -1;
  dead: boolean;
  elite: boolean;
  xp: number;
  /** Boss number (1..3); 0 for everything else. */
  tier: number;
  spin: number;
}

export type ProjKind = 'spit' | 'bone' | 'enemy';
export interface Proj {
  kind: ProjKind;
  x: number; y: number; vx: number; vy: number;
  r: number;
  damage: number;
  pierce: number;
  life: number;
  age: number;
  /** Boomerang: distance target and the phase (out / back). */
  range: number;
  back: boolean;
  /** Enemy id -> time it may be hit again by this projectile. */
  hits: Map<number, number>;
}

export interface Gem { x: number; y: number; value: number; flying: boolean; v: number }
export type PickupKind = 'meat' | 'coin' | 'magnet' | 'chest';
export interface Pickup { kind: PickupKind; x: number; y: number; value: number; flying: boolean; v: number; age: number }

/** Short-lived shapes the view draws (and the model uses for timing). */
export interface Slash { x: number; y: number; angle: number; r: number; age: number; life: number }
export interface Wave { kind: 'stomp' | 'roar' | 'revive'; x: number; y: number; r: number; age: number; life: number }
export interface Meteor { x: number; y: number; r: number; t: number; damage: number }
export interface Thorn { x: number; y: number; r: number; life: number; tick: number }

export type OfferId = SkillId | 'heal' | 'gold';
export interface Offer { id: OfferId; level: number /* level after taking it, 0 for heal/gold */ }

export type Status = 'ready' | 'play' | 'dead' | 'won';

export type GameEvent =
  | { t: 'hit'; x: number; y: number; dmg: number; crit: boolean; boss: boolean }
  | { t: 'kill'; x: number; y: number; kind: EnemyKind; by?: WeaponId }
  | { t: 'hurt'; dmg: number }
  | { t: 'gem'; value: number }
  | { t: 'coin'; x: number; y: number; n: number }
  | { t: 'heal'; n: number }
  | { t: 'magnet' }
  | { t: 'chest'; offer: Offer; coins: number }
  | { t: 'weaponEvolve'; w: WeaponId; name: string }
  | { t: 'level'; level: number }
  | { t: 'evolve'; form: number }
  | { t: 'fire'; w: WeaponId }
  | { t: 'meteor'; x: number; y: number; r: number }
  | { t: 'splash'; x: number; y: number }
  | { t: 'boss'; n: number }
  | { t: 'bossDead'; x: number; y: number; tier: number }
  | { t: 'wave'; kind: 'ring' | 'stream' | 'brute' }
  | { t: 'win' }
  | { t: 'dead' };

export interface RunOptions {
  species: SpeciesId;
  zone: number;
  camp: Partial<Record<CampId, number>>;
  seed?: number;
  tuning?: Partial<Tuning>;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CELL = 80;
const KNOCK: Record<WeaponId, number> = {
  bite: 150, spit: 60, boomerang: 90, orbit: 130, stomp: 280, meteor: 220, thorns: 0, roar: 460,
};

export class Model {
  readonly T: Tuning;
  readonly rng: () => number;
  readonly species: SpeciesId;
  readonly zone: number;
  readonly camp: Partial<Record<CampId, number>>;

  status: Status = 'ready';
  time = 0;
  /** Evolution celebration: the world holds still while > 0. */
  hold = 0;

  // player
  px = 0; py = 0;
  mx = 0; my = 0;              // move input, length <= 1
  faceX = 1; faceY = 0;        // last move direction
  hp: number;
  maxHp: number;
  invuln = 0;
  level = 1;
  xp = 0;
  form = 0;                    // 0..2
  kills = 0;
  coins = 0;
  revived = false;
  damageTaken = 0;
  /** What dealt the last hit (result card: "Knocked out by ..."). */
  lastHitBy: EnemyKind | 'spore' | null = null;
  /** Level-up control (Codex UI contract): free rerolls and banishes left this run. */
  rerolls = 2;
  banishes = 1;
  banished = new Set<SkillId>();

  weapons = new Map<WeaponId, number>();   // id -> level (1..5)
  passives = new Map<PassiveId, number>();
  private cds = new Map<WeaponId, number>();
  orbitAngle = 0;
  private lastThornX = 0;
  private lastThornY = 0;

  /** Pending level-up picks; `offers` is shown while non-null. */
  offers: Offer[] | null = null;
  private pendingLevels = 0;
  private picks = 0;

  enemies: Enemy[] = [];
  projs: Proj[] = [];
  gems: Gem[] = [];
  pickups: Pickup[] = [];
  slashes: Slash[] = [];
  waves: Wave[] = [];
  meteors: Meteor[] = [];
  thorns: Thorn[] = [];
  boss: Enemy | null = null;
  bossKills = 0;
  evolved = new Set<WeaponId>();
  /** Half-size of the camera view in world units (the view keeps it current). */
  viewHalf = { w: 640, h: 420 };
  private farXp = 0;
  bossesSpawned = 0;

  private events: GameEvent[] = [];
  private nextId = 1;
  private spawnAcc = 0;
  private eventIdx = 0;
  private grid = new Map<number, Enemy[]>();
  private acc = 0;

  constructor(opts: RunOptions) {
    this.T = { ...TUNING, ...opts.tuning };
    this.rng = mulberry32(opts.seed ?? (Date.now() & 0xffffffff));
    this.species = opts.species;
    this.zone = Math.max(0, Math.min(ZONES.length - 1, opts.zone));
    this.camp = opts.camp;
    const sp = SPECIES[opts.species];
    this.maxHp = this.baseMaxHp();
    this.hp = this.maxHp;
    this.weapons.set(sp.start, 1);
    this.cds.set(sp.start, 0.4);
  }

  // ---------------------------------------------------------------- stats
  private campLv(id: CampId): number { return this.camp[id] ?? 0; }
  private baseMaxHp(): number {
    return SPECIES[this.species].hp + this.campLv('vitality') * CAMP.vitality.step;
  }
  passive(id: PassiveId): number { return this.passives.get(id) ?? 0; }
  get might(): number {
    return SPECIES[this.species].might * (1 + this.campLv('might') * CAMP.might.step)
      * (1 + this.passive('might') * PASSIVE_STEP.might) * (1 + this.form * this.T.evolveMight);
  }
  get speed(): number {
    return this.T.playerSpeed * SPECIES[this.species].speed
      * (1 + this.campLv('speed') * CAMP.speed.step + this.passive('swift') * PASSIVE_STEP.swift);
  }
  get cooldownMult(): number { return Math.max(0.5, 1 - this.passive('haste') * PASSIVE_STEP.haste); }
  get pickupRadius(): number {
    return this.T.pickupRadius * (1 + this.campLv('magnet') * CAMP.magnet.step + this.passive('magnet') * PASSIVE_STEP.magnet);
  }
  get armor(): number { return this.campLv('armor') * CAMP.armor.step; }
  get xpNeed(): number { return xpToNext(this.level); }
  get playerRadius(): number { return this.T.playerRadius * (1 + this.form * 0.14); }
  /** Coins the run banks, with the Greed bonus and the zone multiplier. */
  get coinsEarned(): number {
    const bonus = this.time / 4 + this.kills / 40 + this.bossKills * this.T.bossCoins;
    return Math.floor((this.coins + bonus) * ZONES[this.zone].coinMult * (1 + this.campLv('greed') * CAMP.greed.step));
  }
  get choosing(): boolean { return this.offers !== null; }

  drain(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  // ---------------------------------------------------------------- input
  setMove(x: number, y: number): void {
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    this.mx = x; this.my = y;
    if (l > 0.15) { this.faceX = x / Math.max(l, 1e-6); this.faceY = y / Math.max(l, 1e-6); }
  }

  /** The run clock starts on the player's first move (Poki: gameplayStart). */
  start(): void {
    if (this.status !== 'ready') return;
    this.status = 'play';
    const n = this.T.openingRing;
    for (let i = 0; i < n; i++) this.spawn('grub', (i / n) * Math.PI * 2 + 0.3, 450 + this.rng() * 80);
  }

  /** Replace the current three offers. */
  reroll(): boolean {
    if (!this.offers || this.rerolls <= 0) return false;
    this.rerolls--;
    this.offers = this.rollOffers();
    return true;
  }

  /** Remove offer `i` from this run for good and roll a fresh set. */
  banish(i: number): boolean {
    if (!this.offers || this.banishes <= 0 || i < 0 || i >= this.offers.length) return false;
    const id = this.offers[i].id;
    if (id === 'heal' || id === 'gold') return false;
    this.banishes--;
    this.banished.add(id);
    this.offers = this.rollOffers();
    return true;
  }

  choose(i: number): boolean {
    if (!this.offers || i < 0 || i >= this.offers.length) return false;
    this.apply(this.offers[i]);
    this.offers = null;
    this.picks++;
    this.pendingLevels--;
    if (this.pendingLevels > 0) this.offers = this.rollOffers();
    return true;
  }

  revive(): boolean {
    if (this.status !== 'dead' || this.revived) return false;
    this.revived = true;
    this.status = 'play';
    this.hp = Math.round(this.maxHp * 0.6);
    this.invuln = 2.5;
    this.waves.push({ kind: 'revive', x: this.px, y: this.py, r: 420, age: 0, life: 0.7 });
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - this.px, e.y - this.py);
      if (d < 420 && e.def.kind !== 'boss' && e.def.kind !== 'brute') this.hitEnemy(e, 9999, 0, 0, 0, false);
      else if (d < 600 || e.def.kind === 'brute') e.stun = 1.5;
    }
    return true;
  }

  // ---------------------------------------------------------------- loop
  /** Advance by real time (view). Fixed internal steps. */
  update(dt: number): void {
    this.acc = Math.min(this.acc + dt, 0.1);
    while (this.acc >= STEP) {
      this.acc -= STEP;
      this.step(STEP);
    }
  }

  step(dt: number): void {
    if (this.status !== 'play' || this.offers) return;
    if (this.hold > 0) { this.hold -= dt; return; }
    this.time += dt;

    this.movePlayer(dt);
    this.director(dt);
    this.buildGrid();
    this.moveEnemies(dt);
    this.fireWeapons(dt);
    this.updateProjs(dt);
    this.updateEffects(dt);
    this.updatePickups(dt);
    this.contact(dt);
    this.cull();

    if (this.status === 'play' && this.time >= this.T.runLength) {
      this.status = 'won';
      this.events.push({ t: 'win' });
    }
  }

  private movePlayer(dt: number): void {
    const s = this.speed;
    this.px += this.mx * s * dt;
    this.py += this.my * s * dt;
    if (this.invuln > 0) this.invuln -= dt;
    const regen = this.passive('regen') * PASSIVE_STEP.regen;
    if (regen > 0 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + regen * dt);
  }

  // ---------------------------------------------------------------- spawning
  private director(dt: number): void {
    const T = this.T;
    const crowded = this.enemies.length > T.crowdCap;
    const rate = Math.min(T.rateMax, T.rateBase + this.time * T.rateGrowth) * (crowded ? 0.5 : 1);
    const dist = this.time < T.earlyUntil ? T.earlySpawnDist : T.spawnDist;
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.enemies.length >= T.maxEnemies) continue;
      const e = this.spawn(this.pickKind(), this.spawnAngle(), dist);
      const eliteP = crowded ? T.eliteCrowd : this.time >= T.eliteFrom ? T.eliteChance : 0;
      if (eliteP > 0 && this.rng() < eliteP) this.makeElite(e);
    }
    while (this.eventIdx < EVENTS.length && this.time >= EVENTS[this.eventIdx].t) {
      const ev = EVENTS[this.eventIdx++];
      this.events.push({ t: 'wave', kind: ev.kind });
      if (ev.kind === 'ring') {
        for (let i = 0; i < ev.count; i++) this.spawn(ev.enemy, (i / ev.count) * Math.PI * 2, T.spawnDist * 0.82);
      } else if (ev.kind === 'stream') {
        const a = this.spawnAngle();
        for (let i = 0; i < ev.count; i++) this.spawn(ev.enemy, a + (this.rng() - 0.5) * 0.5, T.spawnDist + i * 14);
      } else {
        for (let i = 0; i < ev.count; i++) this.spawn(ev.enemy, this.spawnAngle(), T.spawnDist);
      }
    }
    const nextBoss = T.bossAt[this.bossesSpawned];
    if (nextBoss !== undefined && this.time >= nextBoss) {
      this.bossesSpawned++;
      const b = this.spawn('boss', this.spawnAngle(), T.spawnDist * 0.9);
      const k = 1 + (this.bossesSpawned - 1) * 1.1;
      b.hp = b.maxHp = b.maxHp * k;
      b.act = 3;
      b.tier = this.bossesSpawned;
      this.boss = b;
      this.events.push({ t: 'boss', n: this.bossesSpawned });
    }
  }

  private pickKind(): EnemyKind {
    let row = SPAWN_MIX[0];
    for (const r of SPAWN_MIX) if (this.time >= r.t) row = r;
    const entries = Object.entries(row.mix) as [EnemyKind, number][];
    let total = 0;
    for (const [, w] of entries) total += w;
    let roll = this.rng() * total;
    for (const [k, w] of entries) { roll -= w; if (roll <= 0) return k; }
    return entries[0][0];
  }

  /** Favour spawning ahead of where the player is walking. */
  private spawnAngle(): number {
    const moving = Math.hypot(this.mx, this.my) > 0.2;
    if (moving && this.rng() < 0.55) {
      return Math.atan2(this.my, this.mx) + (this.rng() - 0.5) * 1.6;
    }
    return this.rng() * Math.PI * 2;
  }

  private makeElite(e: Enemy): void {
    e.elite = true;
    e.hp = e.maxHp = e.maxHp * 4;
    e.r *= 1.3;
    e.xp *= 3;
    e.damage *= 1.3;
  }

  spawn(kind: EnemyKind, angle: number, dist: number): Enemy {
    const def = ENEMIES[kind];
    const z = ZONES[this.zone];
    const hp = Math.round(def.hp * z.enemyHp * (kind === 'boss' ? 1 : 1 + this.time * this.T.hpGrowth));
    const e: Enemy = {
      id: this.nextId++, def,
      x: this.px + Math.cos(angle) * dist, y: this.py + Math.sin(angle) * dist,
      kx: 0, ky: 0, hp, maxHp: hp, r: def.radius,
      speed: def.speed * (0.92 + this.rng() * 0.16),
      damage: def.damage * z.enemyDmg,
      flash: 0, stun: 0, age: this.rng() * 10, act: 1 + this.rng() * 2, mode: 0, dx: 0, dy: 0,
      orbitCd: 0, facing: 1, dead: false, elite: false, xp: def.xp, tier: 0, spin: 0,
    };
    this.enemies.push(e);
    return e;
  }

  // ---------------------------------------------------------------- spatial grid
  private key(cx: number, cy: number): number { return (cx + 32768) * 65536 + (cy + 32768); }

  private buildGrid(): void {
    for (const list of this.grid.values()) list.length = 0;
    for (const e of this.enemies) {
      const k = this.key(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
      let list = this.grid.get(k);
      if (!list) { list = []; this.grid.set(k, list); }
      list.push(e);
    }
  }

  /** Calls `fn` for every live enemy whose circle may touch (x, y, r). */
  near(x: number, y: number, r: number, fn: (e: Enemy) => void): void {
    const pad = r + 64;
    const x0 = Math.floor((x - pad) / CELL), x1 = Math.floor((x + pad) / CELL);
    const y0 = Math.floor((y - pad) / CELL), y1 = Math.floor((y + pad) / CELL);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const list = this.grid.get(this.key(cx, cy));
        if (!list) continue;
        for (const e of list) if (!e.dead) fn(e);
      }
    }
  }

  nearest(x: number, y: number, maxD: number, skip?: Set<number>): Enemy | null {
    let best: Enemy | null = null;
    let bd = maxD * maxD;
    for (const e of this.enemies) {
      if (e.dead || (skip && skip.has(e.id))) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // ---------------------------------------------------------------- enemies
  private moveEnemies(dt: number): void {
    const decay = Math.exp(-9 * dt);
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.age += dt;
      if (e.flash > 0) e.flash -= dt;
      if (e.orbitCd > 0) e.orbitCd -= dt;
      e.x += e.kx * dt; e.y += e.ky * dt;
      e.kx *= decay; e.ky *= decay;
      const stunned = e.stun > 0;
      if (stunned) e.stun -= dt;

      const dx = this.px - e.x, dy = this.py - e.y;
      const d = Math.hypot(dx, dy) || 1;
      let ux = dx / d, uy = dy / d;
      let sp = e.speed;
      const def = e.def;

      if (def.kind === 'boss') {
        sp = this.bossBrain(e, dt, ux, uy, d);
        if (e.mode === 2) { ux = e.dx; uy = e.dy; }
      } else if (def.dash) {
        e.act -= dt;
        if (e.mode === 0 && e.act <= 0 && d < 430) { e.mode = 1; e.act = 0.5; e.dx = ux; e.dy = uy; }
        else if (e.mode === 1) { sp = 0; if (e.act <= 0) { e.mode = 2; e.act = 0.5; } }
        else if (e.mode === 2) { sp = e.speed * 3.3; ux = e.dx; uy = e.dy; if (e.act <= 0) { e.mode = 0; e.act = 2.4 + this.rng(); } }
      } else if (def.ranged) {
        e.act -= dt;
        if (d < 300) sp = d < 230 ? -e.speed * 0.6 : 0;
        if (e.act <= 0 && d < 520 && !stunned) {
          e.act = 2.6 + this.rng();
          this.projs.push({
            kind: 'enemy', x: e.x, y: e.y, vx: ux * 230, vy: uy * 230, r: 10,
            damage: 8 * ZONES[this.zone].enemyDmg, pierce: 0, life: 3, age: 0, range: 0, back: false, hits: new Map(),
          });
        }
      } else if (def.flutter) {
        const w = Math.sin(e.age * 5) * 0.7;
        const px = -uy, py = ux;
        ux += px * w; uy += py * w;
        const l = Math.hypot(ux, uy) || 1;
        ux /= l; uy /= l;
      }

      if (stunned) sp = 0;
      e.x += ux * sp * dt;
      e.y += uy * sp * dt;
      if (Math.abs(ux) > 0.15) e.facing = ux > 0 ? 1 : -1;

      // Soft separation so the swarm reads as a crowd, not one blob.
      this.near(e.x, e.y, e.r, (o) => {
        if (o === e) return;
        const sx = e.x - o.x, sy = e.y - o.y;
        const min = (e.r + o.r) * 0.85;
        const d2 = sx * sx + sy * sy;
        if (d2 > 0 && d2 < min * min) {
          const dd = Math.sqrt(d2);
          const push = (min - dd) * 0.5 * Math.min(1, o.def.mass / e.def.mass);
          e.x += (sx / dd) * push;
          e.y += (sy / dd) * push;
        }
      });
    }
  }

  /** Boss: chases, winds up a charge, or fires a ring of spores. Returns the speed this step. */
  private bossBrain(e: Enemy, dt: number, ux: number, uy: number, d: number): number {
    e.act -= dt;
    if (e.mode === 0) {
      if (e.act <= 0) {
        if (this.rng() < 0.55 && d < 700) { e.mode = 1; e.act = 0.85; e.dx = ux; e.dy = uy; }
        else {
          const n = 14 + this.bossesSpawned * 2;
          const off = this.rng() * Math.PI;
          for (let i = 0; i < n; i++) {
            const a = off + (i / n) * Math.PI * 2;
            this.projs.push({
              kind: 'enemy', x: e.x, y: e.y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, r: 12,
              damage: 12 * ZONES[this.zone].enemyDmg, pierce: 0, life: 4, age: 0, range: 0, back: false, hits: new Map(),
            });
          }
          e.act = 4.2;
          if (e.tier >= 2) {
            for (let i = 0; i < 8; i++) {
              const g = this.spawn('grub', 0, 0);
              const a = (i / 8) * Math.PI * 2;
              g.x = e.x + Math.cos(a) * (e.r + 50);
              g.y = e.y + Math.sin(a) * (e.r + 50);
            }
          }
        }
      }
      if (e.tier >= 3) {
        e.spin -= dt;
        if (e.spin <= 0) {
          e.spin = 0.14;
          const a = e.age * 2.4;
          this.projs.push({
            kind: 'enemy', x: e.x, y: e.y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, r: 11,
            damage: 10 * ZONES[this.zone].enemyDmg, pierce: 0, life: 4, age: 0, range: 0, back: false, hits: new Map(),
          });
        }
      }
      return e.speed;
    }
    if (e.mode === 1) {
      if (e.act <= 0) { e.mode = 2; e.act = 0.9; }
      return 0;
    }
    if (e.act <= 0) {
      // Tier 2+: a second charge straight after the first.
      if (e.tier >= 2 && e.spin > -1) { e.spin = -1; e.mode = 1; e.act = 0.5; e.dx = ux; e.dy = uy; return 0; }
      e.spin = 0;
      e.mode = 0; e.act = 3.5 + this.rng() * 1.5;
    }
    return 470;
  }

  // ---------------------------------------------------------------- damage
  hitEnemy(e: Enemy, base: number, kx: number, ky: number, knock: number, canCrit = true, by?: WeaponId): void {
    if (e.dead) return;
    const crit = canCrit && this.rng() < this.T.critChance;
    const dmg = Math.max(1, Math.round(base * (crit ? this.T.critMult : 1)));
    e.hp -= dmg;
    e.flash = 0.12;
    if (knock > 0) {
      const m = e.def.mass;
      e.kx += (kx * knock) / m;
      e.ky += (ky * knock) / m;
    }
    this.events.push({ t: 'hit', x: e.x, y: e.y - e.r, dmg, crit, boss: e.def.kind === 'boss' });
    if (e.hp <= 0) this.killEnemy(e, by);
  }

  private killEnemy(e: Enemy, by?: WeaponId): void {
    e.dead = true;
    this.kills++;
    this.events.push({ t: 'kill', x: e.x, y: e.y, kind: e.def.kind, by });
    this.dropGem(e.x, e.y, e.xp);
    const r = this.rng();
    if (e.def.kind === 'boss') {
      this.pickups.push(this.pickup('chest', e.x, e.y, 1));
      this.pickups.push(this.pickup('magnet', e.x + 40, e.y, 1));
      this.pickups.push(this.pickup('coin', e.x - 40, e.y, 25));
      this.events.push({ t: 'bossDead', x: e.x, y: e.y, tier: e.tier });
      this.bossKills++;
      if (this.boss === e) this.boss = this.enemies.find((o) => !o.dead && o.def.kind === 'boss') ?? null;
    } else if (e.def.kind === 'brute' || (e.elite && this.rng() < 0.15)) {
      this.pickups.push(this.pickup('chest', e.x, e.y, 1));
    } else if (r < this.T.magnetDrop) {
      this.pickups.push(this.pickup('magnet', e.x, e.y, 1));
    } else if (r < this.T.magnetDrop + this.T.meatDrop) {
      this.pickups.push(this.pickup('meat', e.x, e.y, this.T.meatHeal));
    } else if (r < this.T.magnetDrop + this.T.meatDrop + this.T.coinDrop) {
      this.pickups.push(this.pickup('coin', e.x, e.y, 1 + Math.floor(this.rng() * 2)));
    }
  }

  private pickup(kind: PickupKind, x: number, y: number, value: number): Pickup {
    return { kind, x, y, value, flying: false, v: 0, age: 0 };
  }

  private dropGem(x: number, y: number, value: number): void {
    value += this.farXp;
    this.farXp = 0;
    if (this.gems.length >= 400) {
      // Too many on the floor: fold this one into the oldest gem.
      this.gems[0].value += value;
      return;
    }
    this.gems.push({ x: x + (this.rng() - 0.5) * 12, y: y + (this.rng() - 0.5) * 12, value, flying: false, v: 0 });
  }

  // ---------------------------------------------------------------- weapons
  /** Current stats of a weapon, with the evolution boost applied. */
  wl(id: WeaponId): { damage: number; cooldown: number; count: number; area: number; pierce?: number } {
    const L = WEAPONS[id][(this.weapons.get(id) ?? 1) - 1];
    if (!this.evolved.has(id)) return L;
    return {
      damage: L.damage * EVOLVED.damage, cooldown: L.cooldown * EVOLVED.cooldown,
      count: L.count + EVOLVED.count, area: L.area * EVOLVED.area, pierce: (L.pierce ?? 0) + 2,
    };
  }

  /** Weapons ready to evolve at the next chest. */
  evolvable(): WeaponId[] {
    const out: WeaponId[] = [];
    for (const [id, lv] of this.weapons) {
      if (lv >= MAX_LEVEL && !this.evolved.has(id) && this.passive(EVOLUTIONS[id].passive) > 0) out.push(id);
    }
    return out;
  }

  private fireWeapons(dt: number): void {
    for (const [id] of this.weapons) {
      if (id === 'orbit') { this.orbit(dt); continue; }
      if (id === 'thorns') { this.thornTrail(dt); continue; }
      const cd = (this.cds.get(id) ?? 0) - dt;
      if (cd > 0) { this.cds.set(id, cd); continue; }
      const L = this.wl(id);
      const fired = this.fire(id, L);
      this.cds.set(id, fired ? L.cooldown * this.cooldownMult : 0.15);
      if (fired) this.events.push({ t: 'fire', w: id });
    }
  }

  private fire(id: WeaponId, L: { damage: number; count: number; area: number; pierce?: number }): boolean {
    const dmg = L.damage * this.might;
    const px = this.px, py = this.py;
    switch (id) {
      case 'bite': {
        const t = this.nearest(px, py, L.area * 1.7);
        const a = t ? Math.atan2(t.y - py, t.x - px) : Math.atan2(this.faceY, this.faceX);
        for (let i = 0; i < L.count; i++) this.slash(a + (i * Math.PI * 2) / L.count, L.area, dmg);
        return true;
      }
      case 'spit': {
        const skip = new Set<number>();
        let shot = 0;
        for (let i = 0; i < L.count; i++) {
          const t = this.nearest(px, py, 700, skip) ?? this.nearest(px, py, 700);
          if (!t) break;
          skip.add(t.id);
          const a = Math.atan2(t.y - py, t.x - px) + (shot > 0 && skip.size === 1 ? (shot - 0.5) * 0.25 : 0);
          this.projs.push({
            kind: 'spit', x: px, y: py, vx: Math.cos(a) * 600, vy: Math.sin(a) * 600, r: L.area,
            damage: dmg, pierce: L.pierce ?? 1, life: 1.3, age: 0, range: 0, back: false, hits: new Map(),
          });
          shot++;
        }
        return shot > 0;
      }
      case 'boomerang': {
        const t = this.nearest(px, py, 600);
        const base = t ? Math.atan2(t.y - py, t.x - px) : Math.atan2(this.faceY, this.faceX);
        for (let i = 0; i < L.count; i++) {
          const a = base + (i - (L.count - 1) / 2) * 0.5;
          this.projs.push({
            kind: 'bone', x: px, y: py, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, r: 22,
            damage: dmg, pierce: 999, life: 3, age: 0, range: L.area, back: false, hits: new Map(),
          });
        }
        return true;
      }
      case 'stomp': {
        this.waves.push({ kind: 'stomp', x: px, y: py, r: L.area, age: 0, life: 0.45 });
        this.near(px, py, L.area, (e) => {
          const dx = e.x - px, dy = e.y - py;
          const d = Math.hypot(dx, dy) || 1;
          if (d < L.area + e.r) this.hitEnemy(e, dmg, dx / d, dy / d, KNOCK.stomp);
        });
        return true;
      }
      case 'roar': {
        this.waves.push({ kind: 'roar', x: px, y: py, r: L.area, age: 0, life: 0.5 });
        this.near(px, py, L.area, (e) => {
          const dx = e.x - px, dy = e.y - py;
          const d = Math.hypot(dx, dy) || 1;
          if (d < L.area + e.r) {
            if (e.def.kind !== 'boss') e.stun = Math.max(e.stun, ROAR_STUN);
            this.hitEnemy(e, dmg, dx / d, dy / d, KNOCK.roar);
          }
        });
        return true;
      }
      case 'meteor': {
        const inView = this.enemies.filter((e) => !e.dead && Math.abs(e.x - px) < this.viewHalf.w && Math.abs(e.y - py) < this.viewHalf.h);
        if (!inView.length) return false;
        for (let i = 0; i < L.count; i++) {
          const t = inView[Math.floor(this.rng() * inView.length)];
          this.meteors.push({ x: t.x, y: t.y, r: L.area, t: METEOR_DELAY, damage: dmg });
        }
        return true;
      }
      default:
        return false;
    }
  }

  private slash(angle: number, reach: number, dmg: number): void {
    this.slashes.push({ x: this.px, y: this.py, angle, r: reach, age: 0, life: 0.22 });
    const half = (Math.PI * 2) / 3 / 2; // 120 degree bite
    this.near(this.px, this.py, reach, (e) => {
      const dx = e.x - this.px, dy = e.y - this.py;
      const d = Math.hypot(dx, dy) || 1;
      if (d > reach + e.r) return;
      let da = Math.atan2(dy, dx) - angle;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) <= half + Math.atan2(e.r, d)) this.hitEnemy(e, dmg, dx / d, dy / d, KNOCK.bite);
    });
  }

  private orbit(dt: number): void {
    const L = this.wl('orbit');
    this.orbitAngle += dt * 3.3;
    const dmg = L.damage * this.might;
    for (let i = 0; i < L.count; i++) {
      const a = this.orbitAngle + (i / L.count) * Math.PI * 2;
      const ox = this.px + Math.cos(a) * L.area, oy = this.py + Math.sin(a) * L.area;
      this.near(ox, oy, 20, (e) => {
        if (e.orbitCd > 0) return;
        const dx = e.x - ox, dy = e.y - oy;
        if (dx * dx + dy * dy < (e.r + 20) ** 2) {
          e.orbitCd = L.cooldown * this.cooldownMult;
          const d = Math.hypot(e.x - this.px, e.y - this.py) || 1;
          this.hitEnemy(e, dmg, (e.x - this.px) / d, (e.y - this.py) / d, KNOCK.orbit, true, 'orbit');
        }
      });
    }
  }

  /** Orb positions for the view. */
  orbitPositions(): { x: number; y: number }[] {
    const lv = this.weapons.get('orbit');
    if (!lv) return [];
    void lv;
    const L = this.wl('orbit');
    const out = [];
    for (let i = 0; i < L.count; i++) {
      const a = this.orbitAngle + (i / L.count) * Math.PI * 2;
      out.push({ x: this.px + Math.cos(a) * L.area, y: this.py + Math.sin(a) * L.area });
    }
    return out;
  }

  private thornTrail(dt: number): void {
    const L = this.wl('thorns');
    const cd = (this.cds.get('thorns') ?? 0) - dt;
    const moved = Math.hypot(this.px - this.lastThornX, this.py - this.lastThornY);
    if (cd <= 0 && moved > L.area * 0.9) {
      this.thorns.push({ x: this.px, y: this.py, r: L.area, life: THORN_LIFE, tick: 0 });
      this.lastThornX = this.px; this.lastThornY = this.py;
      this.cds.set('thorns', L.cooldown * this.cooldownMult);
    } else this.cds.set('thorns', cd);
  }

  // ---------------------------------------------------------------- projectiles & effects
  private updateProjs(dt: number): void {
    const pr = this.playerRadius;
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      p.age += dt;
      p.life -= dt;
      if (p.kind === 'bone') {
        const dx = this.px - p.x, dy = this.py - p.y;
        const d = Math.hypot(dx, dy) || 1;
        if (!p.back && Math.hypot(p.x - this.px, p.y - this.py) >= p.range) p.back = true;
        if (p.back) {
          const sp = Math.min(900, 300 + p.age * 500);
          p.vx = (dx / d) * sp; p.vy = (dy / d) * sp;
          if (d < pr + 10) p.life = 0;
        }
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.kind === 'enemy') {
        if (Math.hypot(p.x - this.px, p.y - this.py) < pr + p.r) {
          this.hurtPlayer(p.damage, 'spore');
          p.life = 0;
        }
      } else {
        this.near(p.x, p.y, p.r, (e) => {
          if (p.life <= 0) return;
          const until = p.hits.get(e.id);
          if (until !== undefined && until > p.age) return;
          if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > (e.r + p.r) ** 2) return;
          const sp = Math.hypot(p.vx, p.vy) || 1;
          this.hitEnemy(e, p.damage, p.vx / sp, p.vy / sp, p.kind === 'spit' ? KNOCK.spit : KNOCK.boomerang);
          if (p.kind === 'spit') this.events.push({ t: 'splash', x: e.x, y: e.y });
          p.hits.set(e.id, p.kind === 'bone' ? p.age + 0.45 : Infinity);
          if (p.kind === 'spit' && p.pierce-- <= 0) p.life = 0;
        });
      }
      if (p.life <= 0) { this.projs[i] = this.projs[this.projs.length - 1]; this.projs.pop(); }
    }
  }

  private updateEffects(dt: number): void {
    for (const list of [this.slashes, this.waves] as { age: number; life: number }[][]) {
      for (let i = list.length - 1; i >= 0; i--) {
        list[i].age += dt;
        if (list[i].age >= list[i].life) { list[i] = list[list.length - 1]; list.pop(); }
      }
    }
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.t -= dt;
      if (m.t > 0) continue;
      this.events.push({ t: 'meteor', x: m.x, y: m.y, r: m.r });
      this.near(m.x, m.y, m.r, (e) => {
        const dx = e.x - m.x, dy = e.y - m.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < m.r + e.r) this.hitEnemy(e, m.damage, dx / d, dy / d, KNOCK.meteor);
      });
      this.meteors[i] = this.meteors[this.meteors.length - 1];
      this.meteors.pop();
    }
    const thornDmg = this.weapons.has('thorns') ? this.wl('thorns').damage * this.might : 0;
    for (let i = this.thorns.length - 1; i >= 0; i--) {
      const t = this.thorns[i];
      t.life -= dt;
      t.tick -= dt;
      if (t.tick <= 0) {
        t.tick = THORN_TICK;
        this.near(t.x, t.y, t.r, (e) => {
          if ((e.x - t.x) ** 2 + (e.y - t.y) ** 2 < (e.r + t.r) ** 2) this.hitEnemy(e, thornDmg, 0, 0, 0, false);
        });
      }
      if (t.life <= 0) { this.thorns[i] = this.thorns[this.thorns.length - 1]; this.thorns.pop(); }
    }
  }

  // ---------------------------------------------------------------- pickups
  private updatePickups(dt: number): void {
    const pr = this.pickupRadius;
    const cr = this.T.collectRadius + this.playerRadius * 0.5;
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      const dx = this.px - g.x, dy = this.py - g.y;
      const d = Math.hypot(dx, dy) || 1;
      if (!g.flying && d < pr) g.flying = true;
      if (g.flying) {
        g.v = Math.min(1100, g.v + 1600 * dt);
        g.x += (dx / d) * g.v * dt;
        g.y += (dy / d) * g.v * dt;
      }
      if (d < cr) {
        this.gainXp(g.value);
        this.gems[i] = this.gems[this.gems.length - 1];
        this.gems.pop();
      }
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.age += dt;
      const dx = this.px - p.x, dy = this.py - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (!p.flying && d < pr * 0.8) p.flying = true;
      if (p.flying) {
        p.v = Math.min(900, p.v + 1400 * dt);
        p.x += (dx / d) * p.v * dt;
        p.y += (dy / d) * p.v * dt;
      }
      if (d < cr) {
        this.collect(p);
        this.pickups[i] = this.pickups[this.pickups.length - 1];
        this.pickups.pop();
      }
    }
  }

  private collect(p: Pickup): void {
    switch (p.kind) {
      case 'meat': {
        const n = Math.min(p.value, this.maxHp - this.hp);
        this.hp += n;
        this.events.push({ t: 'heal', n: Math.round(n) });
        break;
      }
      case 'coin':
        this.coins += p.value;
        this.events.push({ t: 'coin', x: p.x, y: p.y, n: p.value });
        break;
      case 'magnet':
        for (const g of this.gems) g.flying = true;
        this.events.push({ t: 'magnet' });
        break;
      case 'chest': {
        const evo = this.evolvable();
        if (evo.length) {
          const w = evo[0];
          this.evolved.add(w);
          this.coins += 10;
          this.events.push({ t: 'weaponEvolve', w, name: EVOLUTIONS[w].name });
          break;
        }
        const ups = this.candidates().filter((c) => c.id !== 'heal' && c.id !== 'gold' && c.level > 1);
        const pool = ups.length ? ups : this.candidates();
        const offer = pool[Math.floor(this.rng() * pool.length)];
        this.apply(offer);
        const coins = 10;
        this.coins += coins;
        this.events.push({ t: 'chest', offer, coins });
        break;
      }
    }
  }

  private gainXp(v: number): void {
    this.xp += v;
    this.events.push({ t: 'gem', value: v });
    while (this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed;
      this.level++;
      this.pendingLevels++;
      this.events.push({ t: 'level', level: this.level });
      const evo = this.T.evolveAt.indexOf(this.level);
      if (evo >= 0 && this.form < evo + 1) {
        this.form = evo + 1;
        this.maxHp += this.T.evolveHp;
        this.hp = this.maxHp;
        this.hold = 1.3;
        this.events.push({ t: 'evolve', form: this.form });
      }
    }
    if (this.pendingLevels > 0 && !this.offers) this.offers = this.rollOffers();
  }

  // ---------------------------------------------------------------- level-up offers
  /** Every offer that could be taken right now. */
  candidates(): Offer[] {
    const out: Offer[] = [];
    for (const id of WEAPON_IDS) {
      if (this.banished.has(id)) continue;
      const lv = this.weapons.get(id);
      if (lv !== undefined) { if (lv < MAX_LEVEL) out.push({ id, level: lv + 1 }); }
      else if (this.weapons.size < MAX_WEAPONS) out.push({ id, level: 1 });
    }
    for (const id of PASSIVE_IDS) {
      if (this.banished.has(id)) continue;
      const lv = this.passive(id);
      if (lv < MAX_LEVEL) out.push({ id, level: lv + 1 });
    }
    if (!out.length) out.push({ id: 'heal', level: 0 }, { id: 'gold', level: 0 });
    return out;
  }

  rollOffers(): Offer[] {
    const pool = this.candidates();
    if (pool.length <= 3) return pool;
    const weight = (o: Offer): number => {
      if (o.id === 'heal' || o.id === 'gold') return 1;
      if (isWeapon(o.id)) {
        if (o.level === 1) return this.picks < 4 ? 4 : 2.2; // early runs: show new toys
        return 3.2;
      }
      return o.level === 1 ? 2.2 : 2.6;
    };
    const picked: Offer[] = [];
    // The first pick always offers at least two new weapons: variety is the hook.
    if (this.picks === 0) {
      const fresh = pool.filter((o) => isWeapon(o.id as SkillId) && o.level === 1);
      while (picked.length < 2 && fresh.length) picked.push(fresh.splice(Math.floor(this.rng() * fresh.length), 1)[0]);
    }
    const rest = pool.filter((o) => !picked.includes(o));
    while (picked.length < 3 && rest.length) {
      let total = 0;
      for (const o of rest) total += weight(o);
      let r = this.rng() * total;
      let idx = 0;
      for (; idx < rest.length - 1; idx++) { r -= weight(rest[idx]); if (r <= 0) break; }
      picked.push(rest.splice(idx, 1)[0]);
    }
    return picked;
  }

  private apply(o: Offer): void {
    if (o.id === 'heal') { this.hp = Math.min(this.maxHp, this.hp + 40); this.events.push({ t: 'heal', n: 40 }); return; }
    if (o.id === 'gold') { this.coins += 20; return; }
    if (isWeapon(o.id)) {
      const had = this.weapons.has(o.id);
      this.weapons.set(o.id, Math.min(MAX_LEVEL, (this.weapons.get(o.id) ?? 0) + 1));
      if (!had) this.cds.set(o.id, 0.2);
    } else {
      const id = o.id as PassiveId;
      this.passives.set(id, Math.min(MAX_LEVEL, this.passive(id) + 1));
      if (id === 'vitality') { this.maxHp += PASSIVE_STEP.vitality; this.hp += PASSIVE_STEP.vitality; }
    }
  }

  // ---------------------------------------------------------------- contact & cleanup
  private contact(_dt: number): void {
    if (this.invuln > 0) return;
    const pr = this.playerRadius;
    let worst = 0;
    let touching = 0;
    let by: EnemyKind | null = null;
    this.near(this.px, this.py, pr, (e) => {
      if (e.stun > 0) return;
      if ((e.x - this.px) ** 2 + (e.y - this.py) ** 2 < (e.r * 0.85 + pr) ** 2) { touching++; if (e.damage > worst) { worst = e.damage; by = e.def.kind; } }
    });
    if (worst > 0) this.hurtPlayer(worst * Math.min(2, 1 + this.T.crowdDamage * (touching - 1)), by);
  }

  private hurtPlayer(raw: number, by: EnemyKind | 'spore' | null): void {
    if (this.invuln > 0 || this.status !== 'play') return;
    this.lastHitBy = by;
    const dmg = Math.max(1, Math.round(raw - this.armor));
    this.hp -= dmg;
    this.damageTaken += dmg;
    this.invuln = this.T.invuln;
    this.events.push({ t: 'hurt', dmg });
    if (this.hp <= 0) {
      this.hp = 0;
      this.status = 'dead';
      this.events.push({ t: 'dead' });
    }
  }

  private cull(): void {
    const far = this.T.despawnDist;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.dead) { this.enemies[i] = this.enemies[this.enemies.length - 1]; this.enemies.pop(); continue; }
      if (e.def.kind !== 'boss' && Math.abs(e.x - this.px) + Math.abs(e.y - this.py) > far * 1.3) {
        // Left behind: bring it back in front instead of deleting (keeps pressure).
        const a = this.spawnAngle();
        e.x = this.px + Math.cos(a) * this.T.spawnDist;
        e.y = this.py + Math.sin(a) * this.T.spawnDist;
      }
    }
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      if (Math.abs(g.x - this.px) + Math.abs(g.y - this.py) > far * 2.2) { this.farXp += g.value; this.gems[i] = this.gems[this.gems.length - 1]; this.gems.pop(); }
    }
  }
}
