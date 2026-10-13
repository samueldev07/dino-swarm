import { ZONES, type EnemyKind } from './config';
import type { GameEvent, Model } from './model';

const ENEMY_PLURAL: Partial<Record<EnemyKind, string>> = {
  grub: 'mushroom gnomes', bat: 'cave bats', wolf: 'boar riders', beetle: 'orc shieldbearers',
  shroom: 'torch goblins', brute: 'forest trolls', boss: 'ogre chiefs',
};

export interface Mission {
  id: number;
  kind: 'kill' | 'form' | 'survive' | 'boss' | 'level';
  target: number;
  progress: number;
  reward: number;
  enemy?: EnemyKind;
  zone?: number;
}
const templates: Omit<Mission, 'id' | 'progress'>[] = [
  { kind: 'kill', enemy: 'grub', target: 40, reward: 30 },
  { kind: 'level', target: 5, reward: 40 },
  { kind: 'survive', zone: 0, target: 120, reward: 40 },
  { kind: 'kill', enemy: 'bat', target: 35, reward: 40 },
  { kind: 'form', target: 1, reward: 50 },
  { kind: 'boss', target: 1, reward: 60 },
  { kind: 'kill', enemy: 'wolf', target: 30, reward: 50 },
  { kind: 'level', target: 12, reward: 60 },
  { kind: 'survive', zone: 1, target: 180, reward: 60 },
  { kind: 'form', target: 2, reward: 70 },
  { kind: 'boss', target: 2, reward: 80 },
  { kind: 'survive', zone: 2, target: 240, reward: 80 },
];
export const makeMission = (id: number): Mission => ({ ...templates[id % templates.length], id, progress: 0 });
export const freshMissions = (): Mission[] => [0, 1, 2].map(makeMission);

/** Validate persisted missions against the catalog, including corrupted saves. */
export function loadMissions(value: unknown): Mission[] {
  if (!Array.isArray(value) || value.length !== 3) return freshMissions();
  const missions = value.map((raw, i) => {
    if (!raw || !Number.isSafeInteger(raw.id) || raw.id < 0) return makeMission(i);
    const mission = makeMission(raw.id);
    mission.progress = Number.isFinite(raw.progress) ? Math.max(0, Math.min(mission.target, raw.progress)) : 0;
    return mission;
  });
  return new Set(missions.map(m => m.id)).size === 3 ? missions : freshMissions();
}

export function missionLabel(m: Mission): string {
  switch (m.kind) {
    case 'kill': return `Defeat ${m.target} ${ENEMY_PLURAL[m.enemy!] ?? m.enemy + 's'}`;
    case 'form': return `Reach evolution form ${m.target + 1}`;
    case 'survive': return `Survive ${m.target / 60} min in ${ZONES[m.zone!].name}`;
    case 'boss': return `Defeat boss #${m.target}`;
    case 'level': return `Reach level ${m.target}`;
  }
}

export function progressMissions(missions: Mission[], model: Model, event?: GameEvent, bossTier?: number): boolean {
  let changed = false;
  for (const m of missions) {
    const before = m.progress;
    if (m.kind === 'kill' && event?.t === 'kill' && event.kind === m.enemy) m.progress++;
    if (m.kind === 'form' && event?.t === 'evolve') m.progress = Math.max(m.progress, event.form);
    if (m.kind === 'level' && event?.t === 'level') m.progress = Math.max(m.progress, event.level);
    if (m.kind === 'boss' && event?.t === 'bossDead') {
      if (bossTier === m.target) m.progress = m.target;
    }
    if (m.kind === 'survive' && model.zone === m.zone) m.progress = Math.max(m.progress, Math.floor(model.time));
    m.progress = Math.min(m.target, m.progress);
    changed ||= before !== m.progress;
  }
  return changed;
}

/** Claim only at a result; replacements start counting in the next run. */
export function claimMissions(missions: Mission[]): Mission[] {
  const completed = missions.filter(m => m.progress >= m.target).map(m => ({ ...m }));
  let next = Math.max(...missions.map(m => m.id)) + 1;
  for (let i = 0; i < missions.length; i++) if (missions[i].progress >= missions[i].target) missions[i] = makeMission(next++);
  return completed;
}
