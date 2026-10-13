/**
 * Every number of the game. The model reads only from here, so tests and the
 * balance simulator can swap values (`TUNING`) without touching rules.
 */

export const STEP = 1 / 60;

export const TUNING = {
  runLength: 600,            // seconds; surviving this long clears the zone
  bossAt: [180, 360, 540],
  playerRadius: 24,
  playerSpeed: 235,
  playerHp: 100,
  invuln: 0.5,               // seconds of mercy after a hit
  pickupRadius: 160,         // gems inside this fly to the player
  collectRadius: 30,
  critChance: 0.08,
  critMult: 2,
  spawnDist: 980,            // just outside the camera on every layout
  despawnDist: 1500,         // stragglers this far away are moved back in front
  maxEnemies: 320,
  evolveAt: [11, 20],
  evolveHp: 25,              // + max HP per evolution (and a full heal)
  evolveMight: 0.12,
  levelUpHeal: 0,
  meatDrop: 0.012,
  coinDrop: 0.02,
  magnetDrop: 0.0025,
  meatHeal: 30,
  /** Global multipliers the director applies over time (see `director`). */
  hpGrowth: 0.009,           // enemy HP x (1 + t * hpGrowth)
  rateBase: 2.4,             // spawns per second at t = 0
  rateGrowth: 0.016,         // + per second of run time
  rateMax: 8,
  earlySpawnDist: 820,       // the first minute spawns closer: action within ~5 s
  earlyUntil: 60,
  openingRing: 12,           // grubs placed around the player when the run starts
  crowdCap: 200,             // above this many alive: half spawn rate, more elites instead
  eliteCrowd: 0.25,
  eliteFrom: 240,            // after this, a few elites appear anyway
  eliteChance: 0.06,
  crowdDamage: 0.3,          // + per extra enemy touching the player (capped x2)
  bossCoins: 25,             // run bonus per boss defeated
};
export type Tuning = typeof TUNING;

/** XP needed to go from level `l` to `l + 1`. */
export function xpToNext(l: number): number {
  return Math.round(2 + (l - 1) * 2.5 + Math.pow(l - 1, 1.7) * 0.6);
}

// ------------------------------------------------------------------ enemies
export type EnemyKind = 'grub' | 'bat' | 'beetle' | 'wolf' | 'shroom' | 'brute' | 'boss';

export interface EnemyDef {
  kind: EnemyKind;
  hp: number;
  speed: number;
  radius: number;
  damage: number;      // per contact hit
  xp: number;          // gem value dropped
  mass: number;        // knockback resistance (1 = normal)
  /** Optional behaviour flags. */
  flutter?: boolean;   // sine wobble across the chase line
  dash?: boolean;      // pauses, then lunges
  ranged?: boolean;    // keeps distance and spits
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  grub:   { kind: 'grub',   hp: 9,    speed: 72,  radius: 18, damage: 5,  xp: 1,  mass: 1 },
  bat:    { kind: 'bat',    hp: 6,    speed: 128, radius: 15, damage: 4,  xp: 1,  mass: 0.7, flutter: true },
  beetle: { kind: 'beetle', hp: 46,   speed: 58,  radius: 25, damage: 12, xp: 3,  mass: 2.5 },
  wolf:   { kind: 'wolf',   hp: 24,   speed: 96,  radius: 26, damage: 10, xp: 2,  mass: 1.2, dash: true },
  shroom: { kind: 'shroom', hp: 20,   speed: 60,  radius: 19, damage: 8,  xp: 2,  mass: 1.2, ranged: true },
  brute:  { kind: 'brute',  hp: 260,  speed: 70,  radius: 38, damage: 18, xp: 12, mass: 6 },
  boss:   { kind: 'boss',   hp: 3600, speed: 82,  radius: 62, damage: 26, xp: 60, mass: 40 },
};

/**
 * Spawn mix by run time: from `t` seconds on, each kind is picked with its
 * weight. The last row whose `t` has passed is used.
 */
export const SPAWN_MIX: { t: number; mix: Partial<Record<EnemyKind, number>> }[] = [
  { t: 0,   mix: { grub: 1 } },
  { t: 40,  mix: { grub: 3, bat: 2 } },
  { t: 100, mix: { grub: 3, bat: 2, wolf: 1 } },
  { t: 170, mix: { grub: 2, bat: 2, wolf: 2, beetle: 1 } },
  { t: 260, mix: { grub: 2, bat: 2, wolf: 2, beetle: 2, shroom: 1 } },
  { t: 380, mix: { grub: 1, bat: 3, wolf: 3, beetle: 2, shroom: 2 } },
  { t: 480, mix: { bat: 3, wolf: 3, beetle: 3, shroom: 2 } },
];

/** Scripted moments that break the steady stream (seconds). */
export const EVENTS: { t: number; kind: 'ring' | 'stream' | 'brute'; enemy: EnemyKind; count: number }[] = [
  { t: 75,  kind: 'ring',   enemy: 'grub',   count: 26 },
  { t: 150, kind: 'stream', enemy: 'bat',    count: 24 },
  { t: 165, kind: 'brute',  enemy: 'brute',  count: 1 },
  { t: 240, kind: 'brute',  enemy: 'brute',  count: 1 },
  { t: 270, kind: 'ring',   enemy: 'grub',   count: 40 },
  { t: 320, kind: 'brute',  enemy: 'brute',  count: 2 },
  { t: 420, kind: 'stream', enemy: 'wolf',   count: 30 },
  { t: 450, kind: 'brute',  enemy: 'brute',  count: 2 },
  { t: 500, kind: 'ring',   enemy: 'beetle', count: 30 },
  { t: 570, kind: 'brute',  enemy: 'brute',  count: 3 },
];

// ------------------------------------------------------------------ skills
export type WeaponId = 'bite' | 'spit' | 'boomerang' | 'orbit' | 'stomp' | 'meteor' | 'thorns' | 'roar';
export type PassiveId = 'vitality' | 'swift' | 'might' | 'haste' | 'magnet' | 'regen';
export type SkillId = WeaponId | PassiveId;

export interface WeaponLevel {
  damage: number;
  cooldown: number;
  /** Projectiles / orbs / meteors. */
  count: number;
  /** Radius or reach in world units. */
  area: number;
  pierce?: number;
}

export interface SkillDef {
  id: SkillId;
  name: string;
  /** One line per level (index 0 = when first taken). */
  text: string[];
  color: string;
}

export const MAX_LEVEL = 5;
export const MAX_WEAPONS = 6;

export const WEAPONS: Record<WeaponId, WeaponLevel[]> = {
  // Tuned 2026-10-13 from the balance analyst's measured diff (.balance-lab/).
  bite:      [{ damage: 14, cooldown: 1.05, count: 1, area: 115 },
              { damage: 18, cooldown: 1.0, count: 1, area: 125 },
              { damage: 20, cooldown: 0.95, count: 2, area: 130 },
              { damage: 26, cooldown: 0.9, count: 2, area: 140 },
              { damage: 33, cooldown: 0.8, count: 2, area: 160 }],
  spit:      [{ damage: 10, cooldown: 1.0, count: 1, area: 10, pierce: 1 },
              { damage: 11, cooldown: 0.95, count: 1, area: 10, pierce: 1 },
              { damage: 13, cooldown: 0.9, count: 2, area: 11, pierce: 1 },
              { damage: 14, cooldown: 0.85, count: 2, area: 12, pierce: 2 },
              { damage: 16, cooldown: 0.8, count: 3, area: 13, pierce: 2 }],
  boomerang: [{ damage: 14, cooldown: 1.8, count: 1, area: 360 },
              { damage: 17, cooldown: 1.7, count: 1, area: 380 },
              { damage: 17, cooldown: 1.6, count: 2, area: 400 },
              { damage: 22, cooldown: 1.5, count: 2, area: 420 },
              { damage: 26, cooldown: 1.4, count: 3, area: 450 }],
  orbit:     [{ damage: 11, cooldown: 0.5, count: 2, area: 92 },
              { damage: 13, cooldown: 0.5, count: 3, area: 96 },
              { damage: 15, cooldown: 0.45, count: 3, area: 104 },
              { damage: 19, cooldown: 0.45, count: 4, area: 110 },
              { damage: 24, cooldown: 0.4, count: 5, area: 120 }],
  stomp:     [{ damage: 17, cooldown: 2.6, count: 1, area: 150 },
              { damage: 21, cooldown: 2.4, count: 1, area: 165 },
              { damage: 27, cooldown: 2.2, count: 1, area: 180 },
              { damage: 32, cooldown: 2.0, count: 1, area: 195 },
              { damage: 42, cooldown: 1.8, count: 1, area: 220 }],
  meteor:    [{ damage: 30, cooldown: 2.0, count: 2, area: 80 },
              { damage: 36, cooldown: 1.9, count: 2, area: 84 },
              { damage: 42, cooldown: 1.8, count: 3, area: 88 },
              { damage: 50, cooldown: 1.7, count: 3, area: 92 },
              { damage: 60, cooldown: 1.6, count: 4, area: 100 }],
  thorns:    [{ damage: 7, cooldown: 0.34, count: 1, area: 34 },
              { damage: 9, cooldown: 0.32, count: 1, area: 37 },
              { damage: 11, cooldown: 0.3, count: 1, area: 40 },
              { damage: 14, cooldown: 0.28, count: 1, area: 44 },
              { damage: 18, cooldown: 0.25, count: 1, area: 50 }],
  roar:      [{ damage: 12, cooldown: 3.8, count: 1, area: 200 },
              { damage: 15, cooldown: 3.6, count: 1, area: 220 },
              { damage: 19, cooldown: 3.3, count: 1, area: 240 },
              { damage: 24, cooldown: 3.0, count: 1, area: 260 },
              { damage: 30, cooldown: 2.6, count: 1, area: 290 }],
};

/** How long a thorn patch lasts and how often it bites. */
export const THORN_LIFE = 2.6;
export const THORN_TICK = 0.4;
export const ROAR_STUN = 0.4;
export const METEOR_DELAY = 0.65;

export const PASSIVE_STEP: Record<PassiveId, number> = {
  vitality: 20,   // + max HP
  swift: 0.1,     // + move speed
  might: 0.12,    // + damage
  haste: 0.07,    // - cooldown
  magnet: 0.2,    // + pickup radius
  regen: 0.3,     // HP per second
};

export const SKILLS: Record<SkillId, SkillDef> = {
  bite:      { id: 'bite', name: 'Pitchfork Jab', color: '#c98a4a',
               text: ['Jab the space in front of you.', 'More damage, longer reach.', 'Also jabs behind you.', 'Big damage boost.', 'Fast, wide jabs.'] },
  spit:      { id: 'spit', name: 'Fire Flask', color: '#d8642e',
               text: ['Throw a burning flask at the nearest enemy.', '+1 flask.', 'Flames pierce further.', '+1 flask.', '+1 flask, hotter fire.'] },
  boomerang: { id: 'boomerang', name: 'Sickle Toss', color: '#b8b2a4',
               text: ['A sickle spins out and comes back.', 'More damage, longer flight.', '+1 sickle.', 'More damage.', '+1 sickle, faster throws.'] },
  orbit:     { id: 'orbit', name: 'Spinning Pot Lids', color: '#9a948a',
               text: ['Two iron pot lids spin around you.', '+1 lid.', 'Wider, harder spin.', '+1 lid.', '+1 lid, maximum spin.'] },
  stomp:     { id: 'stomp', name: 'Mallet Slam', color: '#9a7a52',
               text: ['Slam the ground around you.', 'Bigger shockwave.', 'Stronger, more often.', 'Bigger shockwave.', 'Huge, rapid slams.'] },
  meteor:    { id: 'meteor', name: 'Rockfall', color: '#8a8478',
               text: ['A rock crashes down on a nearby enemy.', '+1 rock.', 'Bigger impacts.', '+1 rock.', '+1 rock, more damage.'] },
  thorns:    { id: 'thorns', name: 'Bramble Trail', color: '#7a8a4a',
               text: ['Leave brambles where you walk.', 'Thicker brambles.', 'Sharper thorns.', 'Thicker brambles.', 'A deadly bramble carpet.'] },
  roar:      { id: 'roar', name: 'War Horn', color: '#d8b26a',
               text: ['Blow the horn to push enemies back and stun them.', 'Wider blast.', 'Louder, more often.', 'Wider blast.', 'Earth-shaking blast.'] },
  vitality:  { id: 'vitality', name: 'Hearty Stew', color: '#e8504a', text: ['+20 max health.', '+20 max health.', '+20 max health.', '+20 max health.', '+20 max health.'] },
  swift:     { id: 'swift', name: 'Old Boots', color: '#6ec2ff', text: ['Move 8% faster.', 'Move 8% faster.', 'Move 8% faster.', 'Move 8% faster.', 'Move 8% faster.'] },
  might:     { id: 'might', name: 'Whetstone', color: '#ff8a6b', text: ['+12% damage.', '+12% damage.', '+12% damage.', '+12% damage.', '+12% damage.'] },
  haste:     { id: 'haste', name: 'Hourglass', color: '#c88aff', text: ['Skills recharge 7% faster.', 'Skills recharge 7% faster.', 'Skills recharge 7% faster.', 'Skills recharge 7% faster.', 'Skills recharge 7% faster.'] },
  magnet:    { id: 'magnet', name: 'Lodestone', color: '#ffb02e', text: ['Pick up amber from further away.', 'Even further.', 'Even further.', 'Even further.', 'Even further.'] },
  regen:     { id: 'regen', name: 'Healing Herbs', color: '#7bdc5a', text: ['Slowly heal over time.', 'Heal faster.', 'Heal faster.', 'Heal faster.', 'Heal faster.'] },
};

/**
 * Weapon evolutions: a weapon at max level + its partner passive (any level)
 * turns the next treasure chest into an evolution.
 */
export const EVOLUTIONS: Record<WeaponId, { passive: PassiveId; name: string }> = {
  bite:      { passive: 'might',    name: 'Iron Trident' },
  spit:      { passive: 'haste',    name: 'Dragon Flask' },
  boomerang: { passive: 'swift',    name: 'Reaper Storm' },
  orbit:     { passive: 'vitality', name: 'Iron Wall' },
  stomp:     { passive: 'regen',    name: 'Earthbreaker' },
  meteor:    { passive: 'magnet',   name: 'Landslide' },
  thorns:    { passive: 'regen',    name: 'Thornwood' },
  roar:      { passive: 'might',    name: 'Thunder Horn' },
};
export const EVOLVED = { damage: 1.6, count: 1, area: 1.2, cooldown: 0.85 };

export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
export const PASSIVE_IDS = Object.keys(PASSIVE_STEP) as PassiveId[];
export const isWeapon = (id: SkillId): id is WeaponId => id in WEAPONS;

// ------------------------------------------------------------------ species & camp
export type SpeciesId = 'raptor' | 'ankylo' | 'ptero';

export interface Species {
  id: SpeciesId;
  name: string;
  forms: [string, string, string];
  start: WeaponId;
  hp: number;
  speed: number;     // multiplier
  might: number;     // multiplier
  blurb: string;
  /** Zone index that must be cleared to unlock (-1 = from the start). */
  unlockZone: number;
}

export const SPECIES: Record<SpeciesId, Species> = {
  raptor: { id: 'raptor', name: 'Pip', forms: ['Pip', 'Pip the Bold', 'Pip the Fearless'], start: 'bite',
            hp: 100, speed: 1, might: 1, blurb: 'A stubborn farm boy with a pot for a helmet.', unlockZone: -1 },
  ankylo: { id: 'ankylo', name: 'Ankylo', forms: ['Ankylo', 'Spike Ankylo', 'Fortress'], start: 'stomp',
            hp: 140, speed: 0.9, might: 1.05, blurb: 'Tough and slow.', unlockZone: 99 },
  ptero:  { id: 'ptero', name: 'Ptero', forms: ['Ptero', 'Storm Ptero', 'Sky King'], start: 'spit',
            hp: 95, speed: 1.15, might: 1.15, blurb: 'Fast but fragile.', unlockZone: 99 },
};
export const SPECIES_IDS = Object.keys(SPECIES) as SpeciesId[];

export const ZONES = [
  { name: 'Mossy Hollow',   enemyHp: 1,   enemyDmg: 1,   coinMult: 1 },
  { name: 'Ember Marsh',   enemyHp: 1.5, enemyDmg: 1.25, coinMult: 1.5 },
  { name: 'Frostfang Hills',   enemyHp: 2.0, enemyDmg: 1.45, coinMult: 2 },
];

export type CampId = 'might' | 'vitality' | 'speed' | 'magnet' | 'greed' | 'armor';
export const CAMP: Record<CampId, { name: string; text: string; step: number; base: number }> = {
  might:    { name: 'Might',    text: '+8% damage',        step: 0.08, base: 20 },
  vitality: { name: 'Vitality', text: '+15 max health',    step: 15,   base: 20 },
  speed:    { name: 'Speed',    text: '+5% move speed',    step: 0.05, base: 30 },
  magnet:   { name: 'Magnet',   text: '+10% pickup range', step: 0.1,  base: 15 },
  greed:    { name: 'Greed',    text: '+10% coins',        step: 0.1,  base: 25 },
  armor:    { name: 'Armor',    text: '-1 damage taken',   step: 1,    base: 40 },
};
export const CAMP_IDS = Object.keys(CAMP) as CampId[];
export const CAMP_MAX = 5;
export function campCost(id: CampId, level: number): number {
  return Math.round(CAMP[id].base * Math.pow(level + 1, 1.35));
}
