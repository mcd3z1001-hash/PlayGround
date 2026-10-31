'use strict';
/* ============================================================
   Lógica de juego: jugador, armas, zombis, oleadas, botín
   ============================================================ */

const BASE_DASH_CD = 2.4;

function curWeapon() {
  return player ? player.weapons[player.weaponIndex] : null;
}
function xpForLevel(l) {
  return Math.round(8 + l * 5 + l * l * 0.8);
}

/* ------------------------------------------------------------
   Colisiones
------------------------------------------------------------ */
function collideCircle(ent, r) {
  for (const s of solids) {
    const nx = clamp(ent.x, s.x, s.x + s.w);
    const ny = clamp(ent.y, s.y, s.y + s.h);
    let dx = ent.x - nx, dy = ent.y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        ent.x += dx / d * (r - d);
        ent.y += dy / d * (r - d);
      } else {
        const left = ent.x - s.x, right = s.x + s.w - ent.x;
        const top = ent.y - s.y, bottom = s.y + s.h - ent.y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) ent.x = s.x - r;
        else if (m === right) ent.x = s.x + s.w + r;
        else if (m === top) ent.y = s.y - r;
        else ent.y = s.y + s.h + r;
      }
    }
  }
  ent.x = clamp(ent.x, r + 20, WORLD.w - r - 20);
  ent.y = clamp(ent.y, r + 20, WORLD.h - r - 20);
}

function pointInSolid(x, y, r) {
  for (const s of solids) {
    const nx = clamp(x, s.x, s.x + s.w);
    const ny = clamp(y, s.y, s.y + s.h);
    const dx = x - nx, dy = y - ny;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

function segRectT(x1, y1, x2, y2, s) {
  const dx = x2 - x1, dy = y2 - y1;
  let t0 = 0, t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - s.x, s.x + s.w - x1, y1 - s.y, s.y + s.h - y1];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-9) {
      if (q[i] < 0) return null;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return null;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return null;
        if (t < t1) t1 = t;
      }
    }
  }
  return t0 <= t1 ? t0 : null;
}

function segCircleT(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1;
  const fx = x1 - cx, fy = y1 - cy;
  const a = dx * dx + dy * dy;
  if (a < 1e-8) return null;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  let disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  disc = Math.sqrt(disc);
  const t1 = (-b - disc) / (2 * a);
  const t2 = (-b + disc) / (2 * a);
  if (t1 >= 0 && t1 <= 1) return t1;
  if (t2 >= 0 && t2 <= 1) return t2;
  return null;
}

function hasLineOfSight(x1, y1, x2, y2) {
  for (const s of solids) if (segRectT(x1, y1, x2, y2, s) !== null) return false;
  return true;
}

/* ------------------------------------------------------------
   Jugador
------------------------------------------------------------ */
function updatePlayer(dt) {
  const p = player;
  if (!p) return;
  p.invuln = Math.max(0, p.invuln - dt);
  p.flash = Math.max(0, p.flash - dt);
  p.acidCd = Math.max(0, p.acidCd - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.recoil = lerp(p.recoil, 0, 1 - Math.exp(-10 * dt));

  if (p.reloading) updateReload(dt);

  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.x += p.dashDirX * 760 * dt;
    p.y += p.dashDirY * 760 * dt;
    if (Math.random() < 0.85) {
      particles.push({
        type: 'dust', x: p.x - p.dashDirX * 10 + rand(-5, 5), y: p.y - p.dashDirY * 10 + rand(-5, 5),
        vx: -p.dashDirX * rand(20, 60), vy: -p.dashDirY * rand(20, 60),
        life: 0.35, max: 0.35, size: rand(4, 9), color: '150,170,175', drag: 3, grav: 0, rot: 0, vr: 0
      });
    }
  } else {
    let ix = 0, iy = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) iy--;
    if (keys.has('KeyS') || keys.has('ArrowDown')) iy++;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) ix--;
    if (keys.has('KeyD') || keys.has('ArrowRight')) ix++;
    if (isTouch) { ix += touchInput.move.x; iy += touchInput.move.y; }
    const l = hyp(ix, iy);
    if (l > 1) { ix /= l; iy /= l; }
    const spd = 218 * p.mods.speed * (game.buffTime > 0 ? 1.25 : 1);
    const k = 1 - Math.exp(-14 * dt);
    p.vx = lerp(p.vx, ix * spd, k);
    p.vy = lerp(p.vy, iy * spd, k);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }

  p.x += p.kx * dt;
  p.y += p.ky * dt;
  p.kx *= Math.exp(-8 * dt);
  p.ky *= Math.exp(-8 * dt);

  p.walkPhase += dt * (3 + hyp(p.vx, p.vy) * 0.035);

  if (hyp(p.vx, p.vy) > 60 && Math.random() < dt * 9) {
    particles.push({
      type: 'dust', x: p.x + rand(-6, 6), y: p.y + rand(-2, 8),
      vx: rand(-14, 14), vy: rand(-10, 2),
      life: 0.4, max: 0.4, size: rand(2, 4.5), color: '120,135,130', drag: 2.5, grav: 0, rot: 0, vr: 0
    });
  }

  collideCircle(p, p.r);

  if (p.mods.regen > 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + p.mods.regen * dt);

  updateAim(dt);
  updateShooting(dt);
}

function nearestZombie(maxD, coneAngle) {
  let best = null, bestScore = Infinity;
  for (const z of zombies) {
    if (z.dead) continue;
    const d = hyp(z.x - player.x, z.y - player.y);
    if (d > maxD) continue;
    if (coneAngle !== undefined) {
      let diff = Math.atan2(z.y - player.y, z.x - player.x) - player.angle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      if (Math.abs(diff) > coneAngle) continue;
      if (d + Math.abs(diff) * 260 < bestScore) { bestScore = d + Math.abs(diff) * 260; best = z; }
    } else if (d < bestScore) { bestScore = d; best = z; }
  }
  return best;
}

function updateAim(dt) {
  const p = player;
  if (isTouch) {
    const l = hyp(touchInput.aim.x, touchInput.aim.y);
    if (touchInput.aim.active && l > 0.16) {
      p.angle = Math.atan2(touchInput.aim.y, touchInput.aim.x);
      const t = nearestZombie(820, 0.5);
      if (t) p.angle = angleLerp(p.angle, Math.atan2(t.y - p.y, t.x - p.x), 0.45);
    } else {
      const t = nearestZombie(880);
      if (t) p.angle = angleLerp(p.angle, Math.atan2(t.y - p.y, t.x - p.x), 1 - Math.exp(-9 * dt));
    }
  } else {
    const wx = camera.x + (mouse.x - W / 2) / zoom;
    const wy = camera.y + (mouse.y - H / 2) / zoom;
    p.angle = Math.atan2(wy - p.y, wx - p.x);
  }
}

function updateShooting(dt) {
  const p = player;
  const w = curWeapon();
  if (!w) return;
  p.cooldown = Math.max(0, p.cooldown - dt);
  if (p.reloading) return;

  let firing = false;
  if (isTouch) {
    firing = touchInput.aim.active || (game.autoFire && !!nearestZombie(900));
  } else {
    firing = mouse.down;
  }
  if (!firing) return;
  if (w.mag <= 0) { startReload(); return; }
  if (p.cooldown > 0) return;
  shoot(w);
}

function shoot(w) {
  const p = player;
  const mods = p.mods;
  const pellets = w.pellets + mods.pellets;
  const spread = w.spread * (1 + Math.max(0, pellets - 1) * 0.04);
  const mx = p.x + Math.cos(p.angle) * 25;
  const my = p.y + Math.sin(p.angle) * 25;

  for (let i = 0; i < pellets; i++) {
    let a = p.angle;
    if (pellets > 1) a += (i / (pellets - 1) - 0.5) * spread * 2 + rand(-spread * 0.3, spread * 0.3);
    else a += rand(-spread, spread);
    const spd = w.speed * rand(0.94, 1.06);
    bullets.push({
      id: uid++, x: mx, y: my, px: mx, py: my,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      life: w.life, dmg: w.dmg * mods.damage,
      pierce: w.pierce + mods.pierce, color: w.color,
      crit: Math.random() < mods.crit, hit: new Set()
    });
  }

  w.mag--;
  p.cooldown = w.interval / (mods.fireRate * (game.buffTime > 0 ? 1.5 : 1));
  p.recoil = Math.min(1, p.recoil + 0.32);
  camera.shake = Math.min(22, camera.shake + w.shake);
  flashes.push({ x: mx, y: my, a: p.angle, life: 0.055, max: 0.055, size: w.id === 'shotgun' ? 40 : w.id === 'rifle' ? 34 : 23 });

  for (let i = 0; i < 3; i++) {
    particles.push({
      type: 'smoke', x: mx, y: my,
      vx: Math.cos(p.angle) * rand(25, 80) + rand(-22, 22),
      vy: Math.sin(p.angle) * rand(25, 80) + rand(-22, 22),
      life: 0.4, max: 0.4, size: rand(3, 7), color: '190,200,200', drag: 3, grav: 0, rot: 0, vr: 0
    });
  }
  const sa = p.angle + 1.7;
  particles.push({
    type: 'shell', x: p.x + Math.cos(sa) * 11, y: p.y + Math.sin(sa) * 11,
    vx: Math.cos(sa) * rand(70, 150), vy: Math.sin(sa) * rand(70, 150),
    life: 0.9, max: 0.9, size: 2.2, color: '220,175,90', drag: 2, grav: 0, rot: rand(TAU), vr: rand(-22, 22)
  });

  Sound.shot(w);
}

function updateReload(dt) {
  const p = player;
  if (!p.reloading) return;
  p.reloadTimer -= dt;
  if (p.reloadTimer <= 0) {
    const w = curWeapon();
    const need = w.magSize - w.mag;
    const take = w.reserve === Infinity ? need : Math.min(need, w.reserve);
    w.mag += take;
    if (w.reserve !== Infinity) w.reserve -= take;
    p.reloading = false;
    Sound.reloadDone();
  }
}

function startReload() {
  const p = player;
  const w = curWeapon();
  if (!p || !w || p.reloading) return;
  if (w.mag >= w.magSize) return;
  if (w.reserve !== Infinity && w.reserve <= 0) {
    showToast('SIN MUNICIÓN', 'danger');
    Sound.click();
    return;
  }
  p.reloading = true;
  p.reloadTimer = w.reload * p.mods.reload;
  p.reloadTotal = p.reloadTimer;
  Sound.reload();
}

function switchWeapon(i) {
  if (!player || !WEAPON_DEFS[i]) return;
  if (game.state !== 'playing') return;
  if (i === player.weaponIndex) return;
  player.weaponIndex = i;
  player.reloading = false;
  player.cooldown = Math.max(player.cooldown, 0.14);
  Sound.click();
  updateHud(true);
}

function cycleWeapon() {
  if (!player) return;
  for (let k = 1; k <= 4; k++) {
    const i = (player.weaponIndex + k) % 4;
    const w = player.weapons[i];
    if (w.mag > 0 || w.reserve === Infinity || w.reserve > 0) {
      switchWeapon(i);
      return;
    }
  }
}

function tryDash() {
  if (!player || game.state !== 'playing') return;
  const p = player;
  if (p.dashCd > 0 || p.dashTimer > 0) return;
  let dx = 0, dy = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) dy--;
  if (keys.has('KeyS') || keys.has('ArrowDown')) dy++;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) dx--;
  if (keys.has('KeyD') || keys.has('ArrowRight')) dx++;
  if (isTouch) { dx += touchInput.move.x; dy += touchInput.move.y; }
  if (!dx && !dy) { dx = Math.cos(p.angle); dy = Math.sin(p.angle); }
  const l = hyp(dx, dy) || 1;
  p.dashDirX = dx / l;
  p.dashDirY = dy / l;
  p.dashTimer = 0.17;
  p.dashCd = BASE_DASH_CD * p.mods.dashCd;
  p.invuln = Math.max(p.invuln, 0.28);
  camera.shake += 4;
  Sound.dash();
}

function hurtPlayer(dmg, sx, sy) {
  if (!player || game.state !== 'playing') return;
  const p = player;
  if (p.invuln > 0 || p.dashTimer > 0) return;
  p.hp -= dmg;
  p.invuln = 0.55;
  p.flash = 0.15;
  const a = Math.atan2(p.y - sy, p.x - sx);
  p.kx += Math.cos(a) * 190;
  p.ky += Math.sin(a) * 190;
  camera.shake = Math.min(26, camera.shake + 8);
  game.redFlash = Math.min(1, game.redFlash + 0.75);
  Sound.hurt();
  damageText(p.x, p.y - 26, '-' + Math.round(dmg), '#ff7160', false);
  if (p.hp <= 0) { p.hp = 0; killPlayer(); }
}

function killPlayer() {
  if (game.state !== 'playing') return;
  game.state = 'dying';
  game.deathTimer = 1.6;
  camera.shake = 24;
  game.redFlash = 1;
  Sound.death();
  bloodBurst(player.x, player.y, 26, 1.4);
  stampCorpse({ x: player.x, y: player.y, angle: player.angle, r: 16 });
}

/* ------------------------------------------------------------
   Zombis
------------------------------------------------------------ */
function pickZombieType() {
  const r = Math.random();
  if (game.wave >= 4 && r < 0.1) return 'spitter';
  if (game.wave >= 3 && r < 0.24) return 'brute';
  if (game.wave >= 2 && r < 0.52) return 'runner';
  return 'walker';
}

function spawnZombie(type) {
  const def = ZDEF[type];
  const scale = 1 + (game.wave - 1) * 0.19;
  const pos = findSpawnPos();
  const hp = def.hp * scale * (type === 'boss' ? 1 + game.wave * 0.02 : 1);
  const z = {
    id: uid++, type, x: pos.x, y: pos.y,
    hp, maxHp: hp,
    speed: def.speed * (1 + Math.min(0.45, game.wave * 0.011)),
    r: def.r, dmg: def.dmg * (1 + game.wave * 0.028),
    score: def.score, xp: def.xp, mass: def.mass,
    angle: rand(TAU), vx: 0, vy: 0, kx: 0, ky: 0,
    flash: 0, attackCd: rand(0.1, 0.7), stagger: 0, lunge: 0,
    seed: rand(0, 100), shootCd: rand(1.2, 2.6),
    bossState: 'chase', chargeCd: rand(2.5, 4), windup: 0, chargeT: 0, recoverT: 0,
    chargeDirX: 0, chargeDirY: 0
  };
  zombies.push(z);
  if (type === 'boss') game.bossId = z.id;
  return z;
}

function findSpawnPos() {
  const p = player;
  const minD = Math.max(view.w, view.h) * 0.5 + 60;
  const camL = camera.x - view.w / 2, camR = camera.x + view.w / 2;
  const camT = camera.y - view.h / 2, camB = camera.y + view.h / 2;
  for (let i = 0; i < 50; i++) {
    const a = rand(TAU);
    const d = minD + rand(0, 180);
    const x = clamp(p.x + Math.cos(a) * d, 45, WORLD.w - 45);
    const y = clamp(p.y + Math.sin(a) * d, 45, WORLD.h - 45);
    if (hyp(x - p.x, y - p.y) < minD * 0.78) continue;
    if (pointInSolid(x, y, 22)) continue;
    if (x > camL - 40 && x < camR + 40 && y > camT - 40 && y < camB + 40) continue;
    return { x, y };
  }
  return {
    x: clamp(p.x + rand(-700, 700), 45, WORLD.w - 45),
    y: clamp(p.y + rand(-700, 700), 45, WORLD.h - 45)
  };
}

function updateZombies(dt) {
  const p = player;
  if (!p) return;
  const cell = 64;
  const grid = new Map();
  for (const z of zombies) {
    if (z.dead) continue;
    const k = ((z.x / cell) | 0) + ',' + ((z.y / cell) | 0);
    let arr = grid.get(k);
    if (!arr) { arr = []; grid.set(k, arr); }
    arr.push(z);
  }

  for (const z of zombies) {
    if (z.dead) continue;
    z.flash = Math.max(0, z.flash - dt);
    z.stagger = Math.max(0, z.stagger - dt);
    z.attackCd = Math.max(0, z.attackCd - dt);
    z.lunge = Math.max(0, z.lunge - dt);
    if (z.type === 'spitter') z.shootCd -= dt;

    const dx = p.x - z.x, dy = p.y - z.y;
    const d = hyp(dx, dy) || 1;
    z.angle = angleLerp(z.angle, Math.atan2(dy, dx), 1 - Math.exp(-7 * dt));

    let mx = 0, my = 0, spd = z.speed;

    if (z.type === 'boss') {
      z.chargeCd -= dt;
      if (z.bossState === 'windup') {
        z.windup -= dt;
        if (z.windup <= 0) {
          z.bossState = 'charge';
          z.chargeT = 0.55;
          z.chargeDirX = dx / d;
          z.chargeDirY = dy / d;
          Sound.roar();
          camera.shake += 8;
        }
      } else if (z.bossState === 'charge') {
        z.chargeT -= dt;
        mx = z.chargeDirX; my = z.chargeDirY;
        spd = 640;
        if (Math.random() < 0.7) {
          particles.push({
            type: 'dust', x: z.x + rand(-14, 14), y: z.y + rand(-14, 14),
            vx: rand(-30, 30), vy: rand(-30, 30),
            life: 0.4, max: 0.4, size: rand(5, 12), color: '130,125,115', drag: 2, grav: 0, rot: 0, vr: 0
          });
        }
        if (z.chargeT <= 0) { z.bossState = 'recover'; z.recoverT = 0.95; }
      } else if (z.bossState === 'recover') {
        z.recoverT -= dt;
        if (z.recoverT <= 0) z.bossState = 'chase';
      } else {
        mx = dx / d; my = dy / d;
        if (d < 560 && z.chargeCd <= 0) {
          z.bossState = 'windup';
          z.windup = 0.7;
          z.chargeCd = 6.5;
        }
      }
    } else if (z.type === 'spitter') {
      if (d < 235) { mx = -dx / d; my = -dy / d; }
      else if (d > 430) { mx = dx / d; my = dy / d; }
      else { mx = -dy / d * 0.6; my = dx / d * 0.6; }
    } else if (d > z.r + p.r + 2) {
      mx = dx / d; my = dy / d;
    }

    // separación entre zombis
    const gx = (z.x / cell) | 0, gy = (z.y / cell) | 0;
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const arr = grid.get((gx + ox) + ',' + (gy + oy));
        if (!arr) continue;
        for (const o of arr) {
          if (o === z || o.dead) continue;
          const ddx = z.x - o.x, ddy = z.y - o.y;
          const dd2 = ddx * ddx + ddy * ddy;
          const min = z.r + o.r;
          if (dd2 < min * min && dd2 > 0.01) {
            const dd = Math.sqrt(dd2);
            const push = (min - dd) / dd * 0.55;
            mx += ddx * push;
            my += ddy * push;
          }
        }
      }
    }

    const ml = hyp(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }

    const accel = 1 - Math.exp(-9 * dt);
    z.vx = lerp(z.vx, mx * spd, accel);
    z.vy = lerp(z.vy, my * spd, accel);
    z.x += z.vx * dt + z.kx * dt;
    z.y += z.vy * dt + z.ky * dt;
    z.kx *= Math.exp(-7 * dt);
    z.ky *= Math.exp(-7 * dt);
    collideCircle(z, z.r);

    const ddx = p.x - z.x, ddy = p.y - z.y;
    const dd = hyp(ddx, ddy);
    if (dd < z.r + p.r + 5 && z.attackCd <= 0) {
      z.attackCd = z.type === 'boss' ? 1.1 : 0.9;
      z.lunge = 0.18;
      hurtPlayer(z.dmg, z.x, z.y);
      if (game.state !== 'playing') break;
    }

    if (z.type === 'spitter' && z.shootCd <= 0 && dd < 560 && dd > 70) {
      if (hasLineOfSight(z.x, z.y, p.x, p.y)) spitAt(z, p);
    }
  }

  zombies = zombies.filter(z => !z.dead);
}

function spitAt(z, p) {
  z.shootCd = rand(2.4, 3.6);
  const a = Math.atan2(p.y - z.y, p.x - z.x) + rand(-0.06, 0.06);
  enemyShots.push({
    x: z.x + Math.cos(a) * z.r, y: z.y + Math.sin(a) * z.r,
    vx: Math.cos(a) * 330, vy: Math.sin(a) * 330,
    r: 7, life: 2.6, dmg: 12, seed: rand(TAU)
  });
  Sound.spit();
}

function killZombie(z) {
  if (z.dead) return;
  z.dead = true;
  game.kills++;
  game.score += Math.round(z.score * (1 + game.wave * 0.03));
  if (player.mods.lifesteal > 0) {
    player.hp = Math.min(player.maxHp, player.hp + player.mods.lifesteal);
  }
  spawnXp(z);
  maybeDrop(z);
  stampCorpse(z);
  bloodBurst(z.x, z.y, z.type === 'boss' ? 70 : z.type === 'brute' ? 26 : 16, z.type === 'boss' ? 2 : 1);
  camera.shake = Math.min(26, camera.shake + (z.type === 'boss' ? 18 : 1.6));
  Sound.kill();
  if (z.type === 'boss') {
    game.score += 500;
    showToast('TITÁN ABATIDO', 'good');
    game.lightning = 0.5;
    game.bossId = null;
  }
}

/* ------------------------------------------------------------
   Balas y proyectiles
------------------------------------------------------------ */
function updateBullets(dt) {
  for (const b of bullets) {
    if (b.dead) continue;
    b.life -= dt;
    b.px = b.x;
    b.py = b.y;
    const nx = b.x + b.vx * dt;
    const ny = b.y + b.vy * dt;

    let bestT = 1;
    let hitZ = null;
    let hitObstacle = false;

    for (const s of solids) {
      const t = segRectT(b.px, b.py, nx, ny, s);
      if (t !== null && t < bestT) { bestT = t; hitZ = null; hitObstacle = true; }
    }
    for (const z of zombies) {
      if (z.dead || b.hit.has(z.id)) continue;
      const t = segCircleT(b.px, b.py, nx, ny, z.x, z.y, z.r + 2);
      if (t !== null && t < bestT - 1e-4) { bestT = t; hitZ = z; hitObstacle = false; }
    }

    const ix = b.px + (nx - b.px) * bestT;
    const iy = b.py + (ny - b.py) * bestT;

    if (hitZ) {
      const crit = b.crit;
      const dmg = b.dmg * (crit ? 2.2 : 1);
      hitZ.hp -= dmg;
      hitZ.flash = 0.12;
      hitZ.stagger = 0.1;
      const il = hyp(b.vx, b.vy) || 1;
      const kb = (crit ? 150 : 105) / hitZ.mass;
      hitZ.kx += (b.vx / il) * kb;
      hitZ.ky += (b.vy / il) * kb;
      bloodBurst(ix, iy, crit ? 9 : 5, 0.75);
      damageText(ix + rand(-5, 5), iy - 10, String(Math.round(dmg)), crit ? '#ffd06a' : '#f4f7f7', crit);
      Sound.hit(crit);
      game.hitMarker = 0.14;
      game.hitCrit = crit;
      b.hit.add(hitZ.id);
      b.pierce--;
      if (b.pierce < 0) { b.dead = true; b.x = ix; b.y = iy; }
      if (hitZ.hp <= 0) killZombie(hitZ);
    } else if (hitObstacle) {
      sparkBurst(ix, iy, b.color, 5);
      b.dead = true;
      b.x = ix; b.y = iy;
    } else {
      b.x = nx; b.y = ny;
    }

    if (b.life <= 0 || b.x < -30 || b.y < -30 || b.x > WORLD.w + 30 || b.y > WORLD.h + 30) b.dead = true;
  }
  bullets = bullets.filter(b => !b.dead);
  zombies = zombies.filter(z => !z.dead);
}

function updateEnemyShots(dt) {
  for (const s of enemyShots) {
    s.life -= dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (pointInSolid(s.x, s.y, 4)) { acidSplash(s.x, s.y); s.dead = true; continue; }
    if (hyp(s.x - player.x, s.y - player.y) < s.r + player.r) {
      hurtPlayer(s.dmg, s.x, s.y);
      acidSplash(s.x, s.y);
      s.dead = true;
      continue;
    }
    if (s.life <= 0 || s.x < 0 || s.y < 0 || s.x > WORLD.w || s.y > WORLD.h) {
      acidSplash(s.x, s.y);
      s.dead = true;
    }
  }
  enemyShots = enemyShots.filter(s => !s.dead);
}

function acidSplash(x, y) {
  puddles.push({ x, y, r: rand(26, 40), life: 5, max: 5, seed: rand(TAU) });
  for (let i = 0; i < 8; i++) {
    particles.push({
      type: 'acid', x, y,
      vx: rand(-90, 90), vy: rand(-90, 90),
      life: rand(0.25, 0.55), max: 0.55, size: rand(2, 5),
      color: '150,255,90', drag: 4, grav: 0, rot: 0, vr: 0
    });
  }
  Sound.spit();
}

function updatePuddles(dt) {
  for (const p of puddles) {
    p.life -= dt;
    if (p.life <= 0) continue;
    if (hyp(player.x - p.x, player.y - p.y) < p.r + player.r * 0.55 && player.acidCd <= 0) {
      player.acidCd = 0.7;
      hurtPlayer(5, p.x, p.y);
    }
  }
  puddles = puddles.filter(p => p.life > 0);
}

/* ------------------------------------------------------------
   Botín, experiencia y partículas
------------------------------------------------------------ */
function spawnXp(z) {
  const n = clamp(Math.ceil(z.xp), 1, 5);
  const val = z.xp / n;
  for (let i = 0; i < n; i++) {
    pickups.push({
      type: 'xp', x: z.x + rand(-16, 16), y: z.y + rand(-16, 16),
      value: val, r: 5, bob: rand(TAU), dead: false
    });
  }
}

function spawnPickup(type, x, y) {
  pickups.push({ type, x, y, r: 10, bob: rand(TAU), dead: false, value: 0 });
}

function maybeDrop(z) {
  if (z.type === 'boss') {
    spawnPickup('medkit', z.x - 26, z.y);
    spawnPickup('ammo', z.x + 24, z.y + 10);
    spawnPickup('adrenaline', z.x, z.y + 34);
    return;
  }
  const r = Math.random();
  if (r < 0.05) spawnPickup('medkit', z.x, z.y);
  else if (r < 0.17) spawnPickup('ammo', z.x, z.y);
  else if (r < 0.2) spawnPickup('adrenaline', z.x, z.y);
}

function applyPickup(pu) {
  if (pu.type === 'medkit') {
    const heal = 35;
    player.hp = Math.min(player.maxHp, player.hp + heal);
    damageText(player.x, player.y - 30, '+' + heal, '#9cff6e', false);
    showToast('VIDA +' + heal, 'good');
    Sound.heal();
  } else if (pu.type === 'ammo') {
    for (const w of player.weapons) {
      if (w.reserve !== Infinity) w.reserve += Math.ceil(w.magSize * 1.4 * player.mods.ammoMul);
    }
    showToast('MUNICIÓN RECUPERADA', 'good');
    Sound.pickup('ammo');
  } else if (pu.type === 'adrenaline') {
    game.buffTime = 9;
    showToast('ADRENALINA', 'good');
    Sound.adrenaline();
  }
}

function updatePickups(dt) {
  for (const pu of pickups) {
    if (pu.dead) continue;
    pu.bob += dt * 4;
    if (pu.type === 'xp') {
      const dx = player.x - pu.x, dy = player.y - pu.y;
      const d = hyp(dx, dy) || 1;
      const rad = 120 * player.mods.magnet;
      if (d < rad) {
        const pull = Math.min(720, 240 + (rad - d) * 4.2);
        pu.x += dx / d * pull * dt;
        pu.y += dy / d * pull * dt;
      }
      if (d < player.r + 15) {
        addXp(pu.value);
        pu.dead = true;
        particles.push({
          type: 'spark', x: pu.x, y: pu.y, vx: 0, vy: -40,
          life: 0.25, max: 0.25, size: 3, color: '190,255,140', drag: 4, grav: 0, rot: 0, vr: 0
        });
        Sound.pickup('xp');
      }
    } else if (hyp(player.x - pu.x, player.y - pu.y) < player.r + 21) {
      applyPickup(pu);
      pu.dead = true;
    }
  }
  pickups = pickups.filter(p => !p.dead);
}

function addXp(v) {
  player.xp += v;
  while (player.xp >= player.xpNext) {
    player.xp -= player.xpNext;
    player.level++;
    player.xpNext = xpForLevel(player.level);
    game.levelQueue++;
  }
  if (game.levelQueue > 0 && game.state === 'playing') openLevelUp();
}

function bloodBurst(x, y, count, scale) {
  const sc = scale || 1;
  for (let i = 0; i < count; i++) {
    const a = rand(TAU), sp = rand(30, 230) * sc;
    particles.push({
      type: 'blood', x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: rand(0.25, 0.7), max: 0.7,
      size: rand(1.6, 4.4) * sc,
      color: `${70 + rand(0, 50) | 0},${8 + rand(0, 14) | 0},${10 + rand(0, 10) | 0}`,
      drag: rand(2.5, 5), grav: 0, rot: 0, vr: 0
    });
  }
  stampBlood(x, y, sc);
}

function sparkBurst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = rand(TAU), sp = rand(60, 260);
    particles.push({
      type: 'spark', x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: rand(0.12, 0.3), max: 0.3, size: rand(1, 2.4),
      color: color === '#9ad7ff' ? '150,220,255' : '255,210,140',
      drag: 6, grav: 0, rot: 0, vr: 0
    });
  }
  particles.push({
    type: 'smoke', x, y, vx: 0, vy: -18,
    life: 0.35, max: 0.35, size: rand(3, 7), color: '170,175,170', drag: 3, grav: 0, rot: 0, vr: 0
  });
}

function stampBlood(x, y, scale) {
  if (!gctx) return;
  const g = gctx;
  const sc = scale || 1;
  g.save();
  g.globalAlpha = 0.5;
  for (let i = 0; i < 4; i++) {
    g.fillStyle = `rgba(${72 + rand(0, 40) | 0},${8 + rand(0, 10) | 0},${10 + rand(0, 8) | 0},${rand(0.25, 0.5)})`;
    g.beginPath();
    g.ellipse(
      x + rand(-14, 14) * sc, y + rand(-10, 10) * sc,
      rand(2, 8) * sc, rand(1.4, 5) * sc, rand(TAU), 0, TAU
    );
    g.fill();
  }
  g.restore();
}

function stampCorpse(z) {
  if (!gctx) return;
  const g = gctx;
  const r = z.r || 15;
  g.save();
  g.translate(z.x, z.y);
  g.rotate(z.angle || 0);
  // charco
  g.fillStyle = 'rgba(60,8,9,.34)';
  g.beginPath(); g.ellipse(0, 0, r * 2.2, r * 1.5, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(42,8,8,.5)';
  g.beginPath(); g.ellipse(0, 0, r * 1.5, r * 1.05, 0, 0, TAU); g.fill();
  // cuerpo
  g.fillStyle = 'rgba(35,18,15,.86)';
  g.beginPath(); g.ellipse(0, 0, r * 0.95, r * 0.56, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(62,27,21,.75)';
  g.beginPath(); g.arc(r * 0.55, 0, r * 0.42, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(44,20,17,.78)';
  g.lineWidth = Math.max(2, r * 0.22);
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(-r * 0.2, -r * 0.35); g.lineTo(-r * 1.15, -r * 0.85); g.stroke();
  g.beginPath(); g.moveTo(-r * 0.2, r * 0.35); g.lineTo(-r * 1.05, r * 0.95); g.stroke();
  g.beginPath(); g.moveTo(r * 0.2, -r * 0.3); g.lineTo(r * 0.9, -r * 0.8); g.stroke();
  g.restore();
}

function damageText(x, y, text, color, crit) {
  texts.push({
    x, y, vy: -38, life: 0.8, max: 0.8, text, color,
    size: crit ? 21 : 15, crit: !!crit
  });
}

function updateTexts(dt) {
  for (const t of texts) {
    t.life -= dt;
    t.y += t.vy * dt;
    t.vy *= Math.exp(-2 * dt);
  }
  texts = texts.filter(t => t.life > 0);
}

function updateParticles(dt) {
  for (const p of particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.exp(-p.drag * dt);
    p.vy *= Math.exp(-p.drag * dt);
    if (p.grav) p.vy += p.grav * dt;
    p.rot += p.vr * dt;
  }
  particles = particles.filter(p => p.life > 0);
  if (particles.length > 700) particles.splice(0, particles.length - 700);
}

function updateFlashes(dt) {
  for (const f of flashes) f.life -= dt;
  flashes = flashes.filter(f => f.life > 0);
}

/* ------------------------------------------------------------
   Oleadas
------------------------------------------------------------ */
function startWave(n) {
  game.wave = n;
  game.waveState = 'fight';
  game.waveTimer = 0;
  game.spawnTimer = 0.6;
  game.spawnBudget = Math.round(7 + n * 3 + n * n * 0.45);
  game.maxAlive = Math.min(isTouch ? 52 : 76, 12 + n * 3);
  game.bossId = null;

  if (n % 5 === 0) {
    showToast('¡TITÁN!', 'danger');
    spawnZombie('boss');
    game.spawnBudget = Math.round(game.spawnBudget * 0.55);
    game.lightning = 0.6;
    Sound.roar();
  } else {
    showToast(`OLEADA ${pad2(n)}`, n === 1 ? '' : '');
    Sound.wave();
  }
  updateHud(true);
}

function updateWaves(dt) {
  if (game.state !== 'playing') return;
  zombies = zombies.filter(z => !z.dead);
  if (game.waveState === 'fight') {
    game.waveTimer += dt;
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0 && game.spawnBudget > 0 && zombies.length < game.maxAlive) {
      const room = game.maxAlive - zombies.length;
      const batch = Math.min(game.spawnBudget, room, 1 + Math.floor(game.wave / 4));
      for (let i = 0; i < batch; i++) {
        spawnZombie(pickZombieType());
        game.spawnBudget--;
      }
      game.spawnTimer = Math.max(0.32, 1.15 - game.wave * 0.05);
    }
    if (game.spawnBudget <= 0 && zombies.length === 0) {
      game.waveState = 'break';
      game.breakTimer = 5.5;
      const bonus = 100 + game.wave * 50;
      game.score += bonus;
      showToast(`OLEADA ${game.wave} SUPERADA  +${bonus}`, 'good');
      Sound.waveClear();
      dropSupply();
    }
  } else if (game.waveState === 'break') {
    game.breakTimer -= dt;
    if (game.breakTimer <= 0) startWave(game.wave + 1);
  }
}

function freeSpotNear(x, y, r) {
  for (let i = 0; i < 30; i++) {
    const a = rand(TAU), d = rand(0, 120);
    const nx = clamp(x + Math.cos(a) * d, 40, WORLD.w - 40);
    const ny = clamp(y + Math.sin(a) * d, 40, WORLD.h - 40);
    if (!pointInSolid(nx, ny, r)) return { x: nx, y: ny };
  }
  return { x, y };
}

function dropSupply() {
  const a = rand(TAU);
  let s = freeSpotNear(player.x + Math.cos(a) * 80, player.y + Math.sin(a) * 80, 18);
  spawnPickup('medkit', s.x, s.y);
  s = freeSpotNear(player.x + Math.cos(a + 2.2) * 90, player.y + Math.sin(a + 2.2) * 90, 18);
  spawnPickup('ammo', s.x, s.y);
  if (game.wave % 3 === 0) {
    s = freeSpotNear(player.x + Math.cos(a + 4.1) * 70, player.y + Math.sin(a + 4.1) * 70, 18);
    spawnPickup('adrenaline', s.x, s.y);
  }
}

/* ------------------------------------------------------------
   Cámara, efectos y bucle de actualización
------------------------------------------------------------ */
function updateCamera(dt) {
  if (!player) return;
  const tx = player.x + Math.cos(player.angle) * 36;
  const ty = player.y + Math.sin(player.angle) * 36;
  const k = 1 - Math.exp(-7 * dt);
  camera.x = lerp(camera.x, tx, k);
  camera.y = lerp(camera.y, ty, k);
  const hw = view.w / 2, hh = view.h / 2;
  if (view.w >= WORLD.w) camera.x = WORLD.w / 2;
  else camera.x = clamp(camera.x, hw, WORLD.w - hw);
  if (view.h >= WORLD.h) camera.y = WORLD.h / 2;
  else camera.y = clamp(camera.y, hh, WORLD.h - hh);
  camera.shake *= Math.exp(-6.5 * dt);
  if (camera.shake < 0.04) camera.shake = 0;
}

function updateEffects(dt) {
  game.redFlash = Math.max(0, game.redFlash - dt * 2.6);
  dom.damage.style.opacity = (game.redFlash * 0.9).toFixed(3);
  game.hitMarker = Math.max(0, game.hitMarker - dt);
  game.lightning = Math.max(0, game.lightning - dt * 3.2);
  game.nextLightning -= dt;
  if (game.nextLightning <= 0) {
    game.lightning = 1;
    game.nextLightning = rand(16, 32);
    if (Sound.ready) Sound.thunder();
  }
}

function updateWorld(dt) {
  game.time += dt;
  game.buffTime = Math.max(0, game.buffTime - dt);

  if (game.state === 'dying') {
    game.deathTimer -= dt;
    updateZombies(dt * 0.35);
    updateBullets(dt * 0.35);
    updateParticles(dt);
    updateTexts(dt);
    updateFlashes(dt);
    updateEffects(dt);
    updateCamera(dt);
    if (game.deathTimer <= 0) endGame();
    return;
  }

  updatePlayer(dt);
  updateZombies(dt);
  updateBullets(dt);
  if (game.state !== 'playing') {
    updateParticles(dt);
    updateTexts(dt);
    updateFlashes(dt);
    updateEffects(dt);
    updateCamera(dt);
    return;
  }
  updateEnemyShots(dt);
  updatePuddles(dt);
  updatePickups(dt);
  updateParticles(dt);
  updateTexts(dt);
  updateFlashes(dt);
  updateEffects(dt);

  if (game.state === 'playing') {
    updateWaves(dt);
    updateCamera(dt);

    game.scoreAcc += dt * 2;
    if (game.scoreAcc >= 1) {
      const n = Math.floor(game.scoreAcc);
      game.score += n;
      game.scoreAcc -= n;
    }

    game.groanTimer -= dt;
    if (game.groanTimer <= 0) {
      game.groanTimer = rand(4, 9);
      if (zombies.length && Math.random() < 0.65) Sound.groan();
    }

    updateHud();
  }
}
