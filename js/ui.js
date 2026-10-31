'use strict';
/* ============================================================
   Interfaz, pantallas, controles y ciclo de partida
   ============================================================ */

let toastTimer = null;
let levelChoices = [];

const RARITY_LABEL = { common: 'COMÚN', rare: 'RARA', epic: 'ÉPICA', legendary: 'LEGENDARIA' };

/* ------------------------------------------------------------
   Pantallas y avisos
------------------------------------------------------------ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.toggle('active', !!id && s.id === id);
  });
}

function showToast(text, type) {
  if (!dom.toast) return;
  dom.toast.textContent = text;
  dom.toast.className = 'show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    dom.toast.className = type || '';
  }, 1900);
}

function updateHud(force) {
  if (!player || !game) return;
  const now = performance.now();
  if (!force && now - lastHudTime < 65) return;
  lastHudTime = now;

  const p = player;
  dom.hpFill.style.width = clamp(p.hp / p.maxHp * 100, 0, 100) + '%';
  dom.hpText.textContent = Math.ceil(p.hp);
  dom.levelNum.textContent = p.level;
  dom.xpFill.style.width = clamp(p.xp / p.xpNext * 100, 0, 100) + '%';
  dom.xpText.textContent = `${Math.floor(p.xp)} / ${p.xpNext}`;

  const cdMax = BASE_DASH_CD * p.mods.dashCd;
  if (p.dashCd <= 0) {
    dom.dashFill.style.width = '100%';
    dom.dashText.textContent = 'LISTO';
  } else {
    dom.dashFill.style.width = clamp((1 - p.dashCd / cdMax) * 100, 0, 100) + '%';
    dom.dashText.textContent = p.dashCd.toFixed(1) + 's';
  }

  dom.score.textContent = Math.floor(game.score).toLocaleString('es-ES');
  dom.kills.textContent = game.kills;
  dom.best.textContent = Math.max(best, Math.floor(game.score)).toLocaleString('es-ES');
  dom.waveNum.textContent = `OLEADA ${pad2(game.wave || 1)}`;
  dom.waveKicker.textContent = game.wave % 5 === 0 ? 'OBJETIVO ESPECIAL' : 'SUPERVIVENCIA';

  if (game.waveState === 'break') {
    dom.waveStatus.textContent = `REFUERZOS EN ${Math.max(0, Math.ceil(game.breakTimer))}s`;
  } else {
    const boss = zombies.find(z => z.type === 'boss' && !z.dead);
    if (boss) dom.waveStatus.textContent = 'TITÁN EN PIE';
    else dom.waveStatus.textContent = `${zombies.length + game.spawnBudget} ENEMIGOS`;
  }

  const boss = zombies.find(z => z.type === 'boss' && !z.dead);
  if (boss) {
    dom.bossWrap.classList.remove('hidden');
    dom.bossFill.style.width = clamp(boss.hp / boss.maxHp * 100, 0, 100) + '%';
  } else {
    dom.bossWrap.classList.add('hidden');
  }

  const w = p.weapons[p.weaponIndex];
  dom.weaponName.textContent = w.name;
  dom.ammoMag.textContent = w.mag;
  dom.ammoReserve.textContent = w.reserve === Infinity ? '/ ∞' : `/ ${w.reserve}`;
  dom.weaponPanel.classList.toggle('low', w.mag <= Math.ceil(w.magSize * 0.25));

  if (p.reloading) {
    dom.reloadWrap.classList.remove('hidden');
    dom.reloadFill.style.width = clamp((1 - p.reloadTimer / p.reloadTotal) * 100, 0, 100) + '%';
  } else {
    dom.reloadWrap.classList.add('hidden');
  }

  const slots = dom.weaponSlots.querySelectorAll('.weapon-slot');
  slots.forEach((el, i) => {
    el.classList.toggle('active', i === p.weaponIndex);
    const ww = p.weapons[i];
    el.classList.toggle('empty', ww.mag <= 0 && ww.reserve !== Infinity && ww.reserve <= 0);
  });

  dom.buff.classList.toggle('hidden', game.buffTime <= 0);
  if (game.buffTime > 0) dom.buffTime.textContent = game.buffTime.toFixed(1);
  dom.hud.classList.toggle('low-hp', p.hp / p.maxHp < 0.3);

  const dashBtn = document.getElementById('btn-touch-dash');
  if (dashBtn) dashBtn.classList.toggle('cooling', p.dashCd > 0);
}

function buildWeaponSlots() {
  dom.weaponSlots.innerHTML = WEAPON_DEFS.map((w, i) =>
    `<button class="weapon-slot" data-i="${i}" type="button" title="${w.name} (${i + 1})">${w.slot}</button>`
  ).join('');
  dom.weaponSlots.querySelectorAll('.weapon-slot').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      switchWeapon(Number(el.dataset.i));
    });
  });
}

/* ------------------------------------------------------------
   Subida de nivel
------------------------------------------------------------ */
function pickUpgradeChoices() {
  const pool = UPGRADES.filter(u => {
    const count = player.upgradeCounts[u.id] || 0;
    if (u.max && count >= u.max) return false;
    if (u.id === 'heal' && player.hp >= player.maxHp - 2) return false;
    return true;
  });
  const chosen = [];
  while (chosen.length < 3 && pool.length) {
    let total = 0;
    for (const u of pool) total += u.weight || 5;
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      r -= pool[idx].weight || 5;
      if (r <= 0) break;
    }
    if (idx >= pool.length) idx = pool.length - 1;
    chosen.push(pool.splice(idx, 1)[0]);
  }
  return chosen;
}

function cardHTML(u, i) {
  return `<button class="card ${u.rarity}" data-i="${i}" type="button">
    <div class="card-top"><span class="rarity">${RARITY_LABEL[u.rarity] || 'MEJORA'}</span><span class="key">${i + 1}</span></div>
    <div class="card-icon">${ICONS[u.icon] || ICONS.damage}</div>
    <div class="card-name">${u.name}</div>
    <div class="card-desc">${u.desc}</div>
    <div class="card-foot">MEJORA PERMANENTE</div>
  </button>`;
}

function openLevelUp() {
  if (game.state !== 'playing' && game.state !== 'levelup') return;
  game.state = 'levelup';
  dom.levelupNum.textContent = player.level;
  levelChoices = pickUpgradeChoices();
  dom.upgradeCards.innerHTML = levelChoices.map((u, i) => cardHTML(u, i)).join('');
  dom.upgradeCards.querySelectorAll('.card').forEach(el => {
    el.addEventListener('click', () => chooseUpgrade(Number(el.dataset.i)));
  });
  showScreen('screen-levelup');
  document.body.classList.remove('playing');
  Sound.levelup();
}

function chooseUpgrade(i) {
  if (game.state !== 'levelup') return;
  const u = levelChoices[i];
  if (!u) return;
  u.apply(player);
  player.upgradeCounts[u.id] = (player.upgradeCounts[u.id] || 0) + 1;
  game.levelQueue = Math.max(0, game.levelQueue - 1);
  Sound.select();
  showToast(u.name, 'good');
  if (game.levelQueue > 0) {
    openLevelUp();
  } else {
    game.state = 'playing';
    showScreen(null);
    document.body.classList.add('playing');
    updateHud(true);
  }
}

/* ------------------------------------------------------------
   Ciclo de partida
------------------------------------------------------------ */
function newGame() {
  zombies = [];
  bullets = [];
  particles = [];
  pickups = [];
  enemyShots = [];
  puddles = [];
  texts = [];
  flashes = [];
  levelChoices = [];
  uid = 1;

  player = {
    x: 1200, y: 930, vx: 0, vy: 0, kx: 0, ky: 0,
    angle: -Math.PI / 2, r: 14,
    hp: 100, maxHp: 100, invuln: 0, flash: 0, acidCd: 0,
    dashTimer: 0, dashCd: 0, dashDirX: 1, dashDirY: 0,
    weapons: WEAPON_DEFS.map(d => ({ ...d, mag: d.magSize, reserve: d.reserve })),
    weaponIndex: 0, cooldown: 0, reloading: false, reloadTimer: 0, reloadTotal: 1,
    mods: {
      damage: 1, fireRate: 1, speed: 1, maxHp: 100, pierce: 0, pellets: 0,
      crit: 0.05, magnet: 1, reload: 1, dashCd: 1, regen: 0, ammoMul: 1, lifesteal: 0
    },
    xp: 0, level: 1, xpNext: 10, walkPhase: 0, recoil: 0,
    upgradeCounts: {}
  };

  camera = { x: player.x, y: player.y, shake: 0 };

  game = {
    state: 'playing', time: 0, wave: 0, waveState: 'fight',
    spawnBudget: 0, spawnTimer: 0, breakTimer: 0, maxAlive: 20,
    score: 0, scoreAcc: 0, kills: 0, levelQueue: 0, deathTimer: 0,
    buffTime: 0, bossId: null, redFlash: 0, lightning: 0,
    nextLightning: rand(14, 26), hitMarker: 0, hitCrit: false,
    autoFire: isTouch, groanTimer: rand(3, 6)
  };
  lastHudTime = 0;

  dom.hud.classList.remove('hidden');
  dom.touchUI.classList.toggle('hidden', !isTouch);
  dom.buff.classList.add('hidden');
  dom.damage.style.opacity = '0';
  dom.toast.className = '';
  document.body.classList.add('playing');
  buildWeaponSlots();
  updateHud(true);
  startWave(1);
}

function startGame() {
  Sound.init();
  Sound.setMuted(Sound.muted);
  document.body.classList.toggle('sound-on', !Sound.muted);
  showScreen(null);
  mouse.down = false;
  mouse.x = W / 2;
  mouse.y = H / 2 - 120;
  newGame();
}

function returnToMenu() {
  game = { state: 'menu', time: 0 };
  player = null;
  zombies = [];
  bullets = [];
  particles = [];
  pickups = [];
  enemyShots = [];
  puddles = [];
  texts = [];
  flashes = [];
  dom.hud.classList.add('hidden');
  dom.touchUI.classList.add('hidden');
  dom.damage.style.opacity = '0';
  document.body.classList.remove('playing');
  dom.titleBest.textContent = best.toLocaleString('es-ES');
  dom.best.textContent = best.toLocaleString('es-ES');
  showScreen('screen-title');
  menuTime = 0;
  if (!menu) buildMenu();
}

function togglePause() {
  if (!game) return;
  if (game.state === 'playing') {
    game.state = 'paused';
    dom.pauseWave.textContent = game.wave;
    dom.pauseScore.textContent = Math.floor(game.score).toLocaleString('es-ES');
    dom.pauseKills.textContent = game.kills;
    showScreen('screen-pause');
    document.body.classList.remove('playing');
    dom.touchUI.classList.add('hidden');
    Sound.click();
  } else if (game.state === 'paused') {
    game.state = 'playing';
    showScreen(null);
    document.body.classList.add('playing');
    dom.touchUI.classList.toggle('hidden', !isTouch);
    Sound.click();
    updateHud(true);
  }
}

function endGame() {
  game.state = 'gameover';
  const sc = Math.floor(game.score);
  const isRecord = sc > best;
  if (isRecord) {
    best = sc;
    saveBest(best);
  }
  dom.overWave.textContent = game.wave;
  dom.overKills.textContent = game.kills;
  dom.overTime.textContent = formatTime(game.time);
  dom.overScore.textContent = sc.toLocaleString('es-ES');
  dom.recordBadge.classList.toggle('hidden', !isRecord);
  dom.overLine.textContent = isRecord
    ? 'Nadie había llegado tan lejos esta noche.'
    : 'La ciudad reclama a otro superviviente.';
  dom.titleBest.textContent = best.toLocaleString('es-ES');
  dom.best.textContent = best.toLocaleString('es-ES');
  dom.touchUI.classList.add('hidden');
  document.body.classList.remove('playing');
  showScreen('screen-over');
  updateHud(true);
}

function toggleMute() {
  Sound.init();
  Sound.setMuted(!Sound.muted);
  document.body.classList.toggle('sound-on', !Sound.muted);
}

/* ------------------------------------------------------------
   Controles
------------------------------------------------------------ */
function setupStick(el, onMove, onEnd) {
  let pid = null;
  let cx = 0, cy = 0;
  const knob = el.querySelector('.stick-knob');
  const R = 48;

  const update = e => {
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const len = hyp(dx, dy);
    if (len > R) { dx *= R / len; dy *= R / len; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    onMove(dx / R, dy / R);
  };

  el.addEventListener('pointerdown', e => {
    if (pid !== null) return;
    pid = e.pointerId;
    try { el.setPointerCapture(pid); } catch {}
    const r = el.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    el.classList.add('active');
    update(e);
    e.preventDefault();
  });
  el.addEventListener('pointermove', e => {
    if (e.pointerId === pid) { update(e); e.preventDefault(); }
  });
  const end = e => {
    if (e.pointerId !== pid) return;
    pid = null;
    knob.style.transform = 'translate(-50%, -50%)';
    el.classList.remove('active');
    onEnd();
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('lostpointercapture', end);
}

function setupInput() {
  window.addEventListener('keydown', e => {
    const code = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) e.preventDefault();
    if (e.repeat) return;

    if (game.state === 'menu') {
      if (code === 'Enter' || code === 'Space' || code === 'NumpadEnter') startGame();
      return;
    }
    if (game.state === 'levelup') {
      if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3') chooseUpgrade(Number(code.slice(5)) - 1);
      return;
    }
    if (game.state === 'gameover') {
      if (code === 'Enter' || code === 'KeyR') startGame();
      return;
    }
    if (code === 'Escape' || code === 'KeyP') { togglePause(); return; }
    if (code === 'KeyM') { toggleMute(); return; }
    if (game.state !== 'playing') return;

    keys.add(code);
    if (code === 'KeyR') startReload();
    if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'Space') tryDash();
    if (/^Digit[1-4]$/.test(code)) switchWeapon(Number(code.slice(5)) - 1);
  });

  window.addEventListener('keyup', e => keys.delete(e.code));

  canvas.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    mouse.down = true;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    Sound.init();
  });
  window.addEventListener('pointerup', e => {
    if (e.pointerType === 'mouse') mouse.down = false;
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('contextmenu', e => e.preventDefault());

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === 'playing') togglePause();
  });

  document.getElementById('btn-play').addEventListener('click', startGame);
  document.getElementById('btn-resume').addEventListener('click', togglePause);
  document.getElementById('btn-pause-restart').addEventListener('click', startGame);
  document.getElementById('btn-pause-menu').addEventListener('click', returnToMenu);
  document.getElementById('btn-retry').addEventListener('click', startGame);
  document.getElementById('btn-over-menu').addEventListener('click', returnToMenu);
  dom.muteBtn.addEventListener('click', toggleMute);
  document.getElementById('btn-pause').addEventListener('click', togglePause);
}

function setupTouch() {
  const stickMove = document.getElementById('stick-move');
  const stickAim = document.getElementById('stick-aim');

  setupStick(stickMove,
    (x, y) => { touchInput.move.x = x; touchInput.move.y = y; },
    () => { touchInput.move.x = 0; touchInput.move.y = 0; }
  );
  setupStick(stickAim,
    (x, y) => { touchInput.aim.x = x; touchInput.aim.y = y; touchInput.aim.active = true; },
    () => { touchInput.aim.x = 0; touchInput.aim.y = 0; touchInput.aim.active = false; }
  );

  const bindBtn = (id, fn) => {
    const el = document.getElementById(id);
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      Sound.init();
      fn();
    });
  };
  bindBtn('btn-touch-dash', tryDash);
  bindBtn('btn-touch-reload', startReload);
  bindBtn('btn-touch-swap', cycleWeapon);

  // evita gestos del navegador sobre la zona de juego
  document.addEventListener('gesturestart', e => e.preventDefault());
}

/* ------------------------------------------------------------
   Arranque
------------------------------------------------------------ */
function init() {
  resize();
  buildWorld();
  buildMenu();
  buildWeaponSlots();
  setupInput();
  setupTouch();

  dom.best.textContent = best.toLocaleString('es-ES');
  dom.titleBest.textContent = best.toLocaleString('es-ES');
  dom.ammoReserve.textContent = '/ ∞';
  showScreen('screen-title');
  game = { state: 'menu', time: 0 };
}
