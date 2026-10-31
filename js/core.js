'use strict';
/* ============================================================
   ÚLTIMA LUZ — núcleo: utilidades, canvas, audio, datos
   ============================================================ */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[(Math.random() * arr.length) | 0];
const hyp = Math.hypot;
const angleLerp = (a, b, t) => {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
};
const $ = s => document.querySelector(s);
const pad2 = n => String(n).padStart(2, '0');
const formatTime = s => `${Math.floor(s / 60)}:${pad2(Math.floor(s % 60))}`;

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function loadBest() {
  try { return Number(localStorage.getItem('ultima-luz-best')) || 0; } catch { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem('ultima-luz-best', String(v)); } catch {}
}

/* ------------------------------------------------------------
   Canvas y vista
------------------------------------------------------------ */
const canvas = $('#game');
const ctx = canvas.getContext('2d', { alpha: false });
const lightCanvas = document.createElement('canvas');
const lctx = lightCanvas.getContext('2d');

let W = 0, H = 0, DPR = 1, zoom = 1;
const view = { w: 0, h: 0 };
let rain = [];

function initRain() {
  rain = [];
  const n = clamp(Math.round((W * H) / 15000), 50, 210);
  for (let i = 0; i < n; i++) {
    rain.push({
      x: rand(-120, W + 120), y: rand(-H, H),
      len: rand(9, 26), spd: rand(620, 1080),
      drift: rand(-110, -30), a: rand(0.05, 0.17)
    });
  }
}

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  lightCanvas.width = Math.max(1, Math.round(W));
  lightCanvas.height = Math.max(1, Math.round(H));
  zoom = clamp(Math.min(W, H) / 460, 1.35, 2.0);
  view.w = W / zoom;
  view.h = H / zoom;
  initRain();
}
window.addEventListener('resize', () => { resize(); });

const isTouch = window.matchMedia('(pointer: coarse)').matches ||
  (window.matchMedia('(hover: none)').matches && navigator.maxTouchPoints > 0);
if (isTouch) document.body.classList.add('touch');

/* ------------------------------------------------------------
   DOM
------------------------------------------------------------ */
const dom = {
  hud: $('#hud'),
  hpFill: $('#hp-fill'), hpText: $('#hp-text'),
  xpFill: $('#xp-fill'), xpText: $('#xp-text'), levelNum: $('#level-num'),
  dashFill: $('#dash-fill'), dashText: $('#dash-text'),
  waveNum: $('#wave-num'), waveStatus: $('#wave-status'), waveKicker: $('#wave-kicker'),
  score: $('#score'), kills: $('#kills'), best: $('#best'),
  bossWrap: $('#boss-wrap'), bossFill: $('#boss-fill'),
  toast: $('#toast'),
  weaponName: $('#weapon-name'), ammoMag: $('#ammo-mag'), ammoReserve: $('#ammo-reserve'),
  weaponPanel: document.querySelector('.weapon-panel'), weaponSlots: $('#weapon-slots'),
  reloadWrap: $('#reload-bar-wrap'), reloadFill: $('#reload-fill'),
  buff: $('#buff-indicator'), buffTime: $('#buff-time'),
  damage: $('#damage-flash'),
  touchUI: $('#touch-ui'),
  screens: $('#screens'),
  screenTitle: $('#screen-title'), screenLevelup: $('#screen-levelup'),
  screenPause: $('#screen-pause'), screenOver: $('#screen-over'),
  levelupNum: $('#levelup-num'), upgradeCards: $('#upgrade-cards'),
  titleBest: $('#title-best'), overWave: $('#over-wave'), overKills: $('#over-kills'),
  overTime: $('#over-time'), overScore: $('#over-score'), recordBadge: $('#record-badge'),
  overLine: $('#over-line'),
  pauseWave: $('#pause-wave'), pauseScore: $('#pause-score'), pauseKills: $('#pause-kills'),
  muteBtn: $('#btn-mute'),
};

/* ------------------------------------------------------------
   Audio sintetizado (WebAudio)
------------------------------------------------------------ */
const Sound = {
  ctx: null, master: null, noiseBuf: null, muted: false, ready: false,
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 22;
    comp.ratio.value = 7;
    comp.attack.value = 0.004;
    comp.release.value = 0.28;
    comp.connect(c.destination);
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.master.connect(comp);
    const len = Math.floor(c.sampleRate * 1.4);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    this.ambient();
    this.ready = true;
  },
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.03);
  },
  ambient() {
    const c = this.ctx;
    const bus = c.createGain();
    bus.gain.value = 0.0001;
    bus.gain.setTargetAtTime(0.055, c.currentTime, 3);
    bus.connect(this.master);
    [55, 82.4, 110].forEach((f, i) => {
      const o = c.createOscillator();
      o.type = i === 2 ? 'sine' : 'triangle';
      o.frequency.value = f;
      const g = c.createGain();
      g.gain.value = i === 2 ? 0.03 : 0.04;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 170;
      o.connect(g); g.connect(lp); lp.connect(bus);
      o.start();
    });
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 380; f.Q.value = 0.55;
    const wg = c.createGain(); wg.gain.value = 0.06;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07;
    const lg = c.createGain(); lg.gain.value = 0.035;
    lfo.connect(lg); lg.connect(wg.gain); lfo.start();
    src.connect(f); f.connect(wg); wg.connect(bus); src.start();
  },
  noise(dur, vol, type, freq, q, when = 0, pan = 0) {
    const c = this.ctx; if (!c || !this.noiseBuf) return;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    const t = c.currentTime + when;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const p = c.createStereoPanner ? c.createStereoPanner() : null;
    if (p) p.pan.value = clamp(pan, -1, 1);
    src.connect(f); f.connect(g);
    if (p) { g.connect(p); p.connect(this.master); } else g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.03);
  },
  tone(freq, to, type, dur, vol, when = 0, pan = 0) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const p = c.createStereoPanner ? c.createStereoPanner() : null;
    if (p) p.pan.value = clamp(pan, -1, 1);
    o.connect(g);
    if (p) { g.connect(p); p.connect(this.master); } else g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.03);
  },
  shot(w) {
    if (!this.ctx) return;
    const pan = rand(-0.12, 0.12);
    if (w.id === 'pistol') {
      this.noise(0.09, 0.42, 'highpass', 480, 0.7, 0, pan);
      this.tone(160, 62, 'square', 0.08, 0.2, 0, pan);
    } else if (w.id === 'shotgun') {
      this.noise(0.26, 0.55, 'lowpass', 1500, 0.6, 0, pan);
      this.tone(95, 38, 'sawtooth', 0.2, 0.3, 0, pan);
      this.noise(0.12, 0.2, 'highpass', 1800, 0.8, 0.01, pan);
    } else if (w.id === 'smg') {
      this.noise(0.055, 0.28, 'highpass', 900, 0.8, 0, pan);
      this.tone(130, 70, 'square', 0.05, 0.12, 0, pan);
    } else {
      this.noise(0.3, 0.52, 'lowpass', 2100, 0.5, 0, pan);
      this.tone(110, 42, 'sawtooth', 0.24, 0.28, 0, pan);
      this.noise(0.1, 0.2, 'highpass', 2600, 0.7, 0.02, pan);
    }
  },
  reload() {
    this.noise(0.04, 0.12, 'bandpass', 1800, 2, 0);
    this.noise(0.05, 0.14, 'bandpass', 1200, 2, 0.16);
    this.tone(320, 220, 'square', 0.03, 0.05, 0.16);
  },
  reloadDone() {
    this.noise(0.05, 0.16, 'bandpass', 2400, 2, 0);
    this.tone(520, 700, 'square', 0.04, 0.05, 0);
  },
  hit(crit) {
    this.noise(0.045, crit ? 0.2 : 0.12, 'lowpass', crit ? 1100 : 650, 0.8, 0, rand(-0.2, 0.2));
    if (crit) this.tone(900, 500, 'triangle', 0.06, 0.08, 0);
  },
  kill() {
    this.noise(0.16, 0.2, 'lowpass', 380, 0.7, 0, rand(-0.25, 0.25));
    this.tone(90, 40, 'sawtooth', 0.18, 0.12, 0);
  },
  hurt() {
    this.tone(120, 55, 'sawtooth', 0.22, 0.28, 0);
    this.noise(0.18, 0.25, 'lowpass', 500, 0.8, 0);
  },
  pickup(kind) {
    if (kind === 'xp') { this.tone(880, 1180, 'sine', 0.06, 0.05); return; }
    this.tone(620, 620, 'sine', 0.07, 0.09);
    this.tone(930, 930, 'sine', 0.09, 0.08, 0.06);
  },
  heal() {
    this.tone(440, 660, 'sine', 0.16, 0.1);
    this.tone(660, 880, 'sine', 0.2, 0.08, 0.08);
  },
  adrenaline() {
    this.tone(220, 660, 'sawtooth', 0.3, 0.08);
    this.tone(880, 1320, 'sine', 0.22, 0.07, 0.1);
  },
  dash() {
    this.noise(0.16, 0.2, 'highpass', 700, 0.6, 0);
    this.tone(300, 900, 'sine', 0.12, 0.05);
  },
  spit() {
    this.noise(0.12, 0.16, 'lowpass', 700, 1.2, 0, rand(-0.3, 0.3));
    this.tone(210, 90, 'sine', 0.14, 0.07);
  },
  groan() {
    if (!this.ctx || this.muted) return;
    const pan = rand(-0.85, 0.85);
    this.tone(rand(66, 104), rand(40, 62), 'sawtooth', rand(0.5, 0.95), 0.05, 0, pan);
    this.noise(0.55, 0.03, 'bandpass', 320, 1.4, 0, pan);
  },
  roar() {
    this.tone(70, 34, 'sawtooth', 0.9, 0.22);
    this.noise(0.8, 0.18, 'lowpass', 420, 0.8, 0);
  },
  wave() {
    this.tone(110, 82, 'sawtooth', 0.55, 0.1);
    this.tone(55, 41, 'sine', 0.7, 0.16);
    this.noise(0.5, 0.07, 'lowpass', 300, 0.7, 0.03);
  },
  waveClear() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, f, 'triangle', 0.16, 0.08, i * 0.08));
  },
  levelup() {
    [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, f, 'triangle', 0.22, 0.09, i * 0.07));
  },
  select() {
    this.tone(700, 1050, 'sine', 0.1, 0.1);
    this.tone(1050, 1400, 'sine', 0.14, 0.06, 0.06);
  },
  death() {
    this.tone(160, 32, 'sawtooth', 1.6, 0.25);
    this.noise(1.4, 0.2, 'lowpass', 500, 0.6, 0);
  },
  click() { this.tone(520, 420, 'square', 0.035, 0.05); },
  thunder() {
    this.noise(1.8, 0.22, 'lowpass', 220, 0.7, 0.1);
    this.tone(48, 30, 'sine', 1.5, 0.12);
  }
};

/* ------------------------------------------------------------
   Datos de juego
------------------------------------------------------------ */
const WEAPON_DEFS = [
  { id: 'pistol', slot: 'P', name: 'PISTOLA', magSize: 12, dmg: 24, interval: 0.23, reload: 1.0, spread: 0.018, speed: 1500, pellets: 1, life: 0.55, pierce: 0, reserve: Infinity, color: '#ffd27a', shake: 2.4 },
  { id: 'shotgun', slot: 'E', name: 'ESCOPETA', magSize: 6, dmg: 14, interval: 0.72, reload: 2.0, spread: 0.2, speed: 1250, pellets: 8, life: 0.3, pierce: 0, reserve: 24, color: '#ffb347', shake: 7 },
  { id: 'smg', slot: 'S', name: 'SUBFUSIL', magSize: 32, dmg: 10, interval: 0.068, reload: 1.55, spread: 0.055, speed: 1700, pellets: 1, life: 0.5, pierce: 0, reserve: 160, color: '#9ad7ff', shake: 1.3 },
  { id: 'rifle', slot: 'R', name: 'RIFLE', magSize: 8, dmg: 72, interval: 0.52, reload: 2.2, spread: 0.006, speed: 2400, pellets: 1, life: 0.7, pierce: 2, reserve: 24, color: '#ff8a65', shake: 5.5 }
];

const ZDEF = {
  walker: { hp: 42, speed: 62, r: 15, dmg: 10, score: 10, xp: 1, mass: 1 },
  runner: { hp: 26, speed: 132, r: 13, dmg: 7, score: 16, xp: 1, mass: 0.8 },
  spitter: { hp: 78, speed: 52, r: 16, dmg: 6, score: 30, xp: 2, mass: 1.1 },
  brute: { hp: 280, speed: 44, r: 27, dmg: 22, score: 80, xp: 4, mass: 2.4 },
  boss: { hp: 1400, speed: 54, r: 42, dmg: 30, score: 800, xp: 18, mass: 6 }
};

const ICONS = {
  damage: '<svg viewBox="0 0 24 24"><path d="M9 21V11a3 3 0 0 1 6 0v10z"/><path d="M9 16h6M12 3v5"/></svg>',
  rate: '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  speed: '<svg viewBox="0 0 24 24"><path d="M3 6l7 6-7 6M11 6l7 6-7 6"/></svg>',
  hp: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M12 8v7M8.5 11.5h7"/></svg>',
  heal: '<svg viewBox="0 0 24 24"><path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5z"/></svg>',
  pierce: '<svg viewBox="0 0 24 24"><path d="M3 12h14"/><path d="M14 8l4 4-4 4"/><path d="M6 5v14"/></svg>',
  multi: '<svg viewBox="0 0 24 24"><path d="M12 21V11"/><path d="M12 11 5 4M12 11l7-7M12 11V3"/><path d="M2.5 6.5 5 4l2.5 2.5M16.5 6.5 19 4l2.5 2.5M9.5 3.5 12 6l2.5-2.5"/></svg>',
  crit: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  magnet: '<svg viewBox="0 0 24 24"><path d="M6 4v7a6 6 0 0 0 12 0V4"/><path d="M6 4h4v7a2 2 0 0 0 4 0V4h4"/></svg>',
  reload: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/></svg>',
  dash: '<svg viewBox="0 0 24 24"><path d="M4 8h9M2 12h12M4 16h9"/><path d="M16 6l5 6-5 6"/></svg>',
  regen: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 4.7-7 9-7 9z"/><path d="M12 9v4M10 11h4"/></svg>',
  ammo: '<svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="12" rx="1"/><path d="M8 7V4h8v3M8 12h8M8 15h5"/></svg>',
  lifesteal: '<svg viewBox="0 0 24 24"><path d="M12 3s5 5.5 5 9a5 5 0 0 1-10 0c0-3.5 5-9 5-9z"/><path d="M12 9v5M9.8 11.5h4.4"/></svg>'
};

const UPGRADES = [
  { id: 'dmg', name: 'MUNICIÓN PESADA', desc: '+20% de daño con todas las armas.', rarity: 'common', icon: 'damage', weight: 10, apply: p => { p.mods.damage *= 1.2; } },
  { id: 'rate', name: 'GATILLO LIGERO', desc: '+15% de cadencia de disparo.', rarity: 'common', icon: 'rate', weight: 10, apply: p => { p.mods.fireRate *= 1.15; } },
  { id: 'speed', name: 'PIERNAS LIGERAS', desc: '+10% de velocidad al moverte.', rarity: 'common', icon: 'speed', weight: 10, apply: p => { p.mods.speed *= 1.1; } },
  { id: 'hp', name: 'CHALECO TÁCTICO', desc: '+25 de vida máxima y recuperas 25.', rarity: 'rare', icon: 'hp', weight: 6, max: 4, apply: p => { p.mods.maxHp += 25; p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); } },
  { id: 'heal', name: 'BOTIQUÍN DE CAMPAÑA', desc: 'Recuperas el 45% de tu vida.', rarity: 'common', icon: 'heal', weight: 8, max: 99, apply: p => { p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.45); } },
  { id: 'pierce', name: 'PUNTA PERFORANTE', desc: 'Las balas atraviesan 1 enemigo más.', rarity: 'rare', icon: 'pierce', weight: 6, max: 3, apply: p => { p.mods.pierce += 1; } },
  { id: 'multi', name: 'DISPARO MÚLTIPLE', desc: '+1 proyectil por disparo. Más plomo.', rarity: 'epic', icon: 'multi', weight: 3, max: 3, apply: p => { p.mods.pellets += 1; } },
  { id: 'crit', name: 'OJO DE HALCÓN', desc: '+8% de crítico. Los críticos hacen x2.2.', rarity: 'rare', icon: 'crit', weight: 6, max: 5, apply: p => { p.mods.crit += 0.08; } },
  { id: 'magnet', name: 'IMÁN DE CAMPO', desc: '+50% de radio para recoger experiencia.', rarity: 'common', icon: 'magnet', weight: 9, max: 4, apply: p => { p.mods.magnet *= 1.5; } },
  { id: 'reload', name: 'MANOS RÁPIDAS', desc: '-20% de tiempo de recarga.', rarity: 'common', icon: 'reload', weight: 9, max: 4, apply: p => { p.mods.reload *= 0.8; } },
  { id: 'dash', name: 'ADRENALINA CRÓNICA', desc: '-25% de enfriamiento del impulso.', rarity: 'rare', icon: 'dash', weight: 6, max: 3, apply: p => { p.mods.dashCd *= 0.75; } },
  { id: 'regen', name: 'REGENERACIÓN', desc: 'Recuperas 0.8 de vida por segundo.', rarity: 'epic', icon: 'regen', weight: 3, max: 3, apply: p => { p.mods.regen += 0.8; } },
  { id: 'ammo', name: 'PROVEEDOR', desc: '+60% de munición en reserva y recogidas.', rarity: 'common', icon: 'ammo', weight: 8, max: 3, apply: p => { p.mods.ammoMul *= 1.6; p.weapons.forEach(w => { if (w.reserve !== Infinity) w.reserve = Math.round(w.reserve * 1.6); }); } },
  { id: 'vamp', name: 'SED DE SANGRE', desc: 'Cada baja te cura 1.5 de vida.', rarity: 'epic', icon: 'lifesteal', weight: 3, max: 3, apply: p => { p.mods.lifesteal += 1.5; } }
];

/* ------------------------------------------------------------
   Estado global
------------------------------------------------------------ */
const WORLD = { w: 2400, h: 1800 };
let ground = null, gctx = null;
let solids = [], props = [], lampLights = [], fireLights = [];
let game = { state: 'menu', time: 0 };
let player = null;
let zombies = [], bullets = [], particles = [], pickups = [], enemyShots = [], puddles = [], texts = [], flashes = [];
let camera = { x: WORLD.w / 2, y: WORLD.h / 2, shake: 0 };
let mouse = { x: 0, y: 0, down: false };
const keys = new Set();
const touchInput = { move: { x: 0, y: 0 }, aim: { x: 0, y: 0, active: false } };
let best = loadBest();
let uid = 1;
let menuTime = 0;
let menu = null;
let lastHudTime = 0;
