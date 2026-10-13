/**
 * View + controller. Holds no rules: everything that decides comes from
 * Model; this file moves the camera, reads input, draws, plays sound and
 * talks to the Poki SDK at the right moments.
 */
import type { Stage, View } from '../engine/canvas';
import type { Input } from '../engine/input';
import type { Audio } from '../engine/audio';
import type { Poki } from '../engine/poki';
import { Model, type GameEvent, type Offer, type Enemy } from './model';
import {
  SKILLS, SPECIES, SPECIES_IDS, ZONES, ENEMY_NAMES, CAMP, CAMP_IDS, CAMP_MAX, campCost, MAX_LEVEL, METEOR_DELAY,
  EVOLUTIONS, isWeapon,
  type SkillId, type CampId, type EnemyKind,
} from './config';
import { Sprites, type Sprite } from './sprites';
import { Hero } from './hero';
import { canFullscreen, isFullscreen, toggleFullscreen } from '../engine/fullscreen';
import { Clip } from './clips';
import { PropScatter } from './perf/props';
import { Fx } from './fx';
import { UI, type Rect, inside, fancyPanel, ribbon, outlinedText, fitSize, text, bar, nine, kitImage } from './ui';
import { INK, fontFor, rrect, inkEllipse } from './draw';
import { type Meta, loadMeta, saveMeta, speciesUnlocked, zoneUnlocked, buyCamp } from './meta';

import { progressMissions, claimMissions, missionLabel, type Mission } from './missions';

type Ctx = CanvasRenderingContext2D;
type Screen = 'menu' | 'run' | 'camp';

interface Dying { s: Sprite; x: number; y: number; scale: number; t: number; flip: number }
interface Banner { text: string; sub: string; t: number; color: string; len: number }

const GROUND: [string, string, string, string][] = [
  // base, blotch, tuft, pebble
  ['#7da05a', '#77995a', '#6a8c4c', '#b8a888'],
  ['#8a6a52', '#84644c', '#6a4e3c', '#4a3a34'],
  ['#b8cad4', '#b0c2cc', '#94a8b6', '#7a8a96'],
];
const CAMP_ICON: Record<CampId, SkillId | 'gold'> = {
  might: 'might', vitality: 'vitality', speed: 'swift', magnet: 'magnet', greed: 'gold', armor: 'stomp',
};


const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const ENEMY_HEIGHT: Record<EnemyKind, number> = { grub: 70, bat: 62, shroom: 92, beetle: 120, wolf: 160, brute: 215, boss: 320 };
const ENEMY_KINDS = Object.keys(ENEMY_HEIGHT) as EnemyKind[];
const byY = (a: Enemy, b: Enemy) => a.y - b.y;

export class Game {
  private ctx: Ctx;
  private v: View;
  private ui: UI;
  private fx = new Fx();
  private meta: Meta;
  private screen: Screen = 'menu';
  private m: Model | null = null;

  private cam = { x: 0, y: 0, z: 1 };
  private keys = new Set<string>();
  private joy = { on: false, bx: 0, by: 0, kx: 0, ky: 0 };
  private paused = false;
  private busy = false;            // an ad is running / a run is being prepared
  private time = 0;

  private dying: Dying[] = [];
  /** Painted one-shot impacts: pop in, overshoot, fade; never a static stamp. */
  private meteorClip = new Clip('anim/meteor/');
  private fxClips: Record<string, Clip> = { flask: new Clip('anim/flask/'), slam: new Clip('anim/slam/', 240) };
  /** Simple cartoon smoke puffs on kills: a few round inked balls that pop out and fade. */
  private puffs: { x: number; y: number; r: number; t: number; seed: number }[] = [];
  private jabClip = new Clip('anim/arc/', 230);
  private dogClip = new Clip('anim/dog/', 160);
  private jabSeen = new WeakSet<object>();
  private jabs: { x: number; y: number; a: number; w: number; t: number }[] = [];
  private shots: { clip: string; x: number; y: number; w: number; t: number; len: number }[] = [];
  private playFx(clip: string, x: number, y: number, w: number, frames: number): boolean {
    if (!this.fxClips[clip]?.ready) return false;
    if (this.shots.length > 40) this.shots.shift();
    this.shots.push({ clip, x, y, w, t: 0, len: frames / 24 });
    return true;
  }
  private blasts: { x: number; y: number; r: number; t: number }[] = [];
  private impacts: { key: string; x: number; y: number; size: number; t: number; life: number; rot: number; spin: number }[] = [];
  private addImpact(key: string, x: number, y: number, size: number, life = 0.35): void {
    if (this.impacts.length > 40) this.impacts.shift();
    this.impacts.push({ key, x, y, size, t: 0, life, rot: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 3 });
  }
  private banner: Banner | null = null;
  private bossesDown = 0;
  private trayRight = 0;
  private trayBottom = 0;
  private offersAt = 0;
  private hurtT = 0;
  private evolveT = 0;
  private lastKillSound = 0;
  private lagHp = 1;               // boss bar lag fill
  private bossLag = 1;
  private movedFor = 0;
  private result: 'summary' | null = null;
  private firstRun = false;
  private hintFade = 0;
  private amberT = 0;
  private taughtAmber = false;
  private banishing = false;
  private runCounted = false;
  private newBest = false;
  private missionResults: Mission[] = [];
  private completedIds = new Set<number>();
  private knownBosses = new Map<number, Enemy>();
  private toastUntil = 0;
  private missionsDirty = false;
  private missionSavedAt = 0;
  private banked = 0;
  private doubled = false;
  private ground: CanvasPattern[] = [];
  private props = new PropScatter();
  private propImage = (key: string) => this.sprites.image(key);
  private visibleEnemies: Enemy[] = [];
  private enemySprites = {} as Record<EnemyKind, Sprite>;
  /** Test hero art (caveman Grok, tier 1); the old dino draws until it has loaded. */
  private hero = new Hero('hero/grok-1/');
  /** Video-cut loops for painted enemies (test: grub crawl, raptor run). Missing ones draw the still sprite. */
  private clips: Partial<Record<EnemyKind, Clip>> = {
    grub: new Clip('anim/gnome/', 150), bat: new Clip('anim/bat/', 140), wolf: new Clip('anim/boarorc/', 220), beetle: new Clip('anim/orc/', 180),
    shroom: new Clip('anim/goblin/', 170), brute: new Clip('anim/troll/', 300), boss: new Clip('anim/ogre/', 400),
  };
  /** Per-zone enemy art, loaded only when that zone is first played (zone 0 above loads at boot). */
  private zoneClips: Partial<Record<EnemyKind, Clip>>[] = [this.clips];
  private clipsFor(zone: number): Partial<Record<EnemyKind, Clip>> {
    if (!this.zoneClips[zone]) {
      this.zoneClips[zone] = zone === 1 ? {
        grub: new Clip('anim/z2-froglet/', 150), bat: new Clip('anim/z2-moth/', 140), wolf: new Clip('anim/z2-toadrider/', 220),
        beetle: new Clip('anim/z2-frogman/', 180), shroom: new Clip('anim/z2-imp/', 170),
        boss: new Clip('anim/z2-orcboss/', 400),
      } : this.clips;
    }
    return this.zoneClips[zone];
  }

  constructor(
    stage: Stage, private input: Input, private audio: Audio, private sprites: Sprites, private poki: Poki,
  ) {
    this.ctx = stage.ctx;
    this.v = stage.view;
    this.ui = new UI(input);
    this.meta = loadMeta();
    this.audio.sound = this.meta.sound;
    this.audio.music = this.meta.music;
    for (let z = 0; z < ZONES.length; z++) this.ground.push(this.makeGround(z));

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (!e.repeat) this.onKey(k);
      this.keys.add(k);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.pause(); saveMeta(this.meta); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.pause(); saveMeta(this.meta); } });

    // First visit: straight into a run (best click-to-play on Poki).
    if (this.meta.runs === 0) this.newRun(false);
  }

  // ================================================================ flow
  private newRun(withAd: boolean): void {
    const go = () => {
      const meta = this.meta;
      this.m = new Model({ species: meta.species, zone: meta.zone, camp: meta.camp });
      this.screen = 'run';
      this.paused = false;
      this.result = null;
      this.banked = 0;
      this.runCounted = false;
      this.newBest = false;
      this.firstRun = meta.runs === 0;
      this.hintFade = 0; this.amberT = 0; this.taughtAmber = false;
      this.banishing = false; this.missionResults = []; this.completedIds.clear();
      this.knownBosses.clear();
      this.missionsDirty = false; this.toastUntil = 0;
      this.doubled = false;
      this.dying = [];
      this.banner = null; this.bossesDown = 0;
      this.movedFor = 0;
      this.joy.on = false;
      this.cam.x = 0; this.cam.y = 0;
      this.lagHp = 1;
      this.audio.setMood('calm');
    };
    if (withAd && this.poki.available) {
      this.busy = true;
      void this.poki.commercialBreak((on) => this.audio.setSuspended(on)).then(() => { this.busy = false; go(); });
    } else go();
  }

  private pause(): void {
    if (this.screen !== 'run' || !this.m || this.m.status !== 'play' || this.m.offers || this.paused) return;
    this.paused = true;
    this.poki.gameplayStop();
  }

  private resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.poki.gameplayStart();
  }

  private onKey(k: string): void {
    if (k === 'f' && canFullscreen()) { toggleFullscreen(); return; }
    if (this.busy || this.poki.adRunning) return;
    const m = this.m;
    if (this.screen === 'run' && m) {
      if ((k === 'escape' || k === 'p' || k === ' ') && m.status === 'play' && !m.offers) {
        if (this.paused) this.resume(); else this.pause();
      }
      if (!this.busy && !this.paused && m.offers && k === 'r' && this.time - this.offersAt > 0.35) this.rerollOffers();
      if (!this.busy && !this.paused && m.offers && this.time - this.offersAt > 0.35 && ['1', '2', '3'].includes(k)) this.pickOffer(+k - 1);
    }
    if (this.screen === 'menu' && (k === 'enter' || k === ' ')) this.newRun(true);
  }

  private pickOffer(i: number): void {
    const m = this.m;
    if (!m || !m.offers) return;
    if (this.banishing) {
      if (m.banish(i)) { this.banishing = false; this.offersAt = this.time; this.audio.play('tap'); }
      return;
    }
    const o = m.offers[i];
    if (m.choose(i)) {
      this.audio.play('claim');
      if (o) this.fx.ring(m.px, m.py, SKILLS[o.id as SkillId]?.color ?? '#f3d79a', 22, 70);
      if (m.offers) this.offersAt = this.time;
    }
  }

  private rerollOffers(): void {
    if (this.m?.reroll()) { this.banishing = false; this.offersAt = this.time; this.audio.play('tap'); }
  }

  private bankCoins(): void {
    const m = this.m;
    if (!m) return;
    const total = Math.max(1, m.coinsEarned);
    const extra = Math.max(0, total - this.banked);
    this.meta.coins += extra * (this.doubled ? 2 : 1);
    this.banked += extra;
    if (!this.runCounted) { this.meta.runs++; this.runCounted = true; }
    this.newBest ||= Math.floor(m.time) > this.meta.best[m.zone];
    this.meta.best[m.zone] = Math.max(this.meta.best[m.zone], Math.floor(m.time));
    if (m.status === 'won') this.meta.cleared = Math.max(this.meta.cleared, m.zone);
    // Replacements must wait until the next run, even if this run is revived.
    for (const mission of this.meta.missions) if (this.completedIds.has(mission.id)) mission.progress = 0;
    const oldIds = new Set(this.meta.missions.map(mission => mission.id));
    const completed = claimMissions(this.meta.missions);
    for (const mission of completed) {
      this.missionResults.push(mission);
      this.meta.coins += mission.reward;
    }
    for (const mission of this.meta.missions) if (!oldIds.has(mission.id)) this.completedIds.add(mission.id);
    saveMeta(this.meta);
  }

  // ================================================================ update
  update(dt: number): void {
    this.time += dt;
    this.ui.beginFrame();
    const m = this.m;
    if (this.screen !== 'run' || !m) { this.fx.update(dt); return; }

    // Camera a bit higher than the base fit (owner 13/10): wider view, small art flaws read less.
    this.cam.z = 0.88 * Math.max(0.7, Math.min(1.6, Math.sqrt((this.v.w * this.v.h) / (1200 * 700))));
    if (!Number.isFinite(this.cam.z)) this.cam.z = 1;  // zero-sized window (hidden tab, minimised)
    m.viewHalf = { w: this.v.w / 2 / this.cam.z, h: this.v.h / 2 / this.cam.z };
    // ---- input -> move vector
    let kx = 0, ky = 0;
    const K = this.keys;
    if (K.has('a') || K.has('arrowleft')) kx -= 1;
    if (K.has('d') || K.has('arrowright')) kx += 1;
    if (K.has('w') || K.has('arrowup')) ky -= 1;
    if (K.has('s') || K.has('arrowdown')) ky += 1;
    const p = this.input.p;
    if (this.joy.on) {
      if (!p.down) this.joy.on = false;
      else {
        const dx = p.x - this.joy.bx, dy = p.y - this.joy.by;
        const d = Math.hypot(dx, dy);
        const R = 70;
        // Follow the finger if it drags past the ring (no dead stop at the edge).
        if (d > R) { this.joy.bx += (dx / d) * (d - R); this.joy.by += (dy / d) * (d - R); }
        this.joy.kx = p.x; this.joy.ky = p.y;
        const n = Math.min(1, d / R);
        if (d > 6) { kx = (dx / d) * n; ky = (dy / d) * n; }
      }
    }
    const kl = Math.hypot(kx, ky);
    if (kl > 1) { kx /= kl; ky /= kl; }

    const blocked = this.paused || this.busy || this.poki.adRunning || this.result !== null;
    if (!blocked) {
      m.setMove(kx, ky);
      if (m.status === 'ready' && kl > 0.2) {
        m.start(); this.poki.gameplayStart();
        // say the goal once, up front: the run is long and bosses come in three waves
        this.showBanner('SURVIVE ' + fmtTime(m.T.runLength), 'Bosses at ' + m.T.bossAt.map(fmtTime).join(', '), '#f0c060', 3.2);
      }
      if (m.status === 'play' && !m.offers && kl > 0.2) this.movedFor += dt;
      const wasOffers = !!m.offers;
      for (const enemy of m.enemies) if (enemy.def.kind === 'boss') this.knownBosses.set(enemy.id, enemy);
      m.update(dt);
      for (const enemy of m.enemies) if (enemy.def.kind === 'boss') this.knownBosses.set(enemy.id, enemy);
      if (!wasOffers && m.offers) this.offersAt = this.time;
      for (const e of m.drain()) this.onEvent(e);
      this.missionsDirty = progressMissions(this.meta.missions.filter(mission => !this.completedIds.has(mission.id)), m) || this.missionsDirty;
      if (this.missionsDirty && this.time - this.missionSavedAt >= 1) {
        saveMeta(this.meta); this.missionSavedAt = this.time; this.missionsDirty = false;
      }
      if (!m.offers && m.status === 'play') {
        if (this.movedFor >= 2) this.hintFade += dt;
        this.amberT = Math.max(0, this.amberT - dt);
      }
    }

    // ---- camera
    const lead = 0.12;
    const tx = m.px + m.mx * 120 * lead * 4, ty = m.py + m.my * 120 * lead * 4;
    const k = 1 - Math.exp(-dt * 6);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;

    const fdt = m.hold > 0 ? dt * 0.35 : dt;
    this.fx.update(fdt);
    this.hero.update(fdt, Math.hypot(m.mx, m.my) > 0.1 && m.status === 'play');
    for (let i = this.blasts.length - 1; i >= 0; i--) {
      this.blasts[i].t += fdt;
      if (this.blasts[i].t >= 25 / 24) this.blasts.splice(i, 1);
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      this.puffs[i].t += fdt;
      if (this.puffs[i].t >= 0.38) this.puffs.splice(i, 1);
    }
    for (let i = this.jabs.length - 1; i >= 0; i--) {
      this.jabs[i].t += fdt;
      if (this.jabs[i].t >= 12 / 30) this.jabs.splice(i, 1);
    }
    for (let i = this.shots.length - 1; i >= 0; i--) {
      this.shots[i].t += fdt;
      if (this.shots[i].t >= this.shots[i].len) this.shots.splice(i, 1);
    }
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      this.impacts[i].t += fdt;
      if (this.impacts[i].t >= this.impacts[i].life) this.impacts.splice(i, 1);
    }
    for (let i = this.dying.length - 1; i >= 0; i--) {
      this.dying[i].t += dt;
      if (this.dying[i].t > 0.22) this.dying.splice(i, 1);
    }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.len) this.banner = null; }
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.evolveT > 0) this.evolveT -= dt;
    this.lagHp += (m.hp / m.maxHp - this.lagHp) * Math.min(1, dt * 3);
    if (m.boss) this.bossLag += (m.boss.hp / m.boss.maxHp - this.bossLag) * Math.min(1, dt * 2.5);
    else this.bossLag = 1;

    if (m.status === 'play' && !this.paused) {
      const mood = m.boss ? 'boss' : m.time > m.T.runLength - 60 ? 'final' : 'calm';
      this.audio.setMood(mood);
    }
    if ((m.status === 'dead' || m.status === 'won') && this.result === null) {
      this.poki.gameplayStop();
      this.joy.on = false;
      this.result = 'summary';
      this.bankCoins();
    }
  }

  private onEvent(e: GameEvent): void {
    const m = this.m!;
    const a = this.audio;
    const bossTier = e.t === 'bossDead' ? [...this.knownBosses.values()].find(boss => boss.dead && boss.x === e.x && boss.y === e.y)?.tier : undefined;
    this.missionsDirty = progressMissions(this.meta.missions.filter(mission => !this.completedIds.has(mission.id)), m, e, bossTier) || this.missionsDirty;
    switch (e.t) {
      case 'hit':
        if (e.crit || e.boss) this.fx.floater(e.x, e.y, String(e.dmg), e.crit ? '#f0c060' : '#fff', e.crit ? 30 : 22);
        if (e.crit) a.play('crit');
        else a.play('hit');
        if (e.boss) this.fx.burst(e.x, e.y + 20, '#fff2c0', 4, 160);
        break;
      case 'kill': {
        // every kill vanishes in a puff of black smoke (no squash); bigger monsters, bigger puff
        if (this.firstRun && !this.taughtAmber) {
          this.taughtAmber = true; this.amberT = 3;
          this.showBanner('Collect amber to LEVEL UP!', '', '#f0c060');
        }
        const s = this.sprites.enemy(e.kind, m.zone);
        this.dying.push({ s, x: e.x, y: e.y, scale: this.enemyScale(e.kind, s), t: 0, flip: 1 });
        this.fx.burst(e.x, e.y - 14, e.kind === 'boss' ? '#f0c060' : '#e8dcc0', e.kind === 'boss' ? 40 : 6, e.kind === 'boss' ? 420 : 170);
        if (this.time - this.lastKillSound > 0.06) { a.play('kill'); this.lastKillSound = this.time; }
        if (e.kind === 'brute') this.fx.shake(0.5, 0.25);
        break;
      }
      case 'hurt':
        this.hurtT = 0.3;
        this.fx.shake(0.6, 0.2);
        this.fx.floater(m.px, m.py - 60, `-${e.dmg}`, '#ff6a5a', 26);
        a.play('hurt');
        break;
      case 'gem': a.play('select'); break;
      case 'coin': a.play('buy'); this.fx.floater(e.x, e.y - 20, `+${e.n}`, '#f0c060', 22); break;
      case 'heal': a.play('lucky'); this.fx.floater(m.px, m.py - 70, `+${e.n}`, '#7bdc5a', 28); break;
      case 'magnet': a.play('ready'); this.showBanner('AMBER MAGNET!', 'All amber flies to you', '#f0c060'); break;
      case 'chest': {
        a.play('chest');
        this.fx.ring(m.px, m.py, '#f0c060', 30, 90);
        const o = e.offer;
        const name = o.id === 'heal' ? 'Healing' : o.id === 'gold' ? 'Gold' : SKILLS[o.id].name;
        this.showBanner('TREASURE!', o.level > 0 ? `${name} → LV ${o.level}` : name, '#f0c060');
        break;
      }
      case 'level': a.play('unlock'); this.fx.ring(m.px, m.py, '#f3d79a', 24, 80); break;
      case 'evolve': {
        a.play('super');
        this.evolveT = 1.3;
        this.fx.ring(m.px, m.py, '#fff2a0', 36, 120);
        this.fx.burst(m.px, m.py - 40, '#f0c060', 40, 380);
        this.fx.shake(0.8, 0.4);
        const sp = SPECIES[m.species];
        this.showBanner('EVOLVED!', sp.forms[e.form], '#f0c060');
        break;
      }
      case 'weaponEvolve':
        a.play('super'); this.fx.burst(m.px, m.py - 40, '#f0c060', 40, 380);
        this.fx.shake(0.8, 0.4); this.showBanner('EVOLVED!', e.name, '#f0c060'); break;
      case 'fire':
        if (e.w === 'stomp') { a.play('thud'); this.playFx('slam', m.px, m.py + 6, m.wl('stomp').area * 1.15, 21); }
        else if (e.w === 'roar') { a.play('combo'); this.playFx('horn', m.px, m.py - 40, m.wl('roar').area * 1.3, 25); }
        else if (e.w === 'bite') a.play('cast');
        break;
      case 'splash':
        if (!this.playFx('flask', e.x, e.y - 10, 80, 22)) this.addImpact('fx-fire', e.x, e.y - 20, 90, 0.32);
        this.fx.burst(e.x, e.y - 20, '#ffb04a', 5, 160);
        break;
      case 'meteor':
        if (this.meteorClip.ready) this.blasts.push({ x: e.x, y: e.y, r: e.r, t: 0 });
        else this.addImpact('fx-slam', e.x, e.y, e.r * 1.3, 0.3);
        a.play('thud');
        this.fx.shake(0.35, 0.18);
        this.fx.burst(e.x, e.y, '#ff9a3c', 14, 300);
        this.fx.burst(e.x, e.y, '#6a5a50', 8, 220);
        break;
      case 'boss': a.play('boss'); this.fx.shake(0.6, 0.6); this.showBanner('BOSS INCOMING!', 'Keep moving!', '#ff6a5a'); break;
      case 'bossDead': {
        a.play('win'); this.fx.shake(1, 0.6);
        // tell the player the run goes on, and what comes next
        const total = m.T.bossAt.length, done = Math.min(total, this.bossesDown = this.bossesDown + 1);
        const next = m.T.bossAt[done];
        if (done < total) this.showBanner(`BOSS ${done} OF ${total} DEFEATED!`, `Keep going: the next boss comes at ${fmtTime(next)}`, '#7bdc5a', 4);
        else this.showBanner('ALL BOSSES DEFEATED!', `Survive until ${fmtTime(m.T.runLength)} to clear the zone`, '#7bdc5a', 4);
        break;
      }
      case 'wave':
        if (e.kind === 'ring') this.showBanner('SURROUNDED!', 'Break out of the ring', '#ff9a3c');
        else if (e.kind === 'stream') this.showBanner('A SWARM IS COMING!', '', '#ff9a3c');
        else this.showBanner('A BRUTE APPEARS', 'It drops a treasure chest', '#f0c060');
        break;
      case 'win': a.play('win'); break;
      case 'dead': a.play('ko'); this.fx.shake(1, 0.5); break;
    }
  }

  private showBanner(t: string, sub: string, color: string, len = 2.4): void {
    this.banner = { text: t, sub, t: 0, color, len };
  }

  // ================================================================ draw
  draw(): void {
    const ctx = this.ctx;
    const v = this.v;
    ctx.fillStyle = GROUND[this.m?.zone ?? this.meta.zone][0];
    ctx.fillRect(0, 0, v.w, v.h);
    if (this.screen === 'run' && this.m) this.drawRun(ctx);
    else if (this.screen === 'menu') this.drawMenu(ctx);
    else this.drawCamp(ctx);
  }

  private drawRun(ctx: Ctx): void {
    const m = this.m!;
    const v = this.v;
    this.drawWorld(ctx, m);
    this.drawLight(ctx, m);

    // red vignette at low HP / on hits
    const low = m.hp / m.maxHp < 0.3 ? 0.35 + Math.sin(this.time * 6) * 0.12 : 0;
    const vig = Math.max(low, this.hurtT * 1.6);
    if (vig > 0) {
      if (!this.hurtLayer || this.hurtLayer.w !== v.w || this.hurtLayer.h !== v.h) {
        const c = document.createElement('canvas');
        c.width = Math.max(2, Math.round(v.w / 4)); c.height = Math.max(2, Math.round(v.h / 4));
        const x = c.getContext('2d')!;
        const gr = x.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.35, c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.7);
        gr.addColorStop(0, 'rgba(200,30,20,0)'); gr.addColorStop(1, 'rgba(200,30,20,1)');
        x.fillStyle = gr; x.fillRect(0, 0, c.width, c.height);
        this.hurtLayer = { w: v.w, h: v.h, c };
      }
      ctx.globalAlpha = Math.min(0.55, vig);
      ctx.drawImage(this.hurtLayer.c, 0, 0, v.w, v.h);
      ctx.globalAlpha = 1;
    }

    this.drawHud(ctx, m);
    this.drawEdgeArrows(ctx, m);
    if (m.status === 'ready' || (this.firstRun && this.hintFade < 0.4 && m.status === 'play' && !m.offers)) this.drawHint(ctx);
    if (this.banner && !m.offers && !this.result && !this.paused) this.drawBanner(ctx);
    if (this.evolveT > 0) this.drawEvolve(ctx, m);

    if (m.offers && this.result === null) this.drawOffers(ctx, m);
    else if (this.paused) this.drawPause(ctx);
    else if (this.result) this.drawResult(ctx, m);
    else if (this.busy) this.ui.scrim(ctx, v.w, v.h);

    if (this.time < this.toastUntil) outlinedText(ctx, 'No ad available right now', v.w / 2, v.safe.t + 300, fitSize(ctx, 'No ad available right now', 28, v.w - 60), '#f6ead0', INK, 'center');
    // Joystick starts on any press no button claimed.
    const p = this.input.p;
    if (p.justDown && !this.ui.claimed && !m.offers && !this.paused && !this.result && !this.busy && !this.poki.adRunning) {
      this.joy.on = true;
      this.joy.bx = this.joy.kx = p.x;
      this.joy.by = this.joy.ky = p.y;
    }
    if (this.joy.on) this.drawJoystick(ctx);
  }

  /**
   * Scene light (matches the key art): darker canopy at the edges, a warm pool
   * of light around the hero, so painted sprites sit IN the forest, not on it.
   */
  /**
   * Scene light baked ONCE per screen size into a small canvas (warm centre + dark canopy edge),
   * then stretched over the view with one plain drawImage. The old per-frame 'soft-light'
   * composite + full-screen gradients made the GPU re-shade every pixel twice a frame.
   */
  private heroPool: HTMLCanvasElement | null = null;
  private softShadow: HTMLCanvasElement | null = null;
  private hurtLayer: { w: number; h: number; c: HTMLCanvasElement } | null = null;
  private lightLayer: { w: number; h: number; c: HTMLCanvasElement } | null = null;
  private drawLight(ctx: Ctx, _m: Model): void {
    const v = this.v;
    if (!this.lightLayer || this.lightLayer.w !== v.w || this.lightLayer.h !== v.h) {
      const c = document.createElement('canvas');
      const k = 0.25;                                  // a soft gradient survives heavy upscaling
      c.width = Math.max(2, Math.round(v.w * k)); c.height = Math.max(2, Math.round(v.h * k));
      const x = c.getContext('2d')!;
      const W = c.width, H = c.height, R = Math.max(W, H);
      const warm = x.createRadialGradient(W / 2, H * 0.47, 0, W / 2, H * 0.47, R * 0.32);
      warm.addColorStop(0, 'rgba(255,215,150,0.10)');
      warm.addColorStop(1, 'rgba(255,215,150,0)');
      x.fillStyle = warm; x.fillRect(0, 0, W, H);
      const vig = x.createRadialGradient(W / 2, H / 2, R * 0.28, W / 2, H / 2, R * 0.72);
      vig.addColorStop(0, 'rgba(10,18,8,0)');
      vig.addColorStop(1, 'rgba(10,18,8,0.32)');
      x.fillStyle = vig; x.fillRect(0, 0, W, H);
      this.lightLayer = { w: v.w, h: v.h, c };
    }
    ctx.drawImage(this.lightLayer.c, 0, 0, v.w, v.h);
  }

  // ---------------------------------------------------------------- world
  private w2s(x: number, y: number): [number, number] {
    const v = this.v;
    return [(x - this.cam.x) * this.cam.z + v.w / 2, (y - this.cam.y) * this.cam.z + v.h / 2];
  }

  private enemyScale(kind: EnemyKind, s: Sprite): number {
    // Size ladder by on-screen HEIGHT (world units) against the hero (~130): small fry clearly
    // smaller than the hero, tanks about his size, troll and ogre loom over him. Painted art is
    // tall or wide depending on the creature, so height (not width) keeps the ladder honest.
    return ENEMY_HEIGHT[kind] / s.h;
  }

  private drawWorld(ctx: Ctx, m: Model): void {
    const v = this.v;
    const z = this.cam.z;
    ctx.save();
    ctx.translate(v.w / 2 + this.fx.shakeX, v.h / 2 + this.fx.shakeY);
    ctx.scale(z, z);
    ctx.translate(-this.cam.x, -this.cam.y);
    const hw = v.w / 2 / z + 80, hh = v.h / 2 / z + 120;
    const L = this.cam.x - hw, R = this.cam.x + hw, T = this.cam.y - hh, B = this.cam.y + hh;
    const vis = (x: number, y: number, pad = 0) => x > L - pad && x < R + pad && y > T - pad && y < B + pad;

    ctx.fillStyle = this.groundFor(m.zone);
    ctx.fillRect(L, T, R - L, B - T);

    this.drawProps(ctx, L, R, T, B);

    // thorn patches (ground layer)
    const thorn = this.sprites.thorn();
    const bramble = this.spikeSprite();
    for (const t of m.thorns) {
      if (!vis(t.x, t.y, 60)) continue;
      ctx.globalAlpha = Math.min(0.9, t.life * 1.5);
      if (bramble) {
        // One small bramble tuft per patch: grows in, shrinks out. Simple enough to read at a glance.
        // spikes burst UP out of the ground (grow from the base, overshoot), then sink back
        const age = 2.6 - t.life, up = age < 0.18 ? age / 0.18 : 1, pop = age < 0.18 ? 1 : age < 0.3 ? 1.12 - (age - 0.18) : 1;
        const sink = Math.min(1, t.life * 3);
        const w = t.r * 1.5, h = (w * bramble.height) / bramble.width * up * pop * sink;
        ctx.drawImage(bramble, t.x - w / 2, t.y - h + t.r * 0.25, w, h);
        continue;
      }
      const s = (t.r * 1.7) / thorn.w;
      ctx.drawImage(thorn.img, t.x - thorn.w * s / 2, t.y - thorn.h * s / 2, thorn.w * s, thorn.h * s);
    }
    ctx.globalAlpha = 1;

    // meteor + boss telegraphs on the ground
    for (const mt of m.meteors) {
      const k = 1 - mt.t / METEOR_DELAY;
      ctx.fillStyle = `rgba(255,80,40,${0.12 + k * 0.18})`;
      ctx.beginPath(); ctx.ellipse(mt.x, mt.y, mt.r * k, mt.r * 0.75 * k, 0, 0, Math.PI * 2); ctx.fill();
      inkEllipse(ctx, mt.x, mt.y, mt.r, mt.r * 0.75, Math.floor(mt.x + mt.y), 4, 'rgba(120,30,20,.85)');
    }
    for (const e of m.enemies) {
      if (e.def.kind === 'boss' && e.mode === 1) {
        const ang = Math.atan2(e.dy, e.dx);
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(ang);
        ctx.fillStyle = `rgba(220,40,30,${0.18 + 0.15 * Math.sin(this.time * 30)})`;
        rrect(ctx, 0, -e.r * 0.8, 440, e.r * 1.6, e.r * 0.8); ctx.fill();
        ctx.restore();
      }
    }

    // gems & pickups
    for (const g of m.gems) {
      if (!vis(g.x, g.y)) continue;
      const bob = g.flying ? 0 : Math.sin(this.time * 4 + g.x * 0.05) * 2;
      this.drawAmber(ctx, g.x, g.y + bob - 12, g.value >= 10 ? 32 : g.value >= 3 ? 26 : 21, g.x * 0.37 + g.y * 0.11);
    }
    for (const pk of m.pickups) {
      if (!vis(pk.x, pk.y)) continue;
      const s = this.sprites.pickup(pk.kind);
      const bob = Math.sin(this.time * 3.5 + pk.x) * 3;
      if (pk.kind === 'chest') {
        ctx.fillStyle = `rgba(255,220,80,${0.25 + Math.sin(this.time * 5) * 0.1})`;
        ctx.beginPath(); ctx.ellipse(pk.x, pk.y, 46, 18, 0, 0, Math.PI * 2); ctx.fill();
        inkEllipse(ctx, pk.x, pk.y, 48, 19, 3, 3, 'rgba(120,80,20,.8)');
      }
      if (pk.kind === 'coin') { this.drawXp(ctx, pk.x, pk.y + bob - 14, 16, pk.x * 0.3); continue; }  // gold = spinning gold coin
      this.blit(ctx, s, pk.x, pk.y + bob, 1, 1, 1, 0, 0);
    }

    if (this.amberT > 0 && m.gems.length) {
      const gem = m.gems.reduce((a, b) => Math.hypot(a.x - m.px, a.y - m.py) < Math.hypot(b.x - m.px, b.y - m.py) ? a : b);
      const rr = 24 + Math.sin(this.time * 7) * 5;
      inkEllipse(ctx, gem.x, gem.y, rr, rr * 0.8, 5, 3, '#f3d79a');
    }
    // shadows, one path
    ctx.fillStyle = 'rgba(30,20,10,.2)';
    ctx.beginPath();
    for (const e of m.enemies) {
      if (!vis(e.x, e.y)) continue;
      const fly = e.def.flutter ? 14 : 0;
      ctx.moveTo(e.x + e.r, e.y + fly);
      ctx.ellipse(e.x, e.y + fly, e.r, e.r * 0.34, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    // Hero aura: a soft warm glow wrapped around his body (no beam), baked once.
    if (!this.heroPool) {
      const c = document.createElement('canvas'); c.width = 200; c.height = 240;
      const x = c.getContext('2d')!;
      const gr = x.createRadialGradient(100, 130, 0, 100, 130, 105);
      gr.addColorStop(0, 'rgba(255,232,180,0.30)'); gr.addColorStop(0.55, 'rgba(255,225,165,0.14)'); gr.addColorStop(1, 'rgba(255,225,165,0)');
      x.fillStyle = gr; x.beginPath(); x.ellipse(100, 130, 100, 115, 0, 0, Math.PI * 2); x.fill();
      this.heroPool = c;
    }
    // Hero: one clear ground shadow under the feet, sized to the art (not the hitbox).
    // Soft contact shadow: baked radial falloff (dark core, feathered edge), no hard rim.
    if (!this.softShadow) {
      const c = document.createElement('canvas'); c.width = 128; c.height = 128;
      const x = c.getContext('2d')!; const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(20,14,8,0.42)'); gr.addColorStop(0.45, 'rgba(20,14,8,0.28)'); gr.addColorStop(1, 'rgba(20,14,8,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 128, 128); this.softShadow = c;
    }
    ctx.drawImage(this.softShadow, m.px - 42, m.py - 15, 84, 26);

    const egg = this.sprites.egg();
    // mallet slam dust ring lies on the ground, under the hero's feet
    for (const f of this.shots) if (f.clip === 'slam') this.fxClips.slam.draw(ctx, f.x, f.y, f.w, f.t, 1, 0);
    // spinning pot lids ride low, under every body (they never cover the hero's face)
    const goose = this.sprites.image('proj-lid');
    for (const o of m.orbitPositions()) {
      if (goose) { const a = Math.atan2(o.y - m.py, o.x - m.px) + Math.PI / 2; ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(a + this.time * 9); ctx.drawImage(goose, -27, -27, 54, 54); ctx.restore(); }
      else this.blit(ctx, egg, o.x, o.y + 10, 1.1, 1, 1, this.time * 6, 0);
    }

    // Loyal Mutt dogs: run loop when moving, a tiny hop when biting, a ground shadow
    for (const p of m.pets) {
      ctx.fillStyle = 'rgba(25,18,10,.25)';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
      if (!this.dogClip.ready) continue;
      // bite: crouch back, then lunge nose-down at the target and snap the jaws shut
      const k = p.bite > 0 ? 1 - p.bite / 0.24 : -1;
      const lunge = k < 0 ? 0 : k < 0.3 ? -k / 0.3 * 6 : Math.sin((k - 0.3) / 0.7 * Math.PI) * 18;
      const tilt = k < 0 ? 0 : k < 0.3 ? -0.08 : Math.sin((k - 0.3) / 0.7 * Math.PI) * 0.22;
      const hop = k < 0.3 ? 0 : Math.sin((k - 0.3) / 0.7 * Math.PI) * 6;
      ctx.save(); ctx.translate(p.x + lunge * p.facing, p.y); ctx.rotate(tilt * p.facing);
      this.dogClip.draw(ctx, 0, -hop, 84, p.moving || k >= 0 ? this.time * (k >= 0 ? 1.6 : 1) : 0, p.facing, 0, k >= 0.3 && k < 0.7 ? 1.08 : 1, k >= 0 && k < 0.3 ? 0.94 : 1);
      ctx.restore();
      if (k >= 0.45 && k < 0.85) {
        // two inked jaw arcs closing in front of the muzzle
        const close = (k - 0.45) / 0.4, mx = p.x + p.facing * (40 + lunge), my = p.y - 30, o = 10 * (1 - close) + 2;
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.globalAlpha = 1 - close * 0.6;
        ctx.beginPath(); ctx.arc(mx, my - o, 9, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
        ctx.beginPath(); ctx.arc(mx, my + o, 9, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    // y-sorted bodies
    const list = this.visibleEnemies;
    list.length = 0;
    for (const kind of ENEMY_KINDS) this.enemySprites[kind] = this.sprites.enemy(kind, m.zone);
    for (const e of m.enemies) if (vis(e.x, e.y, e.r * 3)) list.push(e);
    list.sort(byY);
    let drewPlayer = false;
    for (const e of list) {
      if (!drewPlayer && e.y > m.py) { this.drawPlayer(ctx, m); drewPlayer = true; }
      this.drawEnemy(ctx, e);
    }
    if (!drewPlayer) this.drawPlayer(ctx, m);

    for (const d of this.dying) {
      const k = d.t / 0.22;
      ctx.globalAlpha = 1 - k;
      this.blit(ctx, d.s, d.x, d.y - k * 10, d.scale * (1 - k * 0.15), 1, 1, 0, 0.8 * (1 - k));
    }
    ctx.globalAlpha = 1;

    // orbiting eggs

    this.drawProjectiles(ctx, m);
    this.drawSlashes(ctx, m);
    this.drawWaves(ctx, m);
    this.drawImpacts(ctx);

    // falling meteors
    const rock = this.sprites.image('proj-meteor') ?? this.sprites.image('proj-rock');
    for (const mt of m.meteors) {
      const k = 1 - mt.t / METEOR_DELAY;
      const x = mt.x - 260 * (1 - k), y = mt.y - 620 * (1 - k);
      if (rock) {
        ctx.fillStyle = `rgba(20,15,10,${0.15 + 0.3 * k})`;
        ctx.beginPath(); ctx.ellipse(mt.x, mt.y, mt.r * (0.3 + 0.5 * k), mt.r * (0.15 + 0.25 * k), 0, 0, Math.PI * 2); ctx.fill();
        const d = (this.sprites.image('proj-meteor') ? 110 : 64) + mt.r * 0.3;
        ctx.save(); ctx.translate(x, y - d * 0.3); ctx.rotate(this.sprites.image('proj-meteor') ? 0 : k * 3);
        ctx.drawImage(rock, -d / 2, -d / 2, d, d * (rock.naturalHeight / rock.naturalWidth));
        ctx.restore();
        continue;
      }
      ctx.strokeStyle = 'rgba(255,170,60,.55)'; ctx.lineWidth = 16;
      ctx.beginPath(); ctx.moveTo(x - 60, y - 140); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a6a5a'; ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff9a3c'; ctx.beginPath(); ctx.arc(x - 4, y - 5, 7, 0, Math.PI * 2); ctx.fill();
    }

    this.fx.draw(ctx);
    ctx.restore();
  }

  /**
   * World decoration on fixed hashed grids (never repeats visibly, never changes on return):
   * layer 1 = flat light ground decals (cream dirt, paths, stones, flowers, leaves) that break up
   * the dark green; layer 2 = props (ferns, grass, mushrooms, rocks, logs, roots, stumps, bones).
   * Purely visual, drawn under every creature.
   */
  private drawProps(ctx: Ctx, L: number, R: number, T: number, B: number): void {
    this.props.draw(ctx, L, R, T, B, this.propImage);
  }

  /** Draw a sprite with its ground anchor at (x, y). */
  private blit(ctx: Ctx, s: Sprite, x: number, y: number, scale: number, sx: number, sy: number, rot: number, flash: number, flip = 1): void {
    const w = s.w * scale, h = s.h * scale;
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(sx * flip, sy);
    ctx.drawImage(s.img, -s.ax * w, -s.ay * h, w, h);
    if (flash > 0) {
      ctx.globalAlpha *= Math.min(1, flash);
      ctx.drawImage(s.white, -s.ax * w, -s.ay * h, w, h);
    }
    ctx.restore();
  }

  private drawEnemy(ctx: Ctx, e: Enemy): void {
    const s = this.enemySprites[e.def.kind];
    const sc = this.enemyScale(e.def.kind, s) * (e.elite ? 1.3 : 1);
    if (e.elite) {
      ctx.save(); ctx.strokeStyle = '#ffd75a'; ctx.lineWidth = 2; 
      ctx.beginPath(); ctx.ellipse(e.x, e.y - e.r, e.r * 1.5, e.r * 1.65, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    const walk = e.stun > 0 ? 0 : e.age * (e.def.flutter ? 18 : 11);
    let y = e.y - Math.abs(Math.sin(walk)) * (e.def.flutter ? 6 : 3) - (e.def.flutter ? 14 : 0);
    let x = e.x;
    let sx = 1 + Math.sin(walk * 2) * 0.04, sy = 1 - Math.sin(walk * 2) * 0.04;
    if (e.mode === 1) { x += Math.sin(this.time * 70) * 3; sx = 1.12; sy = 0.88; }
    if (e.stun > 0) y += 0;
    const clip = this.clipsFor(this.m!.zone)[e.def.kind] ?? this.clips[e.def.kind];
    const flash = e.flash > 0 ? e.flash * 8 : e.mode === 1 ? 0.35 : 0;
    if (clip?.ready) {
      // The loop already carries the motion: no code bob, only the wind-up shake/squash.
      const t = e.stun > 0 ? 0 : e.age * (e.mode === 2 ? 2 : 1);
      clip.draw(ctx, x, e.y, s.w * sc, t, e.facing, flash, e.mode === 1 ? sx : 1, e.mode === 1 ? sy : 1);
    } else {
      this.blit(ctx, s, x, y, sc, sx, sy, e.mode === 2 ? 0 : Math.sin(walk) * 0.05, flash, e.facing);
    }
    if (e.stun > 0) {
      ctx.fillStyle = '#f3d79a'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const a = this.time * 5 + i * 2.1;
        const px = e.x + Math.cos(a) * e.r * 0.8, py = e.y - e.r * 2.3 + Math.sin(a) * 4;
        ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
    if (e.def.kind === 'brute' && e.hp < e.maxHp) {
      const w = 70;
      bar(ctx, { x: e.x - w / 2, y: e.y + 10, w, h: 8 }, e.hp / e.maxHp, '#e8504a');
    }
  }

  private drawPlayer(ctx: Ctx, m: Model): void {
    const s = this.sprites.dino(m.species, m.form);
    const pr = m.playerRadius;
    const sc = (pr * 3.9) / s.w;
    const moving = Math.hypot(m.mx, m.my) > 0.1 && m.status === 'play';
    const walk = this.time * 13;
    const bob = moving ? Math.abs(Math.sin(walk)) * 6 : Math.sin(this.time * 2.2) * 1.5;
    const sq = moving ? Math.sin(walk * 2) * 0.05 : Math.sin(this.time * 2.2) * 0.02;
    const flip = m.faceX < -0.1 ? -1 : 1;
    const blink = m.invuln > 0 && m.status === 'play' && Math.floor(this.time * 18) % 2 === 0;
    const evo = this.evolveT > 0 ? 1 + Math.sin((1.3 - this.evolveT) * 14) * 0.08 * this.evolveT : 1;
    if (this.hero.ready) {
      this.hero.draw(ctx, m.px, m.py, pr * 6.0 * evo, flip, moving, this.evolveT > 0.9 ? 1 : 0, blink ? 0.55 : 1);
    } else {
      ctx.globalAlpha = blink ? 0.55 : 1;
      this.blit(ctx, s, m.px, m.py - bob, sc * evo, 1 - sq, 1 + sq, moving ? m.mx * 0.08 * flip : 0, this.evolveT > 0.9 ? 1 : 0, flip);
      ctx.globalAlpha = 1;
    }
    // HP bar under the feet (green: never shares a hue with enemy bars)
    const w = 70;
    const r: Rect = { x: m.px - w / 2, y: m.py + 20, w, h: 8 };
    ctx.fillStyle = 'rgba(30,22,14,.85)'; rrect(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, 5); ctx.fill();
    ctx.fillStyle = '#e8d8b8'; rrect(ctx, r.x, r.y, r.w * Math.max(this.lagHp, m.hp / m.maxHp), r.h, 3); ctx.fill();
    ctx.fillStyle = m.hp / m.maxHp < 0.3 ? '#e8642e' : '#b4e05a';
    rrect(ctx, r.x, r.y, Math.max(3, r.w * m.hp / m.maxHp), r.h, 3); ctx.fill();
    ctx.strokeStyle = '#1e1610'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(r.x - 3, r.y - 2.5); ctx.lineTo(r.x + r.w * 0.55, r.y - 3.2); ctx.lineTo(r.x + r.w + 3, r.y - 2.2);
    ctx.lineTo(r.x + r.w + 3.5, r.y + r.h + 2.5); ctx.lineTo(r.x + r.w * 0.4, r.y + r.h + 3.2); ctx.lineTo(r.x - 3.2, r.y + r.h + 2.4); ctx.closePath(); ctx.stroke();
  }

  private drawProjectiles(ctx: Ctx, m: Model): void {
    const bone = this.sprites.bone();
    for (const p of m.projs) {
      if (p.kind === 'bone') { this.blit(ctx, bone, p.x, p.y, 1.1, 1, 1, p.age * 16, 0); continue; }
      const flask = p.kind === 'spit' ? this.sprites.image('proj-flask') : undefined;
      if (flask) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.age * 14); ctx.drawImage(flask, -22, -22, 44, 44); ctx.restore(); continue; }
      if (p.kind === 'spit') {
        const sp = Math.hypot(p.vx, p.vy) || 1;
        const ux = p.vx / sp, uy = p.vy / sp;
        for (let i = 3; i >= 1; i--) {
          ctx.fillStyle = `rgba(255,${120 + i * 30},40,${0.5 - i * 0.12})`;
          ctx.beginPath(); ctx.arc(p.x - ux * i * 12, p.y - uy * i * 12, p.r * (1.1 - i * 0.18), 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.35 + 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff6a2c'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f0c060'; ctx.beginPath(); ctx.arc(p.x - 2, p.y - 2, p.r * 0.75, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      // enemy spores: purple = danger, pulsing, readable over every ground
      const pulse = 1 + Math.sin(p.age * 14) * 0.12;
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * pulse + 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c040d8'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f0a0ff'; ctx.beginPath(); ctx.arc(p.x - 3, p.y - 3, p.r * 0.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  private drawSlashes(ctx: Ctx, m: Model): void {
    if (this.jabClip.ready) {
      // Sprite slash (video-cut, hand-painted): a crescent swipe around the hero, turned toward the target.
      for (const s of m.slashes) {
        if (this.jabSeen.has(s)) continue;
        this.jabSeen.add(s);
        this.jabs.push({ x: s.x, y: s.y, a: s.angle, w: s.r * 2.2, t: 0 });
      }
      for (const j of this.jabs) {
        ctx.save();
        ctx.translate(m.px, m.py - 30);
        ctx.rotate(j.a);
        this.jabClip.draw(ctx, 0, 0, j.w, j.t, 1, 0);
        ctx.restore();
      }
      return;
    }
    const jab = this.sprites.image('fx-jab');
    if (!jab) return;
    {
      for (const s of m.slashes) {
        const k = s.age / s.life;
        const out = k < 0.35 ? k / 0.35 : 1;                 // thrust out fast
        const fade = k < 0.35 ? 1 : 1 - (k - 0.35) / 0.65;    // then thin and fade
        ctx.save();
        ctx.translate(s.x, s.y - 34);
        ctx.rotate(s.angle);
        ctx.globalAlpha = fade;
        const len = s.r * (0.35 + 0.75 * out), h = ((len * jab.naturalHeight) / jab.naturalWidth) * (0.6 + 0.4 * fade);
        ctx.drawImage(jab, 18 + s.r * 0.15 * out, -h / 2, len, h);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      return;
    }
    for (const s of m.slashes) {
      const k = s.age / s.life;
      const r = s.r * (0.75 + 0.25 * Math.min(1, k * 3));
      const span = Math.PI / 3 * (0.7 + 0.3 * Math.min(1, k * 4));
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.globalAlpha = 1 - k * k;
      // Tapered crescent: the inner circle is offset back so both tips pinch to a point.
      const off = r * 0.16, ir = r * 0.97;
      const ea = Math.atan2(r * Math.sin(span), r * Math.cos(span) + off);
      const path = new Path2D();
      path.arc(0, 0, r, -span, span);
      path.arc(-off, 0, ir, ea, -ea, true);
      path.closePath();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.stroke(path);
      ctx.fillStyle = '#ffb04a'; ctx.fill(path);
      ctx.clip(path);
      ctx.fillStyle = '#fff6e0';
      ctx.beginPath(); ctx.arc(-r * 0.1, 0, r * 0.95, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /** XP: the painted amber crystal with a soft warm glow and a twinkle - clearly not gold. */
  private drawAmber(ctx: Ctx, x: number, y: number, h: number, seed: number): void {
    const img = this.sprites.image('hud-amber') ?? this.sprites.image('pickup-amber-1');
    const tw = 0.5 + 0.5 * Math.sin(this.time * 2.6 + seed);
    ctx.fillStyle = `rgba(255,170,60,${0.16 + 0.1 * tw})`;
    ctx.beginPath(); ctx.ellipse(x, y, h * 0.75, h * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    if (img) { const w = (h * img.naturalWidth) / img.naturalHeight; ctx.drawImage(img, x - w / 2, y - h / 2, w, h); }
    if (tw > 0.86) {
      const L = h * 0.45 * ((tw - 0.86) / 0.14);
      ctx.strokeStyle = 'rgba(255,250,225,.95)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + h * 0.2 - L, y - h * 0.3); ctx.lineTo(x + h * 0.2 + L, y - h * 0.3);
      ctx.moveTo(x + h * 0.2, y - h * 0.3 - L); ctx.lineTo(x + h * 0.2, y - h * 0.3 + L); ctx.stroke();
    }
  }

  /**
   * XP drop as a chunky spinning gold coin (Subway-Surfers-like): big enough to read, ink
   * outline like the art, a bright rim, a stamped centre, a sliding shine and a twinkle.
   * Spin = horizontal squash by |cos|, offset per coin so the field shimmers.
   */
  private drawXp(ctx: Ctx, x: number, y: number, r: number, seed: number): void {
    const ph = this.time * 1.8 + seed;
    // gentle turn, never edge-on: reads as a round coin, still alive
    const sx = 0.62 + 0.38 * Math.abs(Math.cos(ph));
    const edge = Math.cos(ph) < 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(255,200,80,.18)';
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.9, r * 1.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.scale(sx, 1);
    const coin = this.sprites.image('hud-coin') ?? this.sprites.image('pickup-coin');
    if (coin) {
      // the painted game coin, spun by squashing; the dark side shows while it turns away
      const d = r * 2.3;
      ctx.drawImage(coin, -d / 2, -d / 2, d, d);
      ctx.restore();
      const tw2 = 0.5 + 0.5 * Math.sin(this.time * 2.3 + seed * 1.7);
      if (tw2 > 0.88) {
        const L = r * 1.3 * ((tw2 - 0.88) / 0.12);
        ctx.strokeStyle = 'rgba(255,250,225,.95)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + r * 0.6 - L, y - r * 0.7); ctx.lineTo(x + r * 0.6 + L, y - r * 0.7);
        ctx.moveTo(x + r * 0.6, y - r * 0.7 - L); ctx.lineTo(x + r * 0.6, y - r * 0.7 + L); ctx.stroke();
      }
      return;
    }
    ctx.fillStyle = '#2a1d16'; ctx.beginPath(); ctx.arc(0, 0, r + 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = edge ? '#c4791e' : '#e8a52a'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = edge ? '#e8a52a' : '#ffd45a'; ctx.beginPath(); ctx.arc(0, 0, r * 0.74, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(160,90,20,.9)'; ctx.lineWidth = Math.max(1.5, r * 0.14);
    ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.35); ctx.lineTo(-r * 0.25, r * 0.35); ctx.moveTo(r * 0.2, -r * 0.35); ctx.lineTo(r * 0.2, r * 0.35); ctx.stroke();
    ctx.fillStyle = 'rgba(255,250,225,.85)';
    ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.4, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const tw = 0.5 + 0.5 * Math.sin(this.time * 2.3 + seed * 1.7);
    if (tw > 0.88) {
      const L = r * 1.3 * ((tw - 0.88) / 0.12);
      ctx.strokeStyle = 'rgba(255,250,225,.95)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + r * 0.6 - L, y - r * 0.7); ctx.lineTo(x + r * 0.6 + L, y - r * 0.7);
      ctx.moveTo(x + r * 0.6, y - r * 0.7 - L); ctx.lineTo(x + r * 0.6, y - r * 0.7 + L); ctx.stroke();
    }
  }

  private drawPuffs(ctx: Ctx): void {
    for (const p of this.puffs) {
      const k = p.t / 0.38, e = 1 - Math.pow(1 - k, 3);
      ctx.globalAlpha = k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5;
      for (let i = 0; i < 4; i++) {
        const a = (p.seed % 6) * 0.5 + (i / 4) * Math.PI * 2;
        const d = p.r * 0.75 * e, rr = p.r * (0.38 + 0.12 * ((p.seed >> i) & 1)) * (0.6 + 0.6 * e) * (1 - 0.3 * k);
        const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d * 0.8 - 6 * e;
        ctx.fillStyle = '#2a1d16'; ctx.beginPath(); ctx.arc(x, y, rr + 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a4440'; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6a625a'; ctx.beginPath(); ctx.arc(x - rr * 0.3, y - rr * 0.3, rr * 0.45, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Simple bramble spikes: three inked triangles on a small dirt mound, baked once. */
  private spikeCanvas: HTMLCanvasElement | null = null;
  private spikeSprite(): HTMLCanvasElement {
    if (this.spikeCanvas) return this.spikeCanvas;
    const c = document.createElement('canvas'); c.width = 120; c.height = 100;
    const x = c.getContext('2d')!;
    x.lineJoin = 'round'; x.lineCap = 'round';
    const ink = '#2a1d16';
    // dirt mound
    x.beginPath(); x.ellipse(60, 84, 46, 12, 0, 0, Math.PI * 2);
    x.fillStyle = '#7a5a3e'; x.fill(); x.lineWidth = 4; x.strokeStyle = ink; x.stroke();
    // three spikes: [base x, half width, height, lean]
    const spikes: [number, number, number, number][] = [[38, 11, 52, -6], [62, 14, 74, 2], [86, 11, 48, 7]];
    for (const [bx, hw, h, lean] of spikes) {
      const tipX = bx + lean, tipY = 84 - h;
      x.beginPath(); x.moveTo(bx - hw, 84); x.lineTo(tipX, tipY); x.lineTo(bx + hw, 84); x.closePath();
      x.fillStyle = '#5f7a3a'; x.fill();
      // one hard shadow tone on the right half
      x.beginPath(); x.moveTo(tipX, tipY); x.lineTo(bx + hw, 84); x.lineTo(bx + 1, 84); x.closePath();
      x.fillStyle = '#44592a'; x.fill();
      x.beginPath(); x.moveTo(bx - hw, 84); x.lineTo(tipX, tipY); x.lineTo(bx + hw, 84);
      x.lineWidth = 3.5; x.strokeStyle = ink; x.stroke();
    }
    this.spikeCanvas = c;
    return c;
  }

  private drawImpacts(ctx: Ctx): void {
    this.drawPuffs(ctx);
    for (const b of this.blasts) this.meteorClip.draw(ctx, b.x, b.y + b.r * 0.25, b.r * 1.9, b.t, 1, 0);
    for (const f of this.shots) if (f.clip !== 'slam') this.fxClips[f.clip].draw(ctx, f.x, f.y, f.w, f.t, 1, 0);
    for (const p of this.impacts) {
      const img = this.sprites.image(p.key);
      if (!img) continue;
      const k = p.t / p.life;
      const pop = k < 0.25 ? 0.5 + 0.75 * (k / 0.25) : 1.25 - 0.15 * ((k - 0.25) / 0.75);
      const d = p.size * pop;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot + p.spin * k);
      ctx.globalAlpha = k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5;
      ctx.drawImage(img, -d / 2, -d / 2, d, d);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private drawWaves(ctx: Ctx, m: Model): void {
    for (const w of m.waves) {
      const k = w.age / w.life;
      const r = w.r * (0.2 + 0.8 * Math.sqrt(k));
      ctx.globalAlpha = 1 - k;
      if (w.kind !== 'revive' && this.fxClips[w.kind === 'stomp' ? 'slam' : 'horn']?.ready) continue;
      const paint = this.sprites.image(w.kind === 'stomp' ? 'fx-slam' : 'fx-horn');
      if (paint) {
        const e = 1 - Math.pow(1 - k, 3);
        const d = w.r * 2.1 * (0.35 + 0.75 * e);
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate((w.kind === 'stomp' ? 0.15 : 0.5) * e);
        ctx.scale(1, 0.85);
        ctx.globalAlpha = (1 - k) * (w.kind === 'stomp' ? 0.95 : 0.75);
        ctx.drawImage(paint, -d / 2, -d / 2, d, d);
        ctx.restore();
        continue;
      }
      if (w.kind === 'stomp') {
        ctx.strokeStyle = INK; ctx.lineWidth = 18 * (1 - k) + 4;
        ctx.beginPath(); ctx.ellipse(w.x, w.y, r, r * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#d8b07a'; ctx.lineWidth = 18 * (1 - k);
        ctx.beginPath(); ctx.ellipse(w.x, w.y, r, r * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
      } else {
        // Roar = jagged burst, never concentric arcs ("khủng long wifi").
        const n = 18;
        ctx.beginPath();
        for (let i = 0; i <= n * 2; i++) {
          const a = (i / (n * 2)) * Math.PI * 2 + w.x * 0.01;
          const rr = i % 2 ? r * 0.78 : r;
          const x = w.x + Math.cos(a) * rr, y = w.y + Math.sin(a) * rr * 0.85;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = w.kind === 'revive' ? 'rgba(255,230,120,.45)' : 'rgba(255,240,170,.3)';
        ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  private painted: (CanvasPattern | null)[] = [];
  /** Painted ground tile (public/sprites ground-<zone>) once loaded, else the procedural one. */
  private groundFor(zone: number): CanvasPattern {
    if (this.painted[zone]) return this.painted[zone]!;
    const img = this.sprites.image(`ground-${zone}`);
    if (img) {
      const p = this.ctx.createPattern(img, 'repeat');
      if (p) {
        p.setTransform(new DOMMatrix().scale(0.8));
        this.painted[zone] = p;
        return p;
      }
    }
    return this.ground[zone];
  }

  private makeGround(zone: number): CanvasPattern {
    const S = 512;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d')!;
    const [base, blotch, tuft, pebble] = GROUND[zone];
    g.fillStyle = base;
    g.fillRect(0, 0, S, S);
    let seed = 7 + zone * 101;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const wrap = (fn: (x: number, y: number) => void, x: number, y: number) => {
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(x + ox, y + oy);
    };
    // soft large blotches (low contrast: the ground stays calm)
    for (let i = 0; i < 7; i++) {
      const x = rnd() * S, y = rnd() * S, rx = 50 + rnd() * 110, ry = rx * (0.5 + rnd() * 0.3);
      wrap((px, py) => { g.fillStyle = blotch; g.beginPath(); g.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); g.fill(); }, x, y);
    }
    // grass tufts / cracks
    g.strokeStyle = tuft; g.lineWidth = 3; g.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const x = rnd() * S, y = rnd() * S;
      wrap((px, py) => {
        g.beginPath();
        if (zone === 0) { g.moveTo(px - 6, py); g.lineTo(px - 9, py - 9); g.moveTo(px, py); g.lineTo(px, py - 12); g.moveTo(px + 6, py); g.lineTo(px + 9, py - 8); }
        else { g.moveTo(px - 10, py); g.lineTo(px, py - 3); g.lineTo(px + 6, py + 5); }
        g.stroke();
      }, x, y);
    }
    // pebbles with a thin ink edge
    for (let i = 0; i < 6; i++) {
      const x = rnd() * S, y = rnd() * S, r = 4 + rnd() * 5;
      wrap((px, py) => {
        g.fillStyle = 'rgba(42,29,22,.55)'; g.beginPath(); g.ellipse(px, py, r + 1.5, r * 0.7 + 1.5, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = pebble; g.beginPath(); g.ellipse(px, py, r, r * 0.7, 0, 0, Math.PI * 2); g.fill();
      }, x, y);
    }
    return this.ctx.createPattern(c, 'repeat')!;
  }

  // ---------------------------------------------------------------- HUD
  private drawHud(ctx: Ctx, m: Model): void {
    const v = this.v;
    const s = v.safe;
    const top = s.t + 14;
    const left = s.l + 16, right = v.w - s.r - 16;
    const pauseR: Rect = { x: right - 64, y: top, w: 64, h: 64 };
    const fullR: Rect | null = canFullscreen() ? { x: pauseR.x - 64 - 14, y: top, w: 64, h: 64 } : null;

    // XP bar + level medallion
    const lvR = 34;
    const xr: Rect = { x: left + lvR, y: top + 14, w: (fullR ?? pauseR).x - 16 - left - lvR, h: 22 };
    const pct = Math.min(1, m.xp / m.xpNeed);
    if (kitImage('ui-bar-frame')) {
      bar(ctx, { x: xr.x + 10, y: xr.y + 2, w: xr.w - 10, h: xr.h - 4 }, pct, '#d89a3a');
    } else {
      ctx.fillStyle = INK; rrect(ctx, xr.x - 3, xr.y - 3, xr.w + 6, xr.h + 6, 14); ctx.fill();
      ctx.fillStyle = '#3e3028'; rrect(ctx, xr.x, xr.y, xr.w, xr.h, 11); ctx.fill();
      if (pct > 0) {
        const g = ctx.createLinearGradient(0, xr.y, 0, xr.y + xr.h);
        g.addColorStop(0, '#ffe07a'); g.addColorStop(1, '#f0a020');
        ctx.fillStyle = g; rrect(ctx, xr.x, xr.y, Math.max(xr.h, xr.w * pct), xr.h, 11); ctx.fill();
      }
    }
    const med = kitImage('ui-medallion');
    if (med) ctx.drawImage(med, left + lvR - (lvR + 8), xr.y + xr.h / 2 - (lvR + 8), (lvR + 8) * 2, (lvR + 8) * 2);
    else {
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(left + lvR, xr.y + xr.h / 2, lvR + 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.arc(left + lvR, xr.y + xr.h / 2, lvR, 0, Math.PI * 2); ctx.fill();
    }
    outlinedText(ctx, String(m.level), left + lvR, xr.y + xr.h / 2 + 1, fitSize(ctx, String(m.level), 30, lvR * 1.5), '#f6ead0', INK, 'center');

    if (this.firstRun) text(ctx, 'XP', xr.x + 45, xr.y + xr.h / 2, 18, '#fff', 'left', 700);
    // pause
    const pauseImg = this.sprites.image('hud-pause');
    if (pauseImg) {
      const hit = this.touchRect(pauseR);
      this.ui.claimIfOver('pause', hit);
      const p = this.input.p;
      ctx.drawImage(pauseImg, pauseR.x, pauseR.y, pauseR.w, pauseR.h);
      if (p.justUp && inside(hit, p.x, p.y) && inside(hit, p.downX, p.downY)) this.pause();
    } else if (this.ui.iconButton('pause', pauseR, ctx, () => {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
      for (const dx of [-9, 5]) { rrect(ctx, pauseR.x + 32 + dx, pauseR.y + 18, 9, 28, 3); ctx.fill(); ctx.stroke(); }
    })) this.pause();

    if (fullR) this.fullscreenButton(ctx, 'hudfull', fullR);

    // timer (count up to 10:00)
    const ty = top + 78;
    const remain = Math.max(0, m.T.runLength - m.time);
    const late = remain < 60;
    outlinedText(ctx, fmtTime(m.time), v.w / 2, ty, 46, late ? '#f0c060' : '#fff', INK, 'center');
    // what the clock is counting toward: the next boss, then the zone clear (the boss bar takes this spot in a fight)
    if (!m.boss && m.status === 'play') {
      const next = m.T.bossAt[m.bossesSpawned];
      const goal = next !== undefined ? 'NEXT BOSS IN ' + fmtTime(next - m.time) : 'ZONE CLEAR IN ' + fmtTime(remain);
      outlinedText(ctx, goal, v.w / 2, ty + 40, 20, next !== undefined ? '#f3d79a' : '#bfe39a', INK, 'center');
    }

    // kills + coins (right column, under pause)
    const ry = top + 98;
    const skull = this.sprites.image('hud-skull'), hcoin = this.sprites.image('hud-coin');
    if (skull) ctx.drawImage(skull, right - 168, ry - 16, 34, 32); else this.skull(ctx, right - 150, ry);
    outlinedText(ctx, String(m.kills), right - 126, ry, 28, '#f6ead0', INK, 'left');
    if (hcoin) ctx.drawImage(hcoin, right - 167, ry + 24, 32, 32);
    else this.blit(ctx, this.sprites.pickup('coin'), right - 150, ry + 52, 1, 1, 1, 0, 0);
    outlinedText(ctx, String(m.coins), right - 126, ry + 40, 28, '#f0c060', INK, 'left');

    // owned skills (left column)
    let ix = left, iy = top + 66;
    const all: [SkillId, number][] = [...m.weapons, ...m.passives];
    // Columns that fit left of the clock: on a narrow portrait screen 5 columns ran under the timer and the boss bar.
    const S = 60, perRow = Math.max(3, Math.min(5, Math.floor((v.w / 2 - 100 - left) / (S + 8))));
    const trayBottom = iy + Math.ceil(all.length / perRow) * (S + 16);
    this.trayRight = left + Math.min(all.length, perRow) * (S + 8);
    this.trayBottom = all.length ? trayBottom : 0;
    all.forEach(([id, lv], i) => {
      // Owned skills: big enough to read at a glance (42 px read as specks/glitches), level pips under.
      const col = i % perRow, row = Math.floor(i / perRow);
      const x = ix + col * (S + 8), y = iy + row * (S + 16);
      const ic = this.sprites.icon(id, SKILLS[id].color);
      ctx.drawImage(ic.img, x, y, S, S);
      for (let p = 0; p < MAX_LEVEL; p++) {
        const px = x + S / 2 - (MAX_LEVEL * 10) / 2 + p * 10;
        ctx.fillStyle = '#1e1610'; ctx.fillRect(px - 1, y + S + 2, 9, 8);
        ctx.fillStyle = p < lv ? '#f0c060' : '#5a4a3a';
        ctx.fillRect(px, y + S + 3, 7, 6);
      }
    });
    void ix;

    // boss bar
    if (m.boss) {
      const bw = Math.min(560, v.w * 0.62);
      const overlaps = v.w / 2 - bw / 2 < this.trayRight + 10;
      const br: Rect = { x: v.w / 2 - bw / 2, y: overlaps ? Math.max(ty + 40, this.trayBottom + 24) : ty + 40, w: bw, h: 16 };
      outlinedText(ctx, 'BOSS', v.w / 2, br.y - 2, 20, '#ff8a6b', INK, 'center');
      ctx.fillStyle = INK; rrect(ctx, br.x - 3, br.y + 10 - 3, br.w + 6, br.h + 6, 10); ctx.fill();
      ctx.fillStyle = '#3e2822'; rrect(ctx, br.x, br.y + 10, br.w, br.h, 8); ctx.fill();
      ctx.fillStyle = '#ffd0c0'; rrect(ctx, br.x, br.y + 10, br.w * this.bossLag, br.h, 8); ctx.fill();
      ctx.fillStyle = '#d8323a'; rrect(ctx, br.x, br.y + 10, Math.max(8, br.w * m.boss.hp / m.boss.maxHp), br.h, 8); ctx.fill();
    }
  }

  private skull(ctx: Ctx, x: number, y: number): void {
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y - 2, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x - 8, y + 4, 16, 10);
    ctx.fillStyle = '#f3e2bf'; ctx.beginPath(); ctx.arc(x, y - 2, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x - 6, y + 4, 12, 7);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x - 4, y - 2, 3, 0, 7); ctx.arc(x + 4, y - 2, 3, 0, 7); ctx.fill();
  }

  private drawHint(ctx: Ctx): void {
    const v = this.v;
    const touch = matchMedia('(pointer: coarse)').matches;
    const y = v.h * 0.72;
    const pulse = 1 + Math.sin(this.time * 4) * 0.04;
    ctx.save();
    ctx.globalAlpha = this.firstRun ? Math.max(0, 1 - this.hintFade / 0.4) : 1;
    ctx.translate(v.w / 2, y);
    ctx.scale(pulse, pulse);
    outlinedText(ctx, touch ? 'Drag anywhere to move' : 'WASD / Arrow keys to move', 0, 0, 42, '#f6ead0', INK, 'center');
    ctx.restore();
    ctx.save(); ctx.globalAlpha = this.firstRun ? Math.max(0, 1 - this.hintFade / 0.4) : 1;
    outlinedText(ctx, 'You attack automatically. Survive 10 minutes!', v.w / 2, y + 52, 24, '#f3d79a', INK, 'center');
    ctx.restore();
  }

  private drawBanner(ctx: Ctx): void {
    const b = this.banner!;
    const v = this.v;
    const k = b.t;
    const a = k < 0.2 ? k / 0.2 : k > b.len - 0.4 ? (b.len - k) / 0.4 : 1;
    const sc = k < 0.2 ? 0.7 + 0.3 * (k / 0.2) + Math.sin(k / 0.2 * Math.PI) * 0.12 : 1;
    // below the skill tray (and the boss bar under it) when the tray is tall on a narrow screen
    const y = Math.max(v.safe.t + (this.m?.boss ? 230 : 190), this.trayRight > v.w / 2 - 300 ? this.trayBottom + (this.m?.boss ? 110 : 56) : 0);
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.translate(v.w / 2, y);
    ctx.scale(sc, sc);
    const size = fitSize(ctx, b.text, 52, v.w - 60);
    outlinedText(ctx, b.text, 0, 0, size, b.color, INK, 'center');
    if (b.sub) outlinedText(ctx, b.sub, 0, size * 0.85, 24, '#f6ead0', INK, 'center');
    ctx.restore();
  }

  private drawEvolve(ctx: Ctx, m: Model): void {
    const [x, y] = this.w2s(m.px, m.py - 40);
    const k = this.evolveT / 1.3;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 2) * 0.55;
    const g = ctx.createRadialGradient(x, y, 10, x, y, 260);
    g.addColorStop(0, 'rgba(255,240,170,1)');
    g.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 260, y - 260, 520, 520);
    ctx.restore();
  }

  private drawJoystick(ctx: Ctx): void {
    const j = this.joy;
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(j.bx, j.by, 70, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const dx = j.kx - j.bx, dy = j.ky - j.by, d = Math.hypot(dx, dy), n = Math.min(1, 70 / Math.max(d, 1));
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath(); ctx.arc(j.bx + dx * n, j.by + dy * n, 30, 0, Math.PI * 2); ctx.fill();
  }

  // ---------------------------------------------------------------- level-up cards
  private drawOffers(ctx: Ctx, m: Model): void {
    const v = this.v;
    this.ui.scrim(ctx, v.w, v.h);
    const offers = m.offers!;
    const land = v.w / v.h > 1.1;
    const ready = this.time - this.offersAt > 0.35;
    const appear = Math.min(1, (this.time - this.offersAt) / 0.25);
    outlinedText(ctx, 'LEVEL UP!', v.w / 2, v.safe.t + (land ? 120 : 170), 60, '#f0c060', INK, 'center');
    outlinedText(ctx, 'Choose one', v.w / 2, v.safe.t + (land ? 172 : 226), 26, '#f6ead0', INK, 'center');

    const n = offers.length;
    const rects: Rect[] = [];
    if (land) {
      const ch = Math.min(520, v.h - v.safe.t - 330), cw = Math.min(ch * 0.72, (v.w - 100) / n - 32);
      const total = n * cw + (n - 1) * 36;
      for (let i = 0; i < n; i++) rects.push({ x: v.w / 2 - total / 2 + i * (cw + 36), y: v.safe.t + 210, w: cw, h: ch });
    } else {
      const cw = Math.min(640, v.w - 60), ch = 206;
      const total = n * ch + (n - 1) * 22;
      for (let i = 0; i < n; i++) rects.push({ x: v.w / 2 - cw / 2, y: v.h / 2 - total / 2 + 80 + i * (ch + 22), w: cw, h: ch });
    }
    offers.forEach((o, i) => {
      const r = rects[i];
      const dy = (1 - appear) * (60 + i * 30);
      const rr = { ...r, x: r.x + (this.banishing && !matchMedia('(prefers-reduced-motion: reduce)').matches ? Math.sin(this.time * 16 + i) * 4 : 0), y: r.y + dy };
      if (this.card(ctx, `offer${i}`, rr, o, land, ready, i)) this.pickOffer(i);
    });
    if (this.input.p.justUp) this.pressedCard = '';
    const bottom = Math.max(...rects.map(r => r.y + r.h)) + 28;
    // Secondary actions on painted dark-wood planks (quiet tone: the cards stay the primary choice).
    const bh = Math.max(78, 44 / v.scale), bw = Math.min(260, (v.w - 100) / 2);
    const canAct = ready && !this.busy && !this.poki.adRunning;
    if (m.rerolls > 0 && this.ui.button('reroll', { x: v.w / 2 - bw - 14, y: bottom, w: bw, h: bh },
      { label: 'REROLL', sub: `${m.rerolls} left`, tone: 'stone', disabled: !ready, size: 30 }, ctx) && canAct) this.rerollOffers();
    if (m.banishes > 0 && this.ui.button('banish', { x: v.w / 2 + 14, y: bottom, w: bw, h: bh },
      { label: this.banishing ? 'CANCEL' : 'BANISH', sub: this.banishing ? 'tap a card' : `${m.banishes} left`, tone: 'stone', disabled: !ready, size: 30 }, ctx) && canAct) this.banishing = !this.banishing;
    this.ui.swallow();
  }

  private card(ctx: Ctx, id: string, r: Rect, o: Offer, land: boolean, ready: boolean, _idx: number): boolean {
    const p = this.input.p;
    const over = inside(r, p.x, p.y);
    if (ready && p.justDown && over && !this.ui.claimed) { this.ui.claimed = true; this.pressedCard = id; }
    const pressed = p.down && over && this.pressedCard === id;
    const clicked = ready && p.justUp && over && this.pressedCard === id;

    const def = o.id === 'heal' ? { name: 'Roast Meat', color: '#e8504a', text: ['Heal 40 health.'] }
      : o.id === 'gold' ? { name: 'Gold Pile', color: '#f0c060', text: ['+20 coins.'] }
      : SKILLS[o.id];
    const desc = o.level > 0 ? def.text[o.level - 1] : def.text[0];
    const isNew = o.level === 1;

    ctx.save();
    const s = pressed ? 0.96 : 1;
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.scale(s, s);
    ctx.translate(-r.w / 2, -r.h / 2);
    // paper card: ink outline, cream face, coloured top edge
    if (!nine(ctx, 'ui-panel', { x: -10, y: -10, w: r.w + 20, h: r.h + 20 }, land ? 0.5 : 0.4)) {
      ctx.fillStyle = INK; rrect(ctx, -5, -5, r.w + 10, r.h + 12, 26); ctx.fill();
      ctx.fillStyle = '#f6e8c8'; rrect(ctx, 0, 0, r.w, r.h, 22); ctx.fill();
      ctx.fillStyle = '#e8d4a8'; rrect(ctx, 0, r.h - 14, r.w, 14, 8); ctx.fill();
    }

    const icon = this.sprites.icon(o.id, def.color);
    const isz = land ? Math.min(150, r.w * 0.52) : 132;
    const ix = land ? r.w / 2 - isz / 2 : 26, iy = land ? 44 : r.h / 2 - isz / 2;
    ctx.drawImage(icon.img, ix, iy, isz, isz);

    const tx = land ? r.w / 2 : ix + isz + 24;
    const align: CanvasTextAlign = land ? 'center' : 'left';
    const tw = land ? r.w - 56 : r.w - tx - 28;
    let y = land ? iy + isz + 44 : 46;
    // Title in ink, small-caps serif.
    const ns = fitSize(ctx, def.name, 32, tw);
    ctx.font = fontFor(ns); ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = INK;
    ctx.fillText(def.name, tx, y);
    y += 34;
    // Level as small inked diamonds; a new skill gets a quiet rust-red label instead of a sticker.
    if (isNew) {
      text(ctx, 'NEW SKILL', tx, y, 17, '#9a3a22', align, 700);
    } else if (o.level > 0) {
      const d = 7, gap = 20, total = (MAX_LEVEL - 1) * gap;
      const x0 = land ? tx - total / 2 : tx + d;
      for (let i = 0; i < MAX_LEVEL; i++) {
        const cx = x0 + i * gap;
        ctx.beginPath(); ctx.moveTo(cx, y - d - 1.5); ctx.lineTo(cx + d + 1.5, y); ctx.lineTo(cx, y + d + 1.5); ctx.lineTo(cx - d - 1.5, y); ctx.closePath();
        ctx.fillStyle = INK; ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx, y - d + 1); ctx.lineTo(cx + d - 1, y); ctx.lineTo(cx, y + d - 1); ctx.lineTo(cx - d + 1, y); ctx.closePath();
        ctx.fillStyle = i < o.level - 1 ? '#b8792e' : i === o.level - 1 ? '#e8b04a' : '#e2d3b0';
        ctx.fill();
      }
    }
    y += 22;
    // thin hand-drawn rule, then the description (balanced lines, no orphan words)
    ctx.strokeStyle = 'rgba(90,70,54,.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(tx - (land ? tw * 0.3 : 0), y); ctx.lineTo(tx + (land ? tw * 0.3 : tw * 0.6), y + 1); ctx.stroke();
    y += 26;
    const lastY = this.wrapBalanced(ctx, desc, tx, y, tw, 23, align, '#4a3a2c');
    let evolution = '';
    if (o.id !== 'heal' && o.id !== 'gold') {
      if (isWeapon(o.id)) evolution = 'Evolves with ' + SKILLS[EVOLUTIONS[o.id].passive].name;
      else {
        const weapon = [...this.m!.weapons.keys()].find(w => EVOLUTIONS[w].passive === o.id);
        if (weapon) evolution = 'Evolves ' + SKILLS[weapon].name;
      }
    }
    if (evolution) {
      // never on top of the description: below its last line when it runs long
      const ey = Math.max(lastY + 28, land ? r.h - 56 : r.h - 30);
      ctx.font = `italic 600 ${fitSize(ctx, evolution, 18, tw)}px "Alegreya", Georgia, serif`;
      ctx.fillStyle = '#7a5a3a'; ctx.textAlign = align; ctx.textBaseline = 'middle';
      ctx.fillText(evolution, tx, ey);
    }
    ctx.restore();
    return clicked;
  }

  /** Word wrap that splits lines evenly (no single orphan word on the last line). */
  private wrapBalanced(ctx: Ctx, str: string, x: number, y: number, maxW: number, size: number, align: CanvasTextAlign, color: string): number {
    ctx.font = fontFor(size, 600);
    const full = ctx.measureText(str).width;
    const lines = Math.max(1, Math.ceil(full / maxW));
    let w = maxW;
    if (lines > 1) {
      // shrink the box until one more line would appear: lines come out even
      let lo = full / lines, hi = maxW;
      for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (this.countLines(ctx, str, mid) > lines) lo = mid; else hi = mid; }
      w = hi + 1;
    }
    return this.wrap(ctx, str, x, y, w, size, align, color);
  }

  private countLines(ctx: Ctx, str: string, maxW: number): number {
    let n = 1, line = '';
    for (const word of str.split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (ctx.measureText(t).width > maxW && line) { n++; line = word; } else line = t;
    }
    return n;
  }

  private wrap(ctx: Ctx, str: string, x: number, y: number, maxW: number, size: number, align: CanvasTextAlign, color: string): number {
    ctx.font = fontFor(size, 600);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    const words = str.split(' ');
    let line = '';
    let yy = y;
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, yy); yy += size * 1.25; line = w; }
      else line = t;
    }
    if (line) ctx.fillText(line, x, yy);
    return yy;
  }

  // ---------------------------------------------------------------- pause & results
  private drawPause(ctx: Ctx): void {
    const v = this.v, m = this.m!, cx = v.w / 2;
    this.ui.scrim(ctx, v.w, v.h);
    const rows: { id: string; label: string; on: boolean; flip: () => void }[] = [
      { id: 'snd', label: 'Sound', on: this.meta.sound, flip: () => { this.meta.sound = !this.meta.sound; this.audio.sound = this.meta.sound; saveMeta(this.meta); } },
      { id: 'mus', label: 'Music', on: this.meta.music, flip: () => { this.meta.music = !this.meta.music; this.audio.setMusic(this.meta.music); saveMeta(this.meta); } },
    ];
    if (canFullscreen()) rows.push({ id: 'full', label: 'Full screen', on: isFullscreen(), flip: toggleFullscreen });
    const owned: [SkillId, number][] = [...m.weapons, ...m.passives];
    const w = Math.min(580, v.w - 60), rowH = 70;
    const h = 150 + (owned.length ? 84 : 0) + 110 + rows.length * rowH + 90;
    const r: Rect = { x: cx - w / 2, y: Math.max(v.safe.t + 70, v.h / 2 - h / 2 + 20), w, h };
    fancyPanel(ctx, r);
    ribbon(ctx, cx, r.y - 36, Math.min(380, w - 80), 'PAUSED', 'green');
    const SOFT = '#7a5f45';
    const rule = (y: number) => { ctx.strokeStyle = 'rgba(90,70,54,.3)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(r.x + 50, y); ctx.lineTo(r.x + w - 50, y + 1); ctx.stroke(); };

    // where the run stands, as one quiet line + the skills in hand
    let y = r.y + 82;
    const next = m.T.bossAt[m.bossesSpawned];
    const where = `${fmtTime(m.time)} survived  ·  Level ${m.level}  ·  ${next !== undefined ? 'next boss ' + fmtTime(next) : 'zone clear ' + fmtTime(m.T.runLength)}`;
    ctx.font = `italic 600 ${fitSize(ctx, where, 22, w - 70)}px "Alegreya", Georgia, serif`;
    ctx.fillStyle = SOFT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(where, cx, y);
    y += 34;
    if (owned.length) {
      const S = 56, gap = 12, tw = owned.length * S + (owned.length - 1) * gap;
      owned.forEach(([id], i) => ctx.drawImage(this.sprites.icon(id, SKILLS[id].color).img, cx - tw / 2 + i * (S + gap), y, S, S));
      y += 84;
    }

    // one primary action
    if (this.ui.button('resume', { x: r.x + 50, y, w: w - 100, h: 86 }, { label: 'RESUME', tone: 'gold' }, ctx)) this.resume();
    y += 86 + 30;

    // settings as rows with switches (not a stack of equal buttons)
    rule(y);
    for (const row of rows) {
      const rr: Rect = { x: r.x + 50, y, w: w - 100, h: rowH };
      text(ctx, row.label, rr.x + 6, y + rowH / 2, 26, INK, 'left', 700);
      this.toggleSwitch(ctx, rr.x + rr.w - 84, y + rowH / 2 - 20, row.on);
      this.ui.claimIfOver('row' + row.id, rr);
      const p = this.input.p;
      if (p.justUp && inside(rr, p.x, p.y) && inside(rr, p.downX, p.downY)) { row.flip(); this.audio.play('tap'); }
      y += rowH; rule(y);
    }

    // destructive action: quiet text link, never a button twin
    const qr: Rect = { x: cx - 110, y: y + 14, w: 220, h: 54 };
    text(ctx, 'Quit run', cx, qr.y + 27, 22, '#9a3a22', 'center', 700);
    this.ui.claimIfOver('quit', qr);
    if (this.input.p.justUp && inside(qr, this.input.p.x, this.input.p.y) && inside(qr, this.input.p.downX, this.input.p.downY)) {
      this.m!.status = 'dead';
      this.m!.revived = true;
      this.paused = false;
    }
    this.ui.swallow();
  }

  /** Hand-inked switch: muted green track when on, parchment when off, knob slides. */
  private toggleSwitch(ctx: Ctx, x: number, y: number, on: boolean): void {
    const w = 84, h = 40;
    ctx.fillStyle = INK; rrect(ctx, x - 3, y - 3, w + 6, h + 6, (h + 6) / 2); ctx.fill();
    ctx.fillStyle = on ? '#6f8f3a' : '#cdbb94'; rrect(ctx, x, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)'; rrect(ctx, x + 4, y + h * 0.55, w - 8, h * 0.35, h * 0.2); ctx.fill();
    const kx = on ? x + w - h / 2 : x + h / 2, ky = y + h / 2;
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(kx, ky, h / 2 + 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f3e6cc'; ctx.beginPath(); ctx.arc(kx, ky, h / 2 - 3, 0, Math.PI * 2); ctx.fill();
    text(ctx, on ? 'ON' : 'OFF', on ? x + 24 : x + w - 26, ky + 1, 15, on ? '#f3e6cc' : '#6a5440', 'center', 700);
  }

  private drawEdgeArrows(ctx: Ctx, m: Model): void {
    const v = this.v;
    const inset = 30, top = v.safe.t + 280, bottom = v.h - v.safe.b - 80;
    const left = v.safe.l + inset, right = v.w - v.safe.r - inset;
    const targets = [
      ...m.enemies.filter(e => !e.dead && (e.def.kind === 'boss' || e.def.kind === 'brute')).map(e => ({ x: e.x, y: e.y, color: e.def.kind === 'boss' ? '#ff625a' : '#ff9a3c' })),
      ...m.pickups.filter(p => p.kind === 'chest').map(p => ({ x: p.x, y: p.y, color: '#f0c060' })),
    ];
    const used: [number, number][] = [];
    for (const target of targets) {
      const [sx, sy] = this.w2s(target.x, target.y);
      if (sx >= 0 && sx <= v.w && sy >= 0 && sy <= v.h) continue;
      const cx = v.w / 2, cy = (top + bottom) / 2, dx = sx - cx, dy = sy - cy;
      const k = Math.min(dx > 0 ? (right - cx) / dx : dx < 0 ? (left - cx) / dx : Infinity, dy > 0 ? (bottom - cy) / dy : dy < 0 ? (top - cy) / dy : Infinity);
      const x = cx + dx * k, y = cy + dy * k;
      if (used.some(([ux, uy]) => Math.hypot(ux - x, uy - y) < 38)) continue;
      used.push([x, y]);
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(sy - y, sx - x));
      ctx.fillStyle = target.color; ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-12, -11); ctx.lineTo(-6, 0); ctx.lineTo(-12, 11); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }

  private cheapestUpgrade(): number {
    return Math.min(...CAMP_IDS.filter(id => this.meta.camp[id] < CAMP_MAX).map(id => campCost(id, this.meta.camp[id])));
  }

  private rewarded(action: () => void): void {
    if (this.busy || this.poki.adRunning) return;
    this.busy = true;
    void this.poki.rewardedBreak(on => this.audio.setSuspended(on)).then(ok => {
      this.busy = false;
      if (ok) action(); else this.toastUntil = this.time + 2.5;
    });
  }

  private drawResult(ctx: Ctx, m: Model): void {
    const v = this.v, won = m.status === 'won', cx = v.w / 2;
    const w = Math.min(660, v.w - 50);
    const missions = this.missionResults.slice(-3);
    const h = 760 + (missions.length ? 34 * missions.length + 20 : 0);
    const r: Rect = { x: cx - w / 2, y: Math.max(v.safe.t + 60, (v.h - h) / 2 + 24), w, h };
    this.ui.scrim(ctx, v.w, v.h); fancyPanel(ctx, r);
    ribbon(ctx, cx, r.y - 36, Math.min(470, w - 60), won ? 'ZONE CLEAR!' : 'KNOCKED OUT', won ? 'green' : 'red');
    const INKS = '#3a2a1e', SOFT = '#7a5f45', OCHRE = '#9a6a2a', RUST = '#9a3a22';
    const rule = (y: number, x0 = r.x + 56, x1 = r.x + w - 56) => {
      ctx.strokeStyle = 'rgba(90,70,54,.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo((x0 + x1) / 2, y + 2, x1, y - 1); ctx.stroke();
    };
    let y = r.y + 70;

    // cause + one tip, as type (no boxes)
    const names = ENEMY_NAMES[Math.min(m.zone, ENEMY_NAMES.length - 1)];
    const cause = m.lastHitBy;
    const heading = won ? 'You survived the swarm!' : cause ? 'Knocked out by ' + names[cause] : 'Run ended';
    text(ctx, heading, cx, y, fitSize(ctx, heading, 30, w - 70), INKS, 'center', 700);
    if (!won) {
      const tip = cause === 'spore' ? 'Thrown fire flies straight. Sidestep it.' : cause === 'boss' ? 'The boss charges in a line. Step aside.' : this.movedFor < 2 ? 'Keep moving!' : cause === 'wolf' ? 'Riders dash at you. Keep some space.' : cause === 'brute' || cause === 'beetle' ? 'Circle big enemies and keep collecting amber.' : 'Collect amber and pick stronger skills.';
      ctx.font = `italic 600 ${fitSize(ctx, tip, 22, w - 70)}px "Alegreya", Georgia, serif`;
      ctx.fillStyle = SOFT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(tip, cx, y + 36);
    }
    y += 82;
    rule(y);

    // stats: ink numbers on the paper, hairline separators
    y += 52;
    const stats = [{ label: 'SURVIVED', value: fmtTime(m.time) }, { label: 'LEVEL', value: String(m.level) }, { label: 'DEFEATED', value: String(m.kills) }];
    stats.forEach((st, i) => {
      const x = r.x + w * (i + 0.5) / 3;
      text(ctx, st.label, x, y - 24, 16, OCHRE, 'center', 700);
      ctx.font = `800 44px "Alegreya SC", "Alegreya", Georgia, serif`; ctx.fillStyle = INKS; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(st.value, x, y + 16);
      if (i) { ctx.strokeStyle = 'rgba(90,70,54,.3)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(r.x + w * i / 3, y - 34); ctx.lineTo(r.x + w * i / 3, y + 40); ctx.stroke(); }
    });
    y += 62;
    if (this.newBest && !won) text(ctx, 'NEW BEST TIME', cx, y, 18, RUST, 'center', 700);
    else if (won && m.zone + 1 < ZONES.length) text(ctx, ZONES[m.zone + 1].name.toUpperCase() + ' UNLOCKED', cx, y, 18, '#4a7a2e', 'center', 700);
    y += 26;
    rule(y);

    // coins earned: painted coin + big ink number, the optional x2 ad as a small plank beside it
    y += 56;
    const coinImg = this.sprites.image('hud-coin');
    const amount = '+' + this.banked * (this.doubled ? 2 : 1);
    ctx.font = `800 46px "Alegreya SC", "Alegreya", Georgia, serif`;
    const aw = ctx.measureText(amount).width;
    const hasAd = !this.doubled;
    const groupW = 52 + 14 + aw + (hasAd ? 28 + 200 : 0);
    let gx = cx - groupW / 2;
    if (coinImg) ctx.drawImage(coinImg, gx, y - 26, 52, 52);
    gx += 66;
    ctx.fillStyle = '#7a4e12'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(amount, gx, y + 2);
    gx += aw + 28;
    if (hasAd) {
      const dr: Rect = { x: gx, y: y - 32, w: 200, h: 64 };
      if (this.ui.button('double', dr, { label: 'x2 COINS', sub: 'watch ad', tone: 'blue', size: 24, disabled: this.busy, subIcon: (c, x, yy, sz) => this.clapper(c, x, yy, sz) }, ctx)) this.rewarded(() => {
        if (!this.doubled) { this.doubled = true; this.meta.coins += this.banked; saveMeta(this.meta); this.audio.play('chest'); }
      });
    }
    y += 58;

    // camp progress: one quiet line + a thin framed bar
    const cost = this.cheapestUpgrade();
    const upgrade = Number.isFinite(cost) ? this.meta.coins >= cost ? 'An upgrade is ready at the camp' : (cost - this.meta.coins) + ' more coins to the next upgrade' : 'All camp upgrades complete';
    text(ctx, upgrade, cx, y, fitSize(ctx, upgrade, 20, w - 80), SOFT, 'center', 600);
    y += 26;
    bar(ctx, { x: r.x + 90, y, w: w - 180, h: 10 }, Number.isFinite(cost) ? Math.min(1, this.meta.coins / cost) : 1, '#d89a3a');
    y += 34;

    // missions: one line each, check mark + label + reward, no shouting
    if (missions.length) {
      rule(y); y += 30;
      for (const mi of missions) {
        const label = missionLabel(mi);
        ctx.strokeStyle = '#4a7a2e'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(r.x + 70, y); ctx.lineTo(r.x + 77, y + 7); ctx.lineTo(r.x + 91, y - 8); ctx.stroke();
        text(ctx, label, r.x + 104, y, fitSize(ctx, label, 20, w - 260), INKS, 'left', 600);
        text(ctx, '+' + mi.reward, r.x + w - 70, y, 20, '#7a4e12', 'right', 700);
        y += 34;
      }
      y += 6;
    }

    // actions: one primary (gold RETRY), then camp + revive
    y += 6;
    const retry: Rect = { x: r.x + 56, y, w: w - 112, h: Math.max(96, 44 / v.scale) };
    ctx.save(); const pulse = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 1 + Math.sin(this.time * 3) * 0.008;
    ctx.translate(cx, retry.y + retry.h / 2); ctx.scale(pulse, pulse); ctx.translate(-cx, -retry.y - retry.h / 2);
    const again = this.ui.button('retry', retry, { label: won ? 'NEXT ZONE' : 'RETRY', tone: 'gold', disabled: this.busy }, ctx); ctx.restore();
    const bw = (w - 112 - 20) / 2, bh = Math.max(80, 44 / v.scale);
    const camp: Rect = { x: r.x + 56, y: retry.y + retry.h + 26, w: bw, h: bh };
    const rev: Rect = { x: camp.x + bw + 20, y: camp.y, w: bw, h: bh };
    const showRevive = !won && !m.revived;
    const campRect = showRevive ? camp : { ...camp, x: cx - bw / 2 };
    const toCamp = this.ui.button('camp', campRect, { label: 'CAMP', tone: 'stone', disabled: this.busy }, ctx);
    if (showRevive && this.ui.button('revive', rev, { label: 'REVIVE', tone: 'blue', sub: 'watch ad', disabled: this.busy, subIcon: (c, x, yy, sz) => this.clapper(c, x, yy, sz) }, ctx)) this.rewarded(() => {
      if (m.revive()) { this.result = null; this.poki.gameplayStart(); this.audio.play('super'); this.fx.shake(0.8, 0.4); }
    });
    if (toCamp) { this.screen = 'camp'; this.m = null; }
    if (again) {
      if (won && m.zone + 1 < ZONES.length) this.meta.zone = m.zone + 1;
      saveMeta(this.meta); this.newRun(m.time >= 20);
    }
    this.ui.swallow();
  }

  /** Small film-clapper glyph: Poki's "this plays an ad" marker. */
  private clapper(c: Ctx, x: number, y: number, s: number): void {
    const w = s * 1.1, h = s * 0.8;
    c.save();
    c.translate(x, y);
    c.fillStyle = '#f3e6cc'; c.strokeStyle = INK; c.lineWidth = 2;
    rrect(c, -w / 2, -h / 2 + h * 0.25, w, h * 0.75, 3); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-w / 2, -h / 2 + h * 0.2); c.lineTo(w / 2, -h / 2 - h * 0.05); c.lineTo(w / 2, -h / 2 + h * 0.12); c.lineTo(-w / 2, -h / 2 + h * 0.37); c.closePath(); c.fill(); c.stroke();
    c.restore();
  }

  // ================================================================ menu
  private menuSpecies = 0;
  private pressedCard = '';

  private drawMenu(ctx: Ctx): void {
    this.clipsFor(this.meta.zone);  // start loading the chosen zone's enemies while the player is still on the menu
    const v = this.v;
    const meta = this.meta;
    // living backdrop: slow-scrolling ground
    ctx.save();
    ctx.translate(-((this.time * 30) % 512), -((this.time * 12) % 512));
    ctx.fillStyle = this.groundFor(meta.zone);
    ctx.fillRect(0, 0, v.w + 1024, v.h + 1024);
    ctx.restore();
    const g = ctx.createLinearGradient(0, 0, 0, v.h);
    g.addColorStop(0, 'rgba(20,12,6,.35)'); g.addColorStop(0.5, 'rgba(20,12,6,0)'); g.addColorStop(1, 'rgba(20,12,6,.45)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, v.w, v.h);

    const s = v.safe;
    const land = v.w / v.h > 1.1;
    const cx = v.w / 2;
    // title (logo-style: thick outline + drop)
    const ty = s.t + (land ? 110 : 170);
    const logo = this.sprites.image('logo-plate');
    if (logo) {
      const lw = Math.min(land ? 560 : 640, v.w - 60), lh = (lw * logo.naturalHeight) / logo.naturalWidth;
      const sway = Math.sin(this.time * 1.3) * 0.012;
      ctx.save(); ctx.translate(cx, s.t + 6); ctx.rotate(sway);
      ctx.drawImage(logo, -lw / 2, 0, lw, lh);
      ctx.restore();
    } else {
      outlinedText(ctx, 'PITCHFORK & POT', cx, ty, 80, '#f3e6cc', INK, 'center');
    }

    // species picker
    const ids = SPECIES_IDS;
    const cur = ids.indexOf(meta.species);
    if (this.menuSpecies !== cur) this.menuSpecies = cur;
    const sp = SPECIES[meta.species];
    const unlocked = speciesUnlocked(meta, sp.id);
    const dy = land ? v.h * 0.55 : v.h * 0.47;
    const dino = this.sprites.dino(sp.id, 0);
    ctx.fillStyle = 'rgba(30,20,10,.25)';
    ctx.beginPath(); ctx.ellipse(cx, dy + 10, 90, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    if (!unlocked) ctx.filter = 'brightness(0) opacity(.6)';
    if (this.hero.ready) {
      this.hero.update(1 / 60, false);
      this.hero.draw(ctx, cx, dy + 10, 230, 1, false, 0, 1);
    } else this.blit(ctx, dino, cx, dy + Math.sin(this.time * 2.4) * 3, 2.1, 1, 1, 0, 0);
    ctx.restore();
    outlinedText(ctx, sp.name.toUpperCase(), cx, dy + 50, 40, '#f6ead0', INK, 'center');
    const blurb = unlocked ? sp.blurb : `Clear ${ZONES[sp.unlockZone].name} to unlock`;
    outlinedText(ctx, blurb, cx, dy + 92, fitSize(ctx, blurb, 24, v.w - 80), unlocked ? '#f3d79a' : '#ffb0a0', INK, 'center');
    const ar = 74;
    // Only one hero for now: the picker shows up once a second one is unlocked.
    const pickable = ids.filter((id) => speciesUnlocked(meta, id)).length > 1;
    for (const dir of pickable ? [-1, 1] : []) {
      const r: Rect = { x: cx + dir * 230 - ar / 2, y: dy - 120, w: ar, h: ar };
      if (this.ui.button('sp' + dir, r, { label: dir < 0 ? '<' : '>', tone: 'stone', size: 40 }, ctx)) {
        const next = ids[(cur + dir + ids.length) % ids.length];
        meta.species = next;
        saveMeta(meta);
        this.audio.play('tap');
      }
    }

    // zone picker
    const zy = dy + 140;
    const zname = ZONES[meta.zone].name;
    outlinedText(ctx, zname, cx, zy + 30, 30, '#f6ead0', INK, 'center');
    text(ctx, meta.best[meta.zone] ? `Best ${fmtTime(meta.best[meta.zone])}` : 'ZONE', cx, zy - 2, 18, '#f3d79a', 'center', 700);
    for (const dir of [-1, 1]) {
      const nz = meta.zone + dir;
      const ok = nz >= 0 && nz < ZONES.length && zoneUnlocked(meta, nz);
      const r: Rect = { x: cx + dir * 200 - 28, y: zy, w: 56, h: 56 };
      if (this.ui.button('zn' + dir, r, { label: dir < 0 ? '<' : '>', tone: 'stone', size: 30, disabled: !ok }, ctx)) {
        meta.zone = nz; saveMeta(meta); this.audio.play('tap');
      }
    }

    const by = Math.min(v.h - s.b - 230, zy + 110);
    const pw = Math.min(440, v.w - 80);
    if (this.ui.button('play', { x: cx - pw / 2, y: by, w: pw, h: 104 }, { label: 'PLAY', tone: 'gold', size: 52, disabled: !unlocked }, ctx)) {
      this.newRun(true);
    }
    if (this.ui.button('tocamp', { x: cx - pw / 2, y: by + 130, w: pw, h: 76 }, {
      label: 'CAMP', sub: `${meta.coins}`, tone: 'stone', subIcon: (c, x, y, sz) => this.blit(c, this.sprites.pickup('coin'), x, y + sz * 0.4, sz / 24, 1, 1, 0, 0),
    }, ctx)) this.screen = 'camp';

    const mx = land ? s.l + 40 : cx - Math.min(640, v.w - 80) / 2;
    const my = land ? v.h * 0.4 : by + 245;
    const mw = land ? Math.min(420, cx - 330) : Math.min(640, v.w - 80);
    text(ctx, 'MISSIONS', mx, my, 24, '#f3d79a', 'left', 700);
    meta.missions.forEach((mission, i) => {
      const y = my + 45 + i * 82;
      const label = missionLabel(mission);
      outlinedText(ctx, label, mx, y, fitSize(ctx, label, 24, mw), '#f6ead0', INK, 'left');
      text(ctx, `${mission.progress}/${mission.target}   +${mission.reward} coins`, mx, y + 28, 20, '#f3d79a');
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(mx, y + 49, mw, 3);
      ctx.fillStyle = '#f0c060'; ctx.fillRect(mx, y + 49, mw * Math.min(1, mission.progress / mission.target), 3);
    });

    // sound toggle (top-right)
    const sr: Rect = { x: v.w - s.r - 16 - 64, y: s.t + 14, w: 64, h: 64 };
    const sndImg = this.sprites.image('hud-sound');
    let sndClick = false;
    if (sndImg) {
      const hit = this.touchRect(sr);
      this.ui.claimIfOver('menusnd', hit);
      const p = this.input.p;
      ctx.save(); if (!meta.sound) ctx.globalAlpha = 0.45; ctx.drawImage(sndImg, sr.x, sr.y, sr.w, sr.h); ctx.restore();
      if (!meta.sound) { ctx.strokeStyle = '#c8442e'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sr.x + 12, sr.y + 12); ctx.lineTo(sr.x + sr.w - 12, sr.y + sr.h - 12); ctx.stroke(); }
      sndClick = p.justUp && inside(hit, p.x, p.y) && inside(hit, p.downX, p.downY);
    } else sndClick = this.ui.iconButton('menusnd', sr, ctx, () => this.speaker(ctx, sr, meta.sound));
    if (sndClick) { meta.sound = !meta.sound; this.audio.sound = meta.sound; saveMeta(meta); }
    if (canFullscreen()) this.fullscreenButton(ctx, 'menufull', { x: sr.x - 64 - 14, y: sr.y, w: 64, h: 64 });
  }

  /** Painted wooden plate (same family as pause/sound); F also toggles it on desktop. */
  private fullscreenButton(ctx: Ctx, id: string, r: Rect): void {
    const img = this.sprites.image('hud-full');
    const hit = this.touchRect(r);
    this.ui.claimIfOver(id, hit);
    const p = this.input.p;
    const pressed = p.down && inside(hit, p.x, p.y) && inside(hit, p.downX, p.downY);
    ctx.save();
    if (pressed) { ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(0.94, 0.94); ctx.translate(-r.x - r.w / 2, -r.y - r.h / 2); }
    if (img) ctx.drawImage(img, r.x, r.y, r.w, r.h);
    else {
      ctx.strokeStyle = '#f3e6cc'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const cx = r.x + r.w / 2 + sx * 14, cy = r.y + r.h / 2 + sy * 14;
        ctx.beginPath(); ctx.moveTo(cx, cy - sy * 9); ctx.lineTo(cx, cy); ctx.lineTo(cx - sx * 9, cy); ctx.stroke();
      }
    }
    ctx.restore();
    if (p.justUp && inside(hit, p.x, p.y) && inside(hit, p.downX, p.downY)) toggleFullscreen();
  }

  /** Grow a small painted control's tap area to at least 44 CSS px (the art keeps its size). */
  private touchRect(r: Rect): Rect {
    const need = 44 / this.v.scale, gx = Math.max(0, (need - r.w) / 2), gy = Math.max(0, (need - r.h) / 2);
    return { x: r.x - gx, y: r.y - gy, w: r.w + gx * 2, h: r.h + gy * 2 };
  }

  private speaker(ctx: Ctx, r: Rect, on: boolean): void {
    const x = r.x + 26, y = r.y + 32;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 12, y - 7); ctx.lineTo(x - 4, y - 7); ctx.lineTo(x + 6, y - 15); ctx.lineTo(x + 6, y + 15); ctx.lineTo(x - 4, y + 7); ctx.lineTo(x - 12, y + 7); ctx.closePath();
    ctx.fill(); ctx.stroke();
    if (!on) { ctx.strokeStyle = '#e8402f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + 12, y - 10); ctx.lineTo(x + 24, y + 10); ctx.moveTo(x + 24, y - 10); ctx.lineTo(x + 12, y + 10); ctx.stroke(); }
    else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 16, y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  }

  // ================================================================ camp
  private drawCamp(ctx: Ctx): void {
    const v = this.v, meta = this.meta, s = v.safe;
    ctx.fillStyle = this.groundFor(meta.zone);
    ctx.fillRect(0, 0, v.w, v.h);
    this.ui.scrim(ctx, v.w, v.h);
    const land = v.w > 1300;
    const INKS = '#3a2a1e', SOFT = '#7a5f45', OCHRE = '#9a6a2a';

    // landscape: Pip waits by the panel, so the camp feels like a place and not a form
    const heroW = land ? Math.min(460, v.w * 0.27) : 0;
    if (land && this.hero.ready) {
      const hx = s.l + heroW / 2 + 30, hy = v.h * 0.72;
      ctx.fillStyle = 'rgba(20,14,8,.35)'; ctx.beginPath(); ctx.ellipse(hx, hy, 110, 26, 0, 0, Math.PI * 2); ctx.fill();
      this.hero.update(1 / 60, false);
      this.hero.draw(ctx, hx, hy, 330, 1, false, 0, 1);
      outlinedText(ctx, 'Upgrades last', hx, hy + 70, 26, '#f3d79a', INK, 'center');
      outlinedText(ctx, 'for every run', hx, hy + 102, 26, '#f3d79a', INK, 'center');
    }

    const cols = land ? 2 : 1, rowsN = Math.ceil(CAMP_IDS.length / cols);
    const cellH = land ? 168 : 136;
    const w = land ? Math.min(1080, v.w - heroW - 100) : Math.min(680, v.w - 40);
    const h = 150 + rowsN * cellH + 30;
    const px = land ? s.l + heroW + 50 + (v.w - s.l - s.r - heroW - 50 - w) / 2 : v.w / 2 - w / 2;
    const r: Rect = { x: px, y: Math.max(s.t + 70, (v.h - h - 110) / 2 + 30), w, h };
    fancyPanel(ctx, r);
    ribbon(ctx, r.x + w / 2, r.y - 36, Math.min(360, w - 80), 'CAMP', 'green');

    // purse: painted coin + ink number, top right of the paper (no pill)
    const coinImg = this.sprites.image('hud-coin');
    ctx.font = `800 40px "Alegreya SC", "Alegreya", Georgia, serif`;
    const cw = ctx.measureText(String(meta.coins)).width;
    if (coinImg) ctx.drawImage(coinImg, r.x + w - 56 - cw - 54, r.y + 58, 46, 46);
    ctx.fillStyle = '#7a4e12'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(String(meta.coins), r.x + w - 50, r.y + 83);
    if (!land) {
      ctx.font = `italic 600 22px "Alegreya", Georgia, serif`; ctx.fillStyle = SOFT; ctx.textAlign = 'left';
      ctx.fillText('Upgrades last for every run', r.x + 50, r.y + 83);
    } else text(ctx, 'YOUR COINS', r.x + w - 50 - cw - 64, r.y + 83, 16, OCHRE, 'right', 700);

    const gx = r.x + 40, gy = r.y + 130, gw = (w - 80) / cols;
    ctx.strokeStyle = 'rgba(90,70,54,.3)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + w - 80, gy + 1); ctx.stroke();
    CAMP_IDS.forEach((id, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = gx + col * gw, y = gy + row * cellH;
      const c = CAMP[id], lv = meta.camp[id], max = lv >= CAMP_MAX;
      const ic = CAMP_ICON[id];
      const isz = land ? 84 : 76;
      ctx.drawImage(this.sprites.icon(ic, ic === 'gold' ? '#f0c060' : SKILLS[ic].color).img, x + 14, y + cellH / 2 - isz / 2, isz, isz);
      const tx = x + 14 + isz + 22;
      text(ctx, c.name, tx, y + cellH / 2 - 40, 30, INKS, 'left', 700);
      // level as inked diamonds (same language as the level-up cards)
      for (let k = 0; k < CAMP_MAX; k++) {
        const dx = tx + 8 + k * 20, dy = y + cellH / 2 - 6, d = 7;
        ctx.beginPath(); ctx.moveTo(dx, dy - d - 1.5); ctx.lineTo(dx + d + 1.5, dy); ctx.lineTo(dx, dy + d + 1.5); ctx.lineTo(dx - d - 1.5, dy); ctx.closePath();
        ctx.fillStyle = INK; ctx.fill();
        ctx.beginPath(); ctx.moveTo(dx, dy - d + 1); ctx.lineTo(dx + d - 1, dy); ctx.lineTo(dx, dy + d - 1); ctx.lineTo(dx - d + 1, dy); ctx.closePath();
        ctx.fillStyle = k < lv ? '#e8b04a' : '#e2d3b0'; ctx.fill();
      }
      // what it gives now, and what the next level adds
      const now = lv > 0 ? campEffect(id, lv) : 'Not trained yet';
      const room = x + gw - 14 - 150 - 14 - tx;
      text(ctx, now, tx, y + cellH / 2 + 28, fitSize(ctx, now, 21, room), lv > 0 ? INKS : SOFT, 'left', 600);
      if (!max) text(ctx, 'Next: ' + campEffect(id, lv + 1), tx, y + cellH / 2 + 56, fitSize(ctx, 'Next: ' + campEffect(id, lv + 1), 19, room), '#4a7a2e', 'left', 700);
      // price: a small plank; gold only when you can buy it now
      const br: Rect = { x: x + gw - 14 - 150, y: y + cellH / 2 - 32, w: 150, h: 64 };
      if (max) text(ctx, 'MASTERED', br.x + br.w / 2, br.y + 32, 20, OCHRE, 'center', 700);
      else {
        const cost = campCost(id, lv), can = meta.coins >= cost;
        if (this.ui.button('buy' + id, br, { label: String(cost), tone: can ? 'gold' : 'stone', size: 28, disabled: !can }, ctx)) {
          if (buyCamp(meta, id)) { saveMeta(meta); this.audio.play('unlock'); }
        }
      }
      if (row < rowsN - 1) { ctx.strokeStyle = 'rgba(90,70,54,.22)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 10, y + cellH); ctx.lineTo(x + gw - 10, y + cellH); ctx.stroke(); }
    });
    if (land) { ctx.strokeStyle = 'rgba(90,70,54,.22)'; ctx.beginPath(); ctx.moveTo(gx + gw, gy + 20); ctx.lineTo(gx + gw, gy + rowsN * cellH - 20); ctx.stroke(); }

    const bw = 280;
    if (this.ui.button('back', { x: r.x + w / 2 - bw / 2, y: Math.min(v.h - s.b - 96, r.y + h + 22), w: bw, h: 80 }, { label: 'BACK', tone: 'stone' }, ctx)) {
      this.screen = 'menu';
    }
    this.ui.swallow();
  }
}

/** Camp upgrade effect at a level, written like its card text ("+16% damage", "-2 damage taken"). */
function campEffect(id: CampId, lv: number): string {
  const c = CAMP[id];
  const n = c.step < 1 ? Math.round(c.step * lv * 100) : c.step * lv;
  return c.text.replace(/\d+/, String(n));
}

