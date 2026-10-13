/** Persistent progress between runs. Every storage access is guarded (storage.ts). */
import { loadJSON, saveJSON } from '../engine/storage';
import { CAMP_IDS, type CampId, SPECIES, type SpeciesId, campCost, CAMP_MAX, ZONES } from './config';

import { freshMissions, loadMissions, type Mission } from './missions';

export interface Meta {
  missions: Mission[];
  coins: number;
  camp: Record<CampId, number>;
  /** Highest zone index cleared (-1 = none). */
  cleared: number;
  species: SpeciesId;
  zone: number;
  sound: boolean;
  music: boolean;
  runs: number;
  best: number[];          // best survival seconds per zone
}

const KEY = 'dss-save';
const VERSION = 1;

export function freshMeta(): Meta {
  const camp = {} as Record<CampId, number>;
  for (const id of CAMP_IDS) camp[id] = 0;
  return { missions: freshMissions(), coins: 0, camp, cleared: -1, species: 'raptor', zone: 0, sound: true, music: true, runs: 0, best: ZONES.map(() => 0) };
}

export function loadMeta(): Meta {
  const m = loadJSON<Meta>(KEY, VERSION);
  const base = freshMeta();
  if (!m) return base;
  // Normalise: an older or damaged save never crashes the game.
  const out: Meta = { ...base, ...m, camp: { ...base.camp, ...(m.camp ?? {}) } };
  if (!Array.isArray(out.best) || out.best.length !== ZONES.length) out.best = base.best;
  if (!(out.species in SPECIES)) out.species = 'raptor';
  out.zone = Math.max(0, Math.min(out.zone | 0, ZONES.length - 1));
  out.missions = loadMissions(m.missions);
  return out;
}

export function saveMeta(m: Meta): void {
  saveJSON(KEY, VERSION, m);
}

export function speciesUnlocked(m: Meta, id: SpeciesId): boolean {
  return SPECIES[id].unlockZone <= m.cleared;
}

export function zoneUnlocked(m: Meta, z: number): boolean {
  return z <= m.cleared + 1;
}

export function buyCamp(m: Meta, id: CampId): boolean {
  const lv = m.camp[id];
  if (lv >= CAMP_MAX) return false;
  const cost = campCost(id, lv);
  if (m.coins < cost) return false;
  m.coins -= cost;
  m.camp[id] = lv + 1;
  return true;
}
