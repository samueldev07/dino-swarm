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
  SKILLS, SPECIES, SPECIES_IDS, ZONES, CAMP, CAMP_IDS, CAMP_MAX, campCost, MAX_LEVEL, METEOR_DELAY,
  EVOLUTIONS, isWeapon,
  type SkillId, type CampId, type EnemyKind,
} from './config';
import { Sprites, type Sprite } from './sprites';
import { Fx } from './fx';
import { UI, type Rect, inside, fancyPanel, ribbon, goldPill, outlinedText, fitSize, text, bar } from './ui';
import { INK, fontFor, rrect } from './draw';
import { type Meta, loadMeta, saveMeta, speciesUnlocked, zoneUnlocked, buyCamp } from './meta';

import { progressMissions, claimMissions, missionLabel, type Mission } from './missions';

type Ctx = CanvasRenderingContext2D;
type Screen = 'menu' | 'run' | 'camp';

interface Dying { s: Sprite; x: number; y: number; scale: number; t: number; flip: number }
interface Banner { text: string; sub: string; t: number; color: string }

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
  private banner: Banner | null = null;
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
      this.banner = null;
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
      if (o) this.fx.ring(m.px, m.py, SKILLS[o.id as SkillId]?.color ?? '#ffe28a', 22, 70);
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

    this.cam.z = Math.max(0.7, Math.min(1.6, Math.sqrt((this.v.w * this.v.h) / (1200 * 700))));
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
      if (m.status === 'ready' && kl > 0.2) { m.start(); this.poki.gameplayStart(); }
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
    for (let i = this.dying.length - 1; i >= 0; i--) {
      this.dying[i].t += dt;
      if (this.dying[i].t > 0.22) this.dying.splice(i, 1);
    }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 2.4) this.banner = null; }
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
        if (e.crit || e.boss) this.fx.floater(e.x, e.y, String(e.dmg), e.crit ? '#ffd24a' : '#fff', e.crit ? 30 : 22);
        if (e.crit) a.play('crit');
        else a.play('hit');
        if (e.boss) this.fx.burst(e.x, e.y + 20, '#fff2c0', 4, 160);
        break;
      case 'kill': {
        if (this.firstRun && !this.taughtAmber) {
          this.taughtAmber = true; this.amberT = 3;
          this.showBanner('Collect amber to LEVEL UP!', '', '#ffd24a');
        }
        const s = this.sprites.enemy(e.kind, m.zone);
        this.dying.push({ s, x: e.x, y: e.y, scale: this.enemyScale(e.kind, s), t: 0, flip: 1 });
        this.fx.burst(e.x, e.y - 14, e.kind === 'boss' ? '#ffd24a' : '#e8dcc0', e.kind === 'boss' ? 40 : 6, e.kind === 'boss' ? 420 : 170);
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
      case 'coin': a.play('buy'); this.fx.floater(e.x, e.y - 20, `+${e.n}`, '#ffd24a', 22); break;
      case 'heal': a.play('lucky'); this.fx.floater(m.px, m.py - 70, `+${e.n}`, '#7bdc5a', 28); break;
      case 'magnet': a.play('ready'); this.showBanner('AMBER MAGNET!', 'All amber flies to you', '#ffd24a'); break;
      case 'chest': {
        a.play('chest');
        this.fx.ring(m.px, m.py, '#ffd24a', 30, 90);
        const o = e.offer;
        const name = o.id === 'heal' ? 'Healing' : o.id === 'gold' ? 'Gold' : SKILLS[o.id].name;
        this.showBanner('TREASURE!', o.level > 0 ? `${name} → LV ${o.level}` : name, '#ffd24a');
        break;
      }
      case 'level': a.play('unlock'); this.fx.ring(m.px, m.py, '#ffe28a', 24, 80); break;
      case 'evolve': {
        a.play('super');
        this.evolveT = 1.3;
        this.fx.ring(m.px, m.py, '#fff2a0', 36, 120);
        this.fx.burst(m.px, m.py - 40, '#ffd24a', 40, 380);
        this.fx.shake(0.8, 0.4);
        const sp = SPECIES[m.species];
        this.showBanner('EVOLVED!', sp.forms[e.form], '#ffd24a');
        break;
      }
      case 'weaponEvolve':
        a.play('super'); this.fx.burst(m.px, m.py - 40, '#ffd24a', 40, 380);
        this.fx.shake(0.8, 0.4); this.showBanner('EVOLVED!', e.name, '#ffd24a'); break;
      case 'fire':
        if (e.w === 'stomp') { a.play('thud'); this.fx.burst(m.px, m.py, '#c8a070', 10, 260); }
        else if (e.w === 'roar') a.play('combo');
        else if (e.w === 'bite') a.play('cast');
        break;
      case 'meteor':
        a.play('thud');
        this.fx.shake(0.35, 0.18);
        this.fx.burst(e.x, e.y, '#ff9a3c', 14, 300);
        this.fx.burst(e.x, e.y, '#6a5a50', 8, 220);
        break;
      case 'boss': a.play('boss'); this.fx.shake(0.6, 0.6); this.showBanner('BOSS INCOMING!', 'Keep moving!', '#ff6a5a'); break;
      case 'bossDead': a.play('win'); this.fx.shake(1, 0.6); this.showBanner('BOSS DEFEATED!', 'Grab the treasure', '#7bdc5a'); break;
      case 'wave':
        if (e.kind === 'ring') this.showBanner('SURROUNDED!', 'Break out of the ring', '#ff9a3c');
        else if (e.kind === 'stream') this.showBanner('A SWARM IS COMING!', '', '#ff9a3c');
        else this.showBanner('A BRUTE APPEARS', 'It drops a treasure chest', '#ffd24a');
        break;
      case 'win': a.play('win'); break;
      case 'dead': a.play('ko'); this.fx.shake(1, 0.5); break;
    }
  }

  private showBanner(t: string, sub: string, color: string): void {
    this.banner = { text: t, sub, t: 0, color };
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

    // red vignette at low HP / on hits
    const low = m.hp / m.maxHp < 0.3 ? 0.35 + Math.sin(this.time * 6) * 0.12 : 0;
    const vig = Math.max(low, this.hurtT * 1.6);
    if (vig > 0) {
      const g = ctx.createRadialGradient(v.w / 2, v.h / 2, Math.min(v.w, v.h) * 0.35, v.w / 2, v.h / 2, Math.max(v.w, v.h) * 0.7);
      g.addColorStop(0, 'rgba(200,30,20,0)');
      g.addColorStop(1, `rgba(200,30,20,${Math.min(0.55, vig)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, v.w, v.h);
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

    if (this.time < this.toastUntil) outlinedText(ctx, 'No ad available right now', v.w / 2, v.safe.t + 230, fitSize(ctx, 'No ad available right now', 28, v.w - 60), '#fff', INK, 'center');
    // Joystick starts on any press no button claimed.
    const p = this.input.p;
    if (p.justDown && !this.ui.claimed && !m.offers && !this.paused && !this.result && !this.busy && !this.poki.adRunning) {
      this.joy.on = true;
      this.joy.bx = this.joy.kx = p.x;
      this.joy.by = this.joy.ky = p.y;
    }
    if (this.joy.on) this.drawJoystick(ctx);
  }

  // ---------------------------------------------------------------- world
  private w2s(x: number, y: number): [number, number] {
    const v = this.v;
    return [(x - this.cam.x) * this.cam.z + v.w / 2, (y - this.cam.y) * this.cam.z + v.h / 2];
  }

  private enemyScale(kind: EnemyKind, s: Sprite): number {
    const r = { grub: 18, bat: 15, beetle: 25, wolf: 20, shroom: 19, brute: 38, boss: 62 }[kind];
    return (r * 2.9) / s.w;
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

    ctx.fillStyle = this.ground[m.zone];
    ctx.fillRect(L, T, R - L, B - T);

    // thorn patches (ground layer)
    const thorn = this.sprites.thorn();
    for (const t of m.thorns) {
      if (!vis(t.x, t.y, 60)) continue;
      ctx.globalAlpha = Math.min(0.85, t.life * 1.5);
      const s = (t.r * 1.7) / thorn.w;
      ctx.drawImage(thorn.img, t.x - thorn.w * s / 2, t.y - thorn.h * s / 2, thorn.w * s, thorn.h * s);
    }
    ctx.globalAlpha = 1;

    // meteor + boss telegraphs on the ground
    for (const mt of m.meteors) {
      const k = 1 - mt.t / METEOR_DELAY;
      ctx.fillStyle = `rgba(255,80,40,${0.12 + k * 0.18})`;
      ctx.beginPath(); ctx.arc(mt.x, mt.y, mt.r * k, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(200,40,20,.7)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(mt.x, mt.y, mt.r, mt.r * 0.9, 0, 0, Math.PI * 2); ctx.stroke();
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
      const s = this.sprites.gem(g.value);
      const bob = g.flying ? 0 : Math.sin(this.time * 4 + g.x * 0.05) * 2.5;
      this.blit(ctx, s, g.x, g.y + bob, 1, 1, 1, 0, 0);
    }
    for (const pk of m.pickups) {
      if (!vis(pk.x, pk.y)) continue;
      const s = this.sprites.pickup(pk.kind);
      const bob = Math.sin(this.time * 3.5 + pk.x) * 3;
      if (pk.kind === 'chest') {
        ctx.fillStyle = `rgba(255,220,80,${0.25 + Math.sin(this.time * 5) * 0.1})`;
        ctx.beginPath(); ctx.ellipse(pk.x, pk.y, 46, 18, 0, 0, Math.PI * 2); ctx.fill();
      }
      this.blit(ctx, s, pk.x, pk.y + bob, 1, 1, 1, 0, 0);
    }

    if (this.amberT > 0 && m.gems.length) {
      const gem = m.gems.reduce((a, b) => Math.hypot(a.x - m.px, a.y - m.py) < Math.hypot(b.x - m.px, b.y - m.py) ? a : b);
      ctx.strokeStyle = '#ffe28a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(gem.x, gem.y, 24 + Math.sin(this.time * 7) * 5, 0, Math.PI * 2); ctx.stroke();
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
    const pr = m.playerRadius;
    ctx.moveTo(m.px + pr * 1.3, m.py);
    ctx.ellipse(m.px, m.py, pr * 1.3, pr * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    // y-sorted bodies
    const list: Enemy[] = [];
    for (const e of m.enemies) if (vis(e.x, e.y, e.r * 3)) list.push(e);
    list.sort((a, b) => a.y - b.y);
    let drewPlayer = false;
    for (const e of list) {
      if (!drewPlayer && e.y > m.py) { this.drawPlayer(ctx, m); drewPlayer = true; }
      this.drawEnemy(ctx, m, e);
    }
    if (!drewPlayer) this.drawPlayer(ctx, m);

    for (const d of this.dying) {
      const k = d.t / 0.22;
      ctx.globalAlpha = 1 - k;
      this.blit(ctx, d.s, d.x, d.y, d.scale, 1 + k * 0.5, 1 - k * 0.7, 0, 0.6);
    }
    ctx.globalAlpha = 1;

    // orbiting eggs
    const egg = this.sprites.egg();
    for (const o of m.orbitPositions()) this.blit(ctx, egg, o.x, o.y + 10, 1.1, 1, 1, this.time * 6, 0);

    this.drawProjectiles(ctx, m);
    this.drawSlashes(ctx, m);
    this.drawWaves(ctx, m);

    // falling meteors
    for (const mt of m.meteors) {
      const k = 1 - mt.t / METEOR_DELAY;
      const x = mt.x - 260 * (1 - k), y = mt.y - 620 * (1 - k);
      ctx.strokeStyle = 'rgba(255,170,60,.55)'; ctx.lineWidth = 16;
      ctx.beginPath(); ctx.moveTo(x - 60, y - 140); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a6a5a'; ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff9a3c'; ctx.beginPath(); ctx.arc(x - 4, y - 5, 7, 0, Math.PI * 2); ctx.fill();
    }

    this.fx.draw(ctx);
    ctx.restore();
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

  private drawEnemy(ctx: Ctx, m: Model, e: Enemy): void {
    const s = this.sprites.enemy(e.def.kind, m.zone);
    const sc = this.enemyScale(e.def.kind, s) * (e.elite ? 1.3 : 1);
    if (e.elite) {
      ctx.save(); ctx.strokeStyle = '#ffd75a'; ctx.lineWidth = 2; ctx.shadowColor = '#ffd75a'; ctx.shadowBlur = 7;
      ctx.beginPath(); ctx.ellipse(e.x, e.y - e.r, e.r * 1.5, e.r * 1.65, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    const walk = e.stun > 0 ? 0 : e.age * (e.def.flutter ? 18 : 11);
    let y = e.y - Math.abs(Math.sin(walk)) * (e.def.flutter ? 6 : 3) - (e.def.flutter ? 14 : 0);
    let x = e.x;
    let sx = 1 + Math.sin(walk * 2) * 0.04, sy = 1 - Math.sin(walk * 2) * 0.04;
    if (e.mode === 1) { x += Math.sin(this.time * 70) * 3; sx = 1.12; sy = 0.88; }
    if (e.stun > 0) y += 0;
    this.blit(ctx, s, x, y, sc, sx, sy, e.mode === 2 ? 0 : Math.sin(walk) * 0.05, e.flash > 0 ? e.flash * 8 : e.mode === 1 ? 0.35 : 0, e.facing);
    if (e.stun > 0) {
      ctx.fillStyle = '#ffe28a'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
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
    ctx.globalAlpha = blink ? 0.55 : 1;
    this.blit(ctx, s, m.px, m.py - bob, sc * evo, 1 - sq, 1 + sq, moving ? m.mx * 0.08 * flip : 0, this.evolveT > 0.9 ? 1 : 0, flip);
    ctx.globalAlpha = 1;
    // HP bar under the feet (green: never shares a hue with enemy bars)
    const w = 64;
    const r: Rect = { x: m.px - w / 2, y: m.py + 14, w, h: 9 };
    ctx.fillStyle = INK; rrect(ctx, r.x - 2, r.y - 2, r.w + 4, r.h + 4, 6); ctx.fill();
    ctx.fillStyle = '#ffffff'; rrect(ctx, r.x, r.y, r.w * this.lagHp, r.h, 4); ctx.fill();
    ctx.fillStyle = m.hp / m.maxHp < 0.3 ? '#ff8a3a' : '#5ad04a';
    rrect(ctx, r.x, r.y, Math.max(4, r.w * m.hp / m.maxHp), r.h, 4); ctx.fill();
  }

  private drawProjectiles(ctx: Ctx, m: Model): void {
    const bone = this.sprites.bone();
    for (const p of m.projs) {
      if (p.kind === 'bone') { this.blit(ctx, bone, p.x, p.y, 1.1, 1, 1, p.age * 16, 0); continue; }
      if (p.kind === 'spit') {
        const sp = Math.hypot(p.vx, p.vy) || 1;
        const ux = p.vx / sp, uy = p.vy / sp;
        for (let i = 3; i >= 1; i--) {
          ctx.fillStyle = `rgba(255,${120 + i * 30},40,${0.5 - i * 0.12})`;
          ctx.beginPath(); ctx.arc(p.x - ux * i * 12, p.y - uy * i * 12, p.r * (1.1 - i * 0.18), 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.35 + 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff6a2c'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(p.x - 2, p.y - 2, p.r * 0.75, 0, Math.PI * 2); ctx.fill();
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

  private drawWaves(ctx: Ctx, m: Model): void {
    for (const w of m.waves) {
      const k = w.age / w.life;
      const r = w.r * (0.2 + 0.8 * Math.sqrt(k));
      ctx.globalAlpha = 1 - k;
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

    // XP bar + level medallion
    const lvR = 34;
    const xr: Rect = { x: left + lvR, y: top + 14, w: pauseR.x - 16 - left - lvR, h: 22 };
    ctx.fillStyle = INK; rrect(ctx, xr.x - 3, xr.y - 3, xr.w + 6, xr.h + 6, 14); ctx.fill();
    ctx.fillStyle = '#3e3028'; rrect(ctx, xr.x, xr.y, xr.w, xr.h, 11); ctx.fill();
    const pct = Math.min(1, m.xp / m.xpNeed);
    if (pct > 0) {
      const g = ctx.createLinearGradient(0, xr.y, 0, xr.y + xr.h);
      g.addColorStop(0, '#ffe07a'); g.addColorStop(1, '#f0a020');
      ctx.fillStyle = g; rrect(ctx, xr.x, xr.y, Math.max(xr.h, xr.w * pct), xr.h, 11); ctx.fill();
    }
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(left + lvR, xr.y + xr.h / 2, lvR + 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.arc(left + lvR, xr.y + xr.h / 2, lvR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd86a'; ctx.beginPath(); ctx.arc(left + lvR - 3, xr.y + xr.h / 2 - 4, lvR - 7, 0, Math.PI * 2); ctx.fill();
    outlinedText(ctx, String(m.level), left + lvR, xr.y + xr.h / 2 + 1, fitSize(ctx, String(m.level), 30, lvR * 1.5), '#fff', INK, 'center');

    if (this.firstRun) text(ctx, 'XP', xr.x + 45, xr.y + xr.h / 2, 18, '#fff', 'left', 700);
    // pause
    if (this.ui.iconButton('pause', pauseR, ctx, () => {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
      for (const dx of [-9, 5]) { rrect(ctx, pauseR.x + 32 + dx, pauseR.y + 18, 9, 28, 3); ctx.fill(); ctx.stroke(); }
    })) this.pause();

    // timer (count up to 10:00)
    const ty = top + 78;
    const remain = Math.max(0, m.T.runLength - m.time);
    const late = remain < 60;
    outlinedText(ctx, fmtTime(m.time), v.w / 2, ty, 46, late ? '#ffd24a' : '#fff', INK, 'center');

    // kills + coins (right column, under pause)
    const ry = top + 98;
    this.skull(ctx, right - 150, ry);
    outlinedText(ctx, String(m.kills), right - 130, ry, 26, '#fff', INK, 'left');
    const coin = this.sprites.pickup('coin');
    this.blit(ctx, coin, right - 150, ry + 52, 1, 1, 1, 0, 0);
    outlinedText(ctx, String(m.coins), right - 130, ry + 40, 26, '#ffd24a', INK, 'left');

    // owned skills (left column)
    let ix = left, iy = top + 66;
    const all: [SkillId, number][] = [...m.weapons, ...m.passives];
    all.forEach(([id, lv], i) => {
      const col = i % 6, row = Math.floor(i / 6);
      const x = ix + col * 46, y = iy + row * 54;
      const ic = this.sprites.icon(id, SKILLS[id].color);
      ctx.drawImage(ic.img, x, y, 42, 42);
      for (let p = 0; p < MAX_LEVEL; p++) {
        ctx.fillStyle = p < lv ? '#ffd24a' : 'rgba(42,29,22,.55)';
        ctx.fillRect(x + 3 + p * 7.6, y + 44, 6, 5);
      }
    });
    void ix;

    // boss bar
    if (m.boss) {
      const bw = Math.min(560, v.w * 0.62);
      const br: Rect = { x: v.w / 2 - bw / 2, y: ty + 40, w: bw, h: 16 };
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
    outlinedText(ctx, touch ? 'Drag anywhere to move' : 'WASD / Arrow keys to move', 0, 0, 42, '#fff', INK, 'center');
    ctx.restore();
    ctx.save(); ctx.globalAlpha = this.firstRun ? Math.max(0, 1 - this.hintFade / 0.4) : 1;
    outlinedText(ctx, 'Your dino attacks by itself. Survive 10 minutes!', v.w / 2, y + 52, 24, '#ffe28a', INK, 'center');
    ctx.restore();
  }

  private drawBanner(ctx: Ctx): void {
    const b = this.banner!;
    const v = this.v;
    const k = b.t;
    const a = k < 0.2 ? k / 0.2 : k > 2 ? (2.4 - k) / 0.4 : 1;
    const sc = k < 0.2 ? 0.7 + 0.3 * (k / 0.2) + Math.sin(k / 0.2 * Math.PI) * 0.12 : 1;
    const y = v.safe.t + (this.m?.boss ? 230 : 190);
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.translate(v.w / 2, y);
    ctx.scale(sc, sc);
    const size = fitSize(ctx, b.text, 52, v.w - 60);
    outlinedText(ctx, b.text, 0, 0, size, b.color, INK, 'center');
    if (b.sub) outlinedText(ctx, b.sub, 0, size * 0.85, 24, '#fff', INK, 'center');
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
    outlinedText(ctx, 'LEVEL UP!', v.w / 2, v.safe.t + (land ? 120 : 170), 60, '#ffd24a', INK, 'center');
    outlinedText(ctx, 'Choose one', v.w / 2, v.safe.t + (land ? 172 : 226), 26, '#fff', INK, 'center');

    const n = offers.length;
    const rects: Rect[] = [];
    if (land) {
      const cw = Math.min(330, (v.w - 100) / n - 24), ch = 400;
      const total = n * cw + (n - 1) * 28;
      for (let i = 0; i < n; i++) rects.push({ x: v.w / 2 - total / 2 + i * (cw + 28), y: v.h / 2 - ch / 2 + 50, w: cw, h: ch });
    } else {
      const cw = Math.min(640, v.w - 60), ch = 190;
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
    const bh = Math.max(82, 44 / v.scale), bw = Math.min(260, (v.w - 100) / 2);
    if (m.rerolls > 0 && this.quietButton(ctx, 'reroll', { x: v.w / 2 - bw - 12, y: bottom, w: bw, h: bh }, 'REROLL (' + m.rerolls + ')', !ready, '#ffe28a')) this.rerollOffers();
    if (m.banishes > 0 && this.quietButton(ctx, 'banish', { x: v.w / 2 + 12, y: bottom, w: bw, h: bh }, (this.banishing ? 'CANCEL' : 'BANISH') + ' (' + m.banishes + ')', !ready, '#ffe28a')) this.banishing = !this.banishing;
    this.ui.swallow();
  }

  private card(ctx: Ctx, id: string, r: Rect, o: Offer, land: boolean, ready: boolean, idx: number): boolean {
    const p = this.input.p;
    const over = inside(r, p.x, p.y);
    if (ready && p.justDown && over && !this.ui.claimed) { this.ui.claimed = true; this.pressedCard = id; }
    const pressed = p.down && over && this.pressedCard === id;
    const clicked = ready && p.justUp && over && this.pressedCard === id;

    const def = o.id === 'heal' ? { name: 'Roast Meat', color: '#e8504a', text: ['Heal 40 health.'] }
      : o.id === 'gold' ? { name: 'Gold Pile', color: '#ffd24a', text: ['+20 coins.'] }
      : SKILLS[o.id];
    const desc = o.level > 0 ? def.text[o.level - 1] : def.text[0];
    const isNew = o.level === 1;

    ctx.save();
    const s = pressed ? 0.96 : 1;
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.scale(s, s);
    ctx.translate(-r.w / 2, -r.h / 2);
    // paper card: ink outline, cream face, coloured top edge
    ctx.fillStyle = INK; rrect(ctx, -5, -5, r.w + 10, r.h + 12, 26); ctx.fill();
    ctx.fillStyle = '#f6e8c8'; rrect(ctx, 0, 0, r.w, r.h, 22); ctx.fill();
    ctx.fillStyle = '#e8d4a8'; rrect(ctx, 0, r.h - 14, r.w, 14, 8); ctx.fill();

    const icon = this.sprites.icon(o.id, def.color);
    const isz = land ? 110 : 120;
    const ix = land ? r.w / 2 - isz / 2 : 22, iy = land ? 34 : r.h / 2 - isz / 2;
    ctx.drawImage(icon.img, ix, iy, isz, isz);

    const tx = land ? r.w / 2 : ix + isz + 24;
    const align: CanvasTextAlign = land ? 'center' : 'left';
    const tw = land ? r.w - 36 : r.w - tx - 20;
    let y = land ? iy + isz + 46 : 48;
    const ns = fitSize(ctx, def.name, 34, tw);
    ctx.font = fontFor(ns); ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = INK;
    ctx.fillText(def.name, tx, y);
    y += 40;
    if (isNew) outlinedText(ctx, 'NEW!', tx, y, 24, '#ffd24a', INK, align);
    else if (o.level > 0) {
      const pipW = 22, gap = 6, total = MAX_LEVEL * pipW + (MAX_LEVEL - 1) * gap;
      const x0 = land ? tx - total / 2 : tx;
      for (let i = 0; i < MAX_LEVEL; i++) {
        ctx.fillStyle = INK; rrect(ctx, x0 + i * (pipW + gap) - 2, y - 8, pipW + 4, 16, 6); ctx.fill();
        ctx.fillStyle = i < o.level - 1 ? '#f0a020' : i === o.level - 1 ? '#ffe07a' : '#d8c8a0';
        rrect(ctx, x0 + i * (pipW + gap), y - 6, pipW, 12, 5); ctx.fill();
      }
    }
    y += 38;
    this.wrap(ctx, desc, tx, y, tw, 24, align, '#5a4636');
    let evolution = '';
    if (o.id !== 'heal' && o.id !== 'gold') {
      if (isWeapon(o.id)) evolution = 'Evolves with ' + SKILLS[EVOLUTIONS[o.id].passive].name;
      else {
        const weapon = [...this.m!.weapons.keys()].find(w => EVOLUTIONS[w].passive === o.id);
        if (weapon) evolution = 'Evolves ' + SKILLS[weapon].name;
      }
    }
    if (evolution) text(ctx, evolution, tx, land ? r.h - 62 : r.h - 24, fitSize(ctx, evolution, 19, tw), '#7a5a3a', align);
    if (!pressed && this.keys.size === 0 && !matchMedia('(pointer: coarse)').matches) {
      text(ctx, `[${idx + 1}]`, land ? r.w / 2 : r.w - 34, r.h - 30, 18, '#a08a6a', 'center');
    }
    ctx.restore();
    return clicked;
  }

  private wrap(ctx: Ctx, str: string, x: number, y: number, maxW: number, size: number, align: CanvasTextAlign, color: string): void {
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
  }

  // ---------------------------------------------------------------- pause & results
  private drawPause(ctx: Ctx): void {
    const v = this.v;
    this.ui.scrim(ctx, v.w, v.h);
    const w = Math.min(520, v.w - 60), h = 440;
    const r: Rect = { x: v.w / 2 - w / 2, y: v.h / 2 - h / 2, w, h };
    fancyPanel(ctx, r);
    outlinedText(ctx, 'PAUSED', v.w / 2, r.y + 70, 52, '#fff', '#a8501a', 'center');
    if (this.ui.button('resume', { x: r.x + 50, y: r.y + 130, w: w - 100, h: 86 }, { label: 'RESUME', tone: 'gold' }, ctx)) this.resume();
    const hw = (w - 100 - 20) / 2;
    if (this.ui.button('snd', { x: r.x + 50, y: r.y + 246, w: hw, h: 64 }, { label: this.meta.sound ? 'SOUND ON' : 'SOUND OFF', tone: 'stone', size: 24 }, ctx)) {
      this.meta.sound = !this.meta.sound; this.audio.sound = this.meta.sound; saveMeta(this.meta);
    }
    if (this.ui.button('mus', { x: r.x + 70 + hw, y: r.y + 246, w: hw, h: 64 }, { label: this.meta.music ? 'MUSIC ON' : 'MUSIC OFF', tone: 'stone', size: 24 }, ctx)) {
      this.meta.music = !this.meta.music; this.audio.setMusic(this.meta.music); saveMeta(this.meta);
    }
    // destructive action: quiet text link, not a button twin
    const qr: Rect = { x: v.w / 2 - 110, y: r.y + h - 90, w: 220, h: 50 };
    text(ctx, 'Quit run', v.w / 2, qr.y + 25, 24, '#a8501a', 'center', 700);
    this.ui.claimIfOver('quit', qr);
    if (this.input.p.justUp && inside(qr, this.input.p.x, this.input.p.y) && inside(qr, this.input.p.downX, this.input.p.downY)) {
      this.m!.status = 'dead';
      this.m!.revived = true;
      this.paused = false;
    }
    this.ui.swallow();
  }

  /** Quiet controls retain a full touch target even when only text is visible. */
  private quietButton(ctx: Ctx, id: string, r: Rect, label: string, disabled = false, color = '#7a5a3a'): boolean {
    this.ui.claimIfOver(id, r, disabled);
    const p = this.input.p;
    const pressed = !disabled && p.down && inside(r, p.x, p.y) && inside(r, p.downX, p.downY);
    ctx.save();
    if (pressed) { ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(0.94, 0.94); ctx.translate(-r.x - r.w / 2, -r.y - r.h / 2); ctx.globalAlpha = 0.75; }
    text(ctx, label, r.x + r.w / 2, r.y + r.h / 2, fitSize(ctx, label, 25, r.w - 20), disabled ? '#a09888' : color, 'center', 700);
    ctx.restore();
    return !disabled && !this.busy && !this.poki.adRunning && p.justUp && inside(r, p.x, p.y) && inside(r, p.downX, p.downY);
  }

  private drawEdgeArrows(ctx: Ctx, m: Model): void {
    const v = this.v;
    const inset = 30, top = v.safe.t + 280, bottom = v.h - v.safe.b - 80;
    const left = v.safe.l + inset, right = v.w - v.safe.r - inset;
    const targets = [
      ...m.enemies.filter(e => !e.dead && (e.def.kind === 'boss' || e.def.kind === 'brute')).map(e => ({ x: e.x, y: e.y, color: e.def.kind === 'boss' ? '#ff625a' : '#ff9a3c' })),
      ...m.pickups.filter(p => p.kind === 'chest').map(p => ({ x: p.x, y: p.y, color: '#ffd24a' })),
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
    const w = Math.min(690, v.w - 50), h = 830;
    const r: Rect = { x: cx - w / 2, y: Math.max(v.safe.t + 55, (v.h - h) / 2 + 20), w, h };
    this.ui.scrim(ctx, v.w, v.h); fancyPanel(ctx, r);
    ribbon(ctx, cx, r.y - 34, Math.min(490, w - 60), won ? 'ZONE CLEAR!' : 'KNOCKED OUT', won ? 'green' : 'red');
    const names: Record<EnemyKind | 'spore', string> = { grub: 'Grub', bat: 'Bat', beetle: 'Beetle', wolf: 'Wolf', shroom: 'Shroom', brute: 'Brute', boss: 'Boss', spore: 'a spore' };
    const cause = m.lastHitBy;
    const heading = won ? 'You survived the swarm!' : cause ? 'Knocked out by ' + names[cause] : 'Run ended';
    text(ctx, heading, cx, r.y + 55, fitSize(ctx, heading, 28, w - 50), INK, 'center', 700);
    const tip = cause === 'spore' ? 'Spores fly straight — sidestep them' : cause === 'boss' ? 'Bosses charge in a line — move sideways' : this.movedFor < 2 ? 'Keep moving!' : cause === 'wolf' ? 'Wolves dash — keep some space' : cause === 'brute' || cause === 'beetle' ? 'Circle tough enemies and collect amber' : 'Collect amber and choose stronger skills';
    if (!won) text(ctx, tip, cx, r.y + 92, fitSize(ctx, tip, 23, w - 50), '#7a5a3a', 'center');
    [{ label: 'SURVIVED', value: fmtTime(m.time) }, { label: 'LEVEL', value: String(m.level) }, { label: 'DEFEATED', value: String(m.kills) }].forEach((col, i) => {
      const x = r.x + w * (i + 0.5) / 3;
      text(ctx, col.label, x, r.y + 143, 20, '#a8702a', 'center', 700);
      outlinedText(ctx, col.value, x, r.y + 183, 43, '#fff', INK, 'center');
    });
    if (this.newBest && !won) outlinedText(ctx, 'NEW BEST TIME!', cx, r.y + 230, 25, '#ffd24a', INK, 'center');
    else if (won && m.zone + 1 < ZONES.length) text(ctx, ZONES[m.zone + 1].name + ' unlocked!', cx, r.y + 230, 24, '#3f8e2e', 'center');
    const pr: Rect = { x: r.x + 40, y: r.y + 262, w: (w - 100) * 0.55, h: 64 };
    goldPill(ctx, pr);
    this.blit(ctx, this.sprites.pickup('coin'), pr.x + 34, pr.y + 44, 1.2, 1, 1, 0, 0);
    const amount = '+' + this.banked * (this.doubled ? 2 : 1);
    outlinedText(ctx, amount, pr.x + 65, pr.y + 33, fitSize(ctx, amount, 35, pr.w - 85), '#fff', '#a8661a', 'left');
    const dr: Rect = { x: pr.x + pr.w + 20, y: pr.y - 10, w: w - 80 - pr.w - 20, h: Math.max(84, 44 / v.scale) };
    if (!this.doubled) {
      this.clapper(ctx, dr.x + 18, dr.y + dr.h / 2, 23);
      if (this.quietButton(ctx, 'double', { ...dr, x: dr.x + 30, w: dr.w - 30 }, 'x2 COINS', this.busy, '#245aa0')) this.rewarded(() => {
        if (!this.doubled) { this.doubled = true; this.meta.coins += this.banked; saveMeta(this.meta); this.audio.play('chest'); }
      });
    }
    const cost = this.cheapestUpgrade();
    const upgrade = Number.isFinite(cost) ? this.meta.coins >= cost ? 'Your next upgrade is ready!' : (cost - this.meta.coins) + ' more coins for your next upgrade' : 'All camp upgrades complete!';
    text(ctx, upgrade, cx, r.y + 365, fitSize(ctx, upgrade, 23, w - 80), '#7a5a3a', 'center');
    ctx.fillStyle = '#d8c8a0'; ctx.fillRect(r.x + 40, r.y + 390, w - 80, 4);
    ctx.fillStyle = '#eaa82a'; ctx.fillRect(r.x + 40, r.y + 390, (w - 80) * (Number.isFinite(cost) ? Math.min(1, this.meta.coins / cost) : 1), 4);
    this.missionResults.slice(-3).forEach((mission, i) => text(ctx, 'MISSION COMPLETE +' + mission.reward, cx, r.y + 426 + i * 29, 22, '#3f8e2e', 'center', 700));
    const retry: Rect = { x: r.x + 40, y: r.y + 545, w: w - 80, h: Math.max(104, 44 / v.scale) };
    ctx.save(); const pulse = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 1 + Math.sin(this.time * 3) * 0.008;
    ctx.translate(cx, retry.y + retry.h / 2); ctx.scale(pulse, pulse); ctx.translate(-cx, -retry.y - retry.h / 2);
    const again = this.ui.button('retry', retry, { label: won ? 'NEXT' : 'RETRY', tone: 'gold', disabled: this.busy }, ctx); ctx.restore();
    const bw = (w - 100) / 2, bh = Math.max(86, 44 / v.scale);
    const camp: Rect = { x: r.x + 40, y: r.y + 685, w: bw, h: bh };
    const rev: Rect = { x: camp.x + bw + 20, y: camp.y, w: bw, h: bh };
    const toCamp = this.meta.coins >= cost
      ? this.ui.button('camp', camp, { label: 'CAMP', tone: 'stone', disabled: this.busy }, ctx)
      : this.quietButton(ctx, 'camp', camp, 'Camp', this.busy);
    if (!won && !m.revived && this.ui.button('revive', rev, { label: 'REVIVE', tone: 'blue', sub: 'watch ad', disabled: this.busy, subIcon: (c, x, y, s) => this.clapper(c, x, y, s) }, ctx)) this.rewarded(() => {
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
    c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 2;
    rrect(c, -w / 2, -h / 2 + h * 0.25, w, h * 0.75, 3); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-w / 2, -h / 2 + h * 0.2); c.lineTo(w / 2, -h / 2 - h * 0.05); c.lineTo(w / 2, -h / 2 + h * 0.12); c.lineTo(-w / 2, -h / 2 + h * 0.37); c.closePath(); c.fill(); c.stroke();
    c.restore();
  }

  // ================================================================ menu
  private menuSpecies = 0;
  private pressedCard = '';

  private drawMenu(ctx: Ctx): void {
    const v = this.v;
    const meta = this.meta;
    // living backdrop: slow-scrolling ground
    ctx.save();
    ctx.translate(-((this.time * 30) % 512), -((this.time * 12) % 512));
    ctx.fillStyle = this.ground[meta.zone];
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
    ctx.save();
    ctx.translate(cx, ty);
    ctx.rotate(-0.03);
    outlinedText(ctx, 'DINO SWARM', 0, 8, 92, '#7a3b1a', INK, 'center');
    outlinedText(ctx, 'DINO SWARM', 0, 0, 92, '#ffb02e', INK, 'center');
    outlinedText(ctx, 'SURVIVORS', 0, 74, 46, '#fff', INK, 'center');
    ctx.restore();

    // species picker
    const ids = SPECIES_IDS;
    const cur = ids.indexOf(meta.species);
    if (this.menuSpecies !== cur) this.menuSpecies = cur;
    const sp = SPECIES[meta.species];
    const unlocked = speciesUnlocked(meta, sp.id);
    const dy = land ? v.h * 0.47 : v.h * 0.42;
    const dino = this.sprites.dino(sp.id, 0);
    ctx.fillStyle = 'rgba(30,20,10,.25)';
    ctx.beginPath(); ctx.ellipse(cx, dy + 10, 90, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    if (!unlocked) ctx.filter = 'brightness(0) opacity(.6)';
    this.blit(ctx, dino, cx, dy + Math.sin(this.time * 2.4) * 3, 2.1, 1, 1, 0, 0);
    ctx.restore();
    outlinedText(ctx, sp.name.toUpperCase(), cx, dy + 50, 40, '#fff', INK, 'center');
    const blurb = unlocked ? sp.blurb : `Clear ${ZONES[sp.unlockZone].name} to unlock`;
    outlinedText(ctx, blurb, cx, dy + 92, fitSize(ctx, blurb, 24, v.w - 80), unlocked ? '#ffe28a' : '#ffb0a0', INK, 'center');
    const ar = 74;
    for (const dir of [-1, 1]) {
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
    outlinedText(ctx, zname, cx, zy + 30, 30, '#fff', INK, 'center');
    text(ctx, meta.best[meta.zone] ? `Best ${fmtTime(meta.best[meta.zone])}` : 'ZONE', cx, zy - 2, 18, '#ffe28a', 'center', 700);
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
    text(ctx, 'MISSIONS', mx, my, 24, '#ffe28a', 'left', 700);
    meta.missions.forEach((mission, i) => {
      const y = my + 45 + i * 82;
      const label = missionLabel(mission);
      outlinedText(ctx, label, mx, y, fitSize(ctx, label, 24, mw), '#fff', INK, 'left');
      text(ctx, `${mission.progress}/${mission.target}   +${mission.reward} coins`, mx, y + 28, 20, '#ffe28a');
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(mx, y + 49, mw, 3);
      ctx.fillStyle = '#ffd24a'; ctx.fillRect(mx, y + 49, mw * Math.min(1, mission.progress / mission.target), 3);
    });

    // sound toggle (top-right)
    const sr: Rect = { x: v.w - s.r - 16 - 64, y: s.t + 14, w: 64, h: 64 };
    if (this.ui.iconButton('menusnd', sr, ctx, () => this.speaker(ctx, sr, meta.sound))) {
      meta.sound = !meta.sound; this.audio.sound = meta.sound; saveMeta(meta);
    }
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
    const v = this.v;
    const meta = this.meta;
    ctx.fillStyle = this.ground[meta.zone];
    ctx.fillRect(0, 0, v.w, v.h);
    this.ui.scrim(ctx, v.w, v.h);
    const w = Math.min(760, v.w - 40);
    const rowH = 96;
    const h = 150 + CAMP_IDS.length * rowH + 40;
    const r: Rect = { x: v.w / 2 - w / 2, y: Math.max(v.safe.t + 40, v.h / 2 - h / 2), w, h };
    fancyPanel(ctx, r);
    outlinedText(ctx, 'CAMP', r.x + 40, r.y + 62, 50, '#fff', '#a8501a', 'left');
    const pr: Rect = { x: r.x + w - 230, y: r.y + 34, w: 180, h: 54 };
    goldPill(ctx, pr);
    this.blit(ctx, this.sprites.pickup('coin'), pr.x + 34, pr.y + 40, 1.2, 1, 1, 0, 0);
    outlinedText(ctx, String(meta.coins), pr.x + 60, pr.y + 28, 30, '#fff', '#a8661a', 'left');

    CAMP_IDS.forEach((id, i) => {
      const y = r.y + 120 + i * rowH;
      const c = CAMP[id];
      const lv = meta.camp[id];
      const ic = CAMP_ICON[id];
      const icon = this.sprites.icon(ic, ic === 'gold' ? '#ffd24a' : SKILLS[ic].color);
      ctx.drawImage(icon.img, r.x + 36, y + 8, 70, 70);
      text(ctx, c.name, r.x + 124, y + 28, 28, INK, 'left', 700);
      text(ctx, c.text, r.x + 124, y + 62, 20, '#7a5a3a', 'left', 600);
      for (let p = 0; p < CAMP_MAX; p++) {
        ctx.fillStyle = INK; rrect(ctx, r.x + 330 + p * 26 - 2, y + 54, 24, 16, 6); ctx.fill();
        ctx.fillStyle = p < lv ? '#f0a020' : '#d8c8a0'; rrect(ctx, r.x + 330 + p * 26, y + 56, 20, 12, 5); ctx.fill();
      }
      const br: Rect = { x: r.x + w - 210, y: y + 12, w: 170, h: 64 };
      if (lv >= CAMP_MAX) text(ctx, 'MAX', br.x + br.w / 2, br.y + 32, 28, '#3f8e2e', 'center', 700);
      else {
        const cost = campCost(id, lv);
        if (this.ui.button('buy' + id, br, { label: String(cost), tone: 'gold', size: 28, disabled: meta.coins < cost }, ctx)) {
          if (buyCamp(meta, id)) { saveMeta(meta); this.audio.play('unlock'); }
        }
      }
      if (i < CAMP_IDS.length - 1) { ctx.fillStyle = 'rgba(168,112,42,.25)'; ctx.fillRect(r.x + 36, y + rowH - 4, w - 72, 2); }
    });

    const bw = 280;
    if (this.ui.button('back', { x: v.w / 2 - bw / 2, y: Math.min(v.h - v.safe.b - 100, r.y + h + 24), w: bw, h: 80 }, { label: 'BACK', tone: 'stone' }, ctx)) {
      this.screen = 'menu';
    }
    this.ui.swallow();
  }
}
