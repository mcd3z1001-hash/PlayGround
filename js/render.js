'use strict';
/* ============================================================
   Render: mundo, personajes, luz, efectos y bucle principal
   ============================================================ */

function inView(x, y, cx, cy, margin) {
  const m = margin || 90;
  return x > cx - view.w / 2 - m && x < cx + view.w / 2 + m &&
    y > cy - view.h / 2 - m && y < cy + view.h / 2 + m;
}
function sxOf(x, cx) { return (x - cx) * zoom + W / 2; }
function syOf(y, cy) { return (y - cy) * zoom + H / 2; }

/* ------------------------------------------------------------
   Entidades del mundo
------------------------------------------------------------ */
function drawEntities(cx, cy, t) {
  const items = [];

  for (const p of props) {
    if (!inView(p.x, p.y, cx, cy, 120)) continue;
    items.push({ sort: p.sortY, kind: 'prop', p });
  }
  for (const z of zombies) {
    if (z.dead || !inView(z.x, z.y, cx, cy, 120)) continue;
    items.push({ sort: z.y + z.r, kind: 'zombie', z });
  }
  if (player) items.push({ sort: player.y + 13, kind: 'player' });

  items.sort((a, b) => a.sort - b.sort);

  // sombras
  for (const it of items) {
    if (it.kind === 'prop') {
      drawPropShadow(it.p);
    } else if (it.kind === 'zombie') {
      const z = it.z;
      ctx.fillStyle = 'rgba(0,0,0,.38)';
      ctx.beginPath();
      ctx.ellipse(z.x + 4, z.y + 5, z.r * 0.95, z.r * 0.55, 0, 0, TAU);
      ctx.fill();
      if (z.type === 'boss' && z.bossState === 'windup') {
        ctx.strokeStyle = 'rgba(255,70,50,.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r + 55 + Math.sin(t * 22) * 4, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,70,50,.2)';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r + 55, 0, TAU);
        ctx.stroke();
      }
    } else if (it.kind === 'player' && player) {
      ctx.fillStyle = 'rgba(0,0,0,.42)';
      ctx.beginPath();
      ctx.ellipse(player.x + 3, player.y + 6, 13, 7, 0, 0, TAU);
      ctx.fill();
    }
  }

  // cuerpos
  for (const it of items) {
    if (it.kind === 'prop') drawProp(it.p, t);
    else if (it.kind === 'zombie') drawZombie(it.z, t);
    else if (it.kind === 'player') drawPlayer(t);
  }
}

function drawZombie(z, t) {
  const s = z.r / 15;
  const wob = Math.sin(t * 7.5 + z.seed) * 2.4;
  const flash = z.flash > 0;

  ctx.save();
  ctx.translate(z.x, z.y);
  if (z.lunge > 0) {
    ctx.translate(Math.cos(z.angle) * 4, Math.sin(z.angle) * 4);
  }
  ctx.rotate(z.angle);
  ctx.scale(s, s);

  // piernas
  ctx.fillStyle = '#1c1816';
  rr(ctx, -9, -7 + wob * 0.3, 11, 4.8, 2.4); ctx.fill();
  rr(ctx, -9, 2.2 - wob * 0.3, 11, 4.8, 2.4); ctx.fill();

  // brazos traseros
  const skin = z.type === 'boss' ? '#7a6552' : z.type === 'brute' ? '#83885f' : '#8d9b72';
  const cloth = z.type === 'boss' ? '#2c1b18'
    : z.type === 'brute' ? '#3c2f27'
      : z.type === 'spitter' ? '#2d3a28'
        : ['#3a2f2a', '#2b3833', '#35303a', '#3c3530'][z.id % 4];

  ctx.strokeStyle = skin;
  ctx.lineWidth = z.type === 'brute' || z.type === 'boss' ? 4.4 : 3.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(3, -6);
  ctx.lineTo(15, -9 + wob * 0.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(3, 6);
  ctx.lineTo(14, 9 - wob * 0.35);
  ctx.stroke();
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(15, -9 + wob * 0.35, 2.1, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(14, 9 - wob * 0.35, 2.1, 0, TAU); ctx.fill();

  // torso
  ctx.fillStyle = cloth;
  ctx.beginPath();
  ctx.ellipse(0, 0, z.type === 'brute' || z.type === 'boss' ? 11 : 9.5, z.type === 'brute' || z.type === 'boss' ? 9.5 : 8, 0, 0, TAU);
  ctx.fill();
  // harapos
  ctx.fillStyle = 'rgba(10,10,10,.35)';
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * 0.55 + i * 0.45;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
    ctx.lineTo(Math.cos(a) * 11.5, Math.sin(a) * 11.5);
    ctx.lineTo(Math.cos(a + 0.22) * 8, Math.sin(a + 0.22) * 8);
    ctx.closePath();
    ctx.fill();
  }

  // hombreras
  if (z.type === 'brute' || z.type === 'boss') {
    ctx.fillStyle = z.type === 'boss' ? '#4a2a22' : '#332b24';
    ctx.beginPath(); ctx.ellipse(1, -7.5, 5, 3.2, -0.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(1, 7.5, 5, 3.2, 0.2, 0, TAU); ctx.fill();
  }

  // saco de ácido
  if (z.type === 'spitter') {
    const puls = 1 + Math.sin(t * 6 + z.seed) * 0.12;
    ctx.fillStyle = 'rgba(110,180,60,.85)';
    ctx.beginPath(); ctx.ellipse(-3.5, 0, 5 * puls, 4.2 * puls, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(190,255,120,.45)';
    ctx.beginPath(); ctx.ellipse(-3.5, -1, 2.2, 1.8, 0, 0, TAU); ctx.fill();
  }

  // púas del titán
  if (z.type === 'boss') {
    ctx.fillStyle = '#6e4a38';
    for (let i = 0; i < 5; i++) {
      const yy = -7 + i * 3.5;
      ctx.beginPath();
      ctx.moveTo(-7, yy);
      ctx.lineTo(-13, yy + 1.2);
      ctx.lineTo(-7.5, yy + 2.4);
      ctx.closePath();
      ctx.fill();
    }
  }

  // cabeza
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(7.2, 0, z.type === 'brute' || z.type === 'boss' ? 5.6 : 5.1, 0, TAU);
  ctx.fill();
  // pelo / costra
  ctx.fillStyle = 'rgba(25,22,18,.7)';
  ctx.beginPath();
  ctx.arc(5.2, 0, 5.2, Math.PI * 0.6, Math.PI * 1.4);
  ctx.fill();
  // boca
  ctx.fillStyle = 'rgba(80,10,10,.75)';
  ctx.beginPath(); ctx.arc(10.6, 0, 1.5, 0, TAU); ctx.fill();

  if (flash) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,235,220,${0.35 + 0.4 * (z.flash / 0.12)})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 10, 0, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.restore();
}

function drawPlayer(t) {
  const p = player;
  if (!p) return;
  const w = p.weapons[p.weaponIndex];
  const swing = Math.sin(p.walkPhase * 2.2) * 3;
  const dying = game.state === 'dying' || game.state === 'gameover';

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  if (dying) ctx.globalAlpha = 0.55;
  else if (p.invuln > 0) ctx.globalAlpha = 0.62 + 0.38 * Math.sin(t * 42);

  // halo tenue para separar al jugador del asfalto
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pg = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
  pg.addColorStop(0, 'rgba(255,206,150,.2)');
  pg.addColorStop(0.45, 'rgba(255,180,100,.09)');
  pg.addColorStop(1, 'rgba(255,160,70,0)');
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill();
  ctx.restore();

  // piernas
  ctx.fillStyle = '#1c2730';
  rr(ctx, -9, -7 + swing, 12, 5, 2.5); ctx.fill();
  rr(ctx, -9, 2 - swing, 12, 5, 2.5); ctx.fill();

  // mochila
  ctx.fillStyle = '#2a231b';
  rr(ctx, -14, -6.5, 7, 13, 3); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.06)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(-12, 4); ctx.stroke();

  // torso
  const tg = ctx.createLinearGradient(-8, -8, 8, 8);
  tg.addColorStop(0, '#4a5b66');
  tg.addColorStop(0.55, '#36454f');
  tg.addColorStop(1, '#25323b');
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.ellipse(0, 0, 10, 8.2, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // chaleco
  ctx.fillStyle = 'rgba(40,52,42,.75)';
  rr(ctx, -2, -6.2, 7, 12.4, 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,190,100,.25)';
  ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 4); ctx.stroke();

  // brazos
  ctx.strokeStyle = '#c39a73';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(3, -6); ctx.lineTo(12, -4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(3, 6); ctx.lineTo(12, 4); ctx.stroke();
  ctx.fillStyle = '#c39a73';
  ctx.beginPath(); ctx.arc(12.5, -4, 2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(12.5, 4, 2, 0, TAU); ctx.fill();

  // arma
  ctx.fillStyle = '#181c20';
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 0.8;
  if (w.id === 'pistol') {
    rr(ctx, 9, -1.6, 11, 3.2, 1); ctx.fill(); ctx.stroke();
    rr(ctx, 11, 1.2, 3, 5, 1); ctx.fill();
  } else if (w.id === 'shotgun') {
    rr(ctx, 8, -2, 23, 4, 1); ctx.fill(); ctx.stroke();
    rr(ctx, 14, -3.4, 6, 6.8, 1.2); ctx.fill();
    ctx.fillStyle = '#3a2a1b';
    rr(ctx, 5, -2.6, 5, 5.2, 1); ctx.fill();
  } else if (w.id === 'smg') {
    rr(ctx, 8, -2, 17, 4, 1); ctx.fill(); ctx.stroke();
    rr(ctx, 13, 1.4, 4, 7, 1); ctx.fill();
    rr(ctx, 18, -2.8, 4, 1.8, 0.8); ctx.fill();
  } else {
    rr(ctx, 7, -1.6, 26, 3.2, 1); ctx.fill(); ctx.stroke();
    rr(ctx, 15, -4.2, 8, 2.2, 1); ctx.fill();
    rr(ctx, 11, 1.2, 4, 6, 1); ctx.fill();
  }

  // cabeza
  ctx.fillStyle = '#caa078';
  ctx.beginPath(); ctx.arc(5, 0, 5, 0, TAU); ctx.fill();
  // gorra
  ctx.fillStyle = '#39463b';
  ctx.beginPath(); ctx.arc(4.3, 0, 5.05, Math.PI * 0.55, Math.PI * 1.45); ctx.fill();
  ctx.fillStyle = '#2c372e';
  rr(ctx, 5, -4.6, 4.4, 9.2, 1.4); ctx.fill();
  // pelo / nuca
  ctx.fillStyle = 'rgba(30,22,16,.8)';
  ctx.beginPath(); ctx.arc(2.2, 0, 4.6, Math.PI * 0.55, Math.PI * 1.45); ctx.fill();

  if (p.flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,90,70,${p.flash * 3})`;
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.restore();
}

function drawPickups(t) {
  for (const pu of pickups) {
    if (pu.dead) continue;
    if (!inView(pu.x, pu.y, camera.x, camera.y, 60)) continue;
    const bob = Math.sin(pu.bob) * 2.5;
    ctx.save();
    ctx.translate(pu.x, pu.y + bob);
    if (pu.type === 'xp') {
      ctx.rotate(t * 1.6 + pu.bob);
      ctx.fillStyle = '#a8ff6e';
      ctx.shadowColor = 'rgba(150,255,100,.8)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -5.5); ctx.lineTo(4.2, 0); ctx.lineTo(0, 5.5); ctx.lineTo(-4.2, 0);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(240,255,220,.8)';
      ctx.beginPath();
      ctx.moveTo(0, -2.6); ctx.lineTo(1.8, 0); ctx.lineTo(0, 2.6); ctx.lineTo(-1.8, 0);
      ctx.closePath(); ctx.fill();
    } else if (pu.type === 'medkit') {
      ctx.fillStyle = 'rgba(225,232,228,.95)';
      rr(ctx, -8, -6.5, 16, 13, 2); ctx.fill();
      ctx.fillStyle = '#d6423a';
      ctx.fillRect(-1.8, -4.4, 3.6, 8.8);
      ctx.fillRect(-4.4, -1.8, 8.8, 3.6);
      ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1;
      rr(ctx, -8, -6.5, 16, 13, 2); ctx.stroke();
    } else if (pu.type === 'ammo') {
      ctx.fillStyle = '#56603c';
      rr(ctx, -9, -6, 18, 12, 2); ctx.fill();
      ctx.fillStyle = '#8d9a5c';
      ctx.fillRect(-9, -6, 18, 3);
      ctx.fillStyle = '#d9b356';
      for (let i = -2; i <= 2; i++) ctx.fillRect(i * 3 - 1, -2, 2, 6);
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1;
      rr(ctx, -9, -6, 18, 12, 2); ctx.stroke();
    } else {
      ctx.rotate(-0.65);
      ctx.fillStyle = '#ffcf6b';
      rr(ctx, -2.4, -8, 4.8, 12, 1.5); ctx.fill();
      ctx.fillStyle = '#9aa6ac';
      ctx.fillRect(-0.8, 4, 1.6, 6);
      ctx.fillStyle = '#d9e0e3';
      ctx.fillRect(-3.6, -10, 7.2, 2.4);
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.fillRect(-1.4, -6, 1.2, 7);
    }
    ctx.restore();
  }
}

function drawPuddles(t) {
  for (const p of puddles) {
    if (!inView(p.x, p.y, camera.x, camera.y, 60)) continue;
    const a = clamp(p.life / p.max, 0, 1);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.seed);
    ctx.fillStyle = `rgba(90,165,60,${0.22 * a})`;
    ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.68, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(160,255,100,${0.16 * a})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = `rgba(180,255,120,${0.1 * a})`;
    ctx.beginPath(); ctx.ellipse(-p.r * 0.2, -p.r * 0.15, p.r * 0.35, p.r * 0.22, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of particles) {
    const a = clamp(p.life / p.max, 0, 1);
    if (p.type === 'spark') {
      ctx.strokeStyle = `rgba(${p.color},${a})`;
      ctx.lineWidth = p.size;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
      ctx.stroke();
    } else if (p.type === 'smoke' || p.type === 'dust') {
      ctx.fillStyle = `rgba(${p.color},${a * (p.type === 'smoke' ? 0.2 : 0.24)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + (1 - a) * 1.8), 0, TAU);
      ctx.fill();
    } else if (p.type === 'shell') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = `rgba(${p.color},${a})`;
      ctx.fillRect(-1.5, -0.8, 3, 1.6);
      ctx.restore();
    } else if (p.type === 'acid') {
      ctx.fillStyle = `rgba(${p.color},${a})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = `rgba(${p.color},${a * 0.85})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
  }
}

/* ------------------------------------------------------------
   Iluminación
------------------------------------------------------------ */
function drawLighting(cx, cy, t) {
  const px = sxOf(player.x, cx);
  const py = syOf(player.y, cy);

  lctx.setTransform(1, 0, 0, 1, 0, 0);
  lctx.clearRect(0, 0, W, H);
  lctx.fillStyle = 'rgba(3,6,12,.63)';
  lctx.fillRect(0, 0, W, H);
  lctx.globalCompositeOperation = 'destination-out';

  // luz ambiental del jugador
  const ambR = 330 * zoom;
  let g = lctx.createRadialGradient(px, py, 12, px, py, ambR);
  g.addColorStop(0, 'rgba(0,0,0,.99)');
  g.addColorStop(0.4, 'rgba(0,0,0,.74)');
  g.addColorStop(0.7, 'rgba(0,0,0,.4)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  lctx.fillStyle = g;
  lctx.beginPath(); lctx.arc(px, py, ambR, 0, TAU); lctx.fill();

  // linterna: dos haces superpuestos para un cono legible
  const dist = 680 * zoom;
  const beam = (spread, strength) => {
    lctx.save();
    lctx.beginPath();
    lctx.moveTo(px, py);
    lctx.arc(px, py, dist, player.angle - spread, player.angle + spread);
    lctx.closePath();
    lctx.clip();
    const cg = lctx.createRadialGradient(px, py, 16, px, py, dist);
    cg.addColorStop(0, `rgba(0,0,0,${strength})`);
    cg.addColorStop(0.22, `rgba(0,0,0,${strength * 0.92})`);
    cg.addColorStop(0.6, `rgba(0,0,0,${strength * 0.58})`);
    cg.addColorStop(0.88, `rgba(0,0,0,${strength * 0.2})`);
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = cg;
    lctx.fillRect(px - dist, py - dist, dist * 2, dist * 2);
    lctx.restore();
  };
  beam(0.62, 0.5);
  beam(0.34, 0.9);

  // farolas
  for (const l of lampLights) {
    const lx = sxOf(l.x, cx), ly = syOf(l.y, cy);
    if (lx < -220 || lx > W + 220 || ly < -220 || ly > H + 220) continue;
    const flick = 0.78 + Math.sin(t * 8 + l.seed) * 0.09 + Math.sin(t * 27 + l.seed * 4) * 0.06;
    const r = l.r * zoom;
    const lg = lctx.createRadialGradient(lx, ly, 4, lx, ly, r);
    lg.addColorStop(0, `rgba(0,0,0,${0.62 * flick})`);
    lg.addColorStop(0.55, `rgba(0,0,0,${0.28 * flick})`);
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = lg;
    lctx.beginPath(); lctx.arc(lx, ly, r, 0, TAU); lctx.fill();
  }

  // fuegos
  for (const f of fireLights) {
    const fx = sxOf(f.x, cx), fy = syOf(f.y, cy);
    if (fx < -180 || fx > W + 180 || fy < -180 || fy > H + 180) continue;
    const flick = 0.8 + Math.sin(t * 17 + f.seed) * 0.16 + Math.sin(t * 41 + f.seed * 2) * 0.08;
    const r = f.r * zoom;
    const fg = lctx.createRadialGradient(fx, fy, 4, fx, fy, r);
    fg.addColorStop(0, `rgba(0,0,0,${0.6 * flick})`);
    fg.addColorStop(0.6, `rgba(0,0,0,${0.25 * flick})`);
    fg.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = fg;
    lctx.beginPath(); lctx.arc(fx, fy, r, 0, TAU); lctx.fill();
  }

  // fogonazos
  for (const f of flashes) {
    const fx = sxOf(f.x, cx), fy = syOf(f.y, cy);
    const a = clamp(f.life / f.max, 0, 1);
    const r = f.size * 4.2 * zoom;
    const fg = lctx.createRadialGradient(fx, fy, 0, fx, fy, r);
    fg.addColorStop(0, `rgba(0,0,0,${0.9 * a})`);
    fg.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = fg;
    lctx.beginPath(); lctx.arc(fx, fy, r, 0, TAU); lctx.fill();
  }

  lctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(lightCanvas, 0, 0, W, H);

  // tintes cálidos y brillos aditivos
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (const l of lampLights) {
    const lx = sxOf(l.x, cx), ly = syOf(l.y, cy);
    if (lx < -160 || lx > W + 160 || ly < -160 || ly > H + 160) continue;
    const flick = 0.8 + Math.sin(t * 8 + l.seed) * 0.1 + Math.sin(t * 27 + l.seed * 4) * 0.06;
    const r = l.r * 1.05 * zoom;
    const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, r);
    lg.addColorStop(0, `rgba(255,184,96,${0.13 * flick})`);
    lg.addColorStop(0.45, `rgba(255,150,60,${0.05 * flick})`);
    lg.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(lx, ly, r, 0, TAU); ctx.fill();
  }

  for (const f of fireLights) {
    const fx = sxOf(f.x, cx), fy = syOf(f.y, cy);
    if (fx < -160 || fx > W + 160 || fy < -160 || fy > H + 160) continue;
    const flick = 0.8 + Math.sin(t * 17 + f.seed) * 0.2;
    const r = f.r * zoom;
    const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, r);
    fg.addColorStop(0, `rgba(255,130,40,${0.17 * flick})`);
    fg.addColorStop(0.5, `rgba(255,90,20,${0.06 * flick})`);
    fg.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(fx, fy, r, 0, TAU); ctx.fill();
  }

  // aura de la linterna
  const fl = ctx.createRadialGradient(px, py, 0, px, py, 300 * zoom);
  fl.addColorStop(0, 'rgba(255,190,110,.05)');
  fl.addColorStop(1, 'rgba(255,150,60,0)');
  ctx.fillStyle = fl;
  ctx.beginPath(); ctx.arc(px, py, 300 * zoom, 0, TAU); ctx.fill();

  // haz cálido visible sobre el suelo
  const cone = (spread, alpha) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, dist * 0.96, player.angle - spread, player.angle + spread);
    ctx.closePath();
    ctx.clip();
    const bg = ctx.createRadialGradient(px, py, 0, px, py, dist * 0.96);
    bg.addColorStop(0, `rgba(255,198,124,${alpha})`);
    bg.addColorStop(0.35, `rgba(255,176,88,${alpha * 0.6})`);
    bg.addColorStop(0.75, `rgba(255,150,52,${alpha * 0.2})`);
    bg.addColorStop(1, 'rgba(255,130,30,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(px - dist, py - dist, dist * 2, dist * 2);
    ctx.restore();
  };
  cone(0.55, 0.085);
  cone(0.3, 0.095);

  // brillo de la munición / botiquín / ácido
  for (const pu of pickups) {
    if (!inView(pu.x, pu.y, cx, cy, 40)) continue;
    const gx = sxOf(pu.x, cx), gy = syOf(pu.y, cy);
    const col = pu.type === 'medkit' ? '255,90,80' : pu.type === 'ammo' ? '255,200,90' : pu.type === 'xp' ? '150,255,100' : '255,180,70';
    const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, 22 * zoom);
    rg.addColorStop(0, `rgba(${col},.17)`);
    rg.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(gx, gy, 22 * zoom, 0, TAU); ctx.fill();
  }
  for (const p of puddles) {
    if (!inView(p.x, p.y, cx, cy, 40)) continue;
    const gx = sxOf(p.x, cx), gy = syOf(p.y, cy);
    const a = clamp(p.life / p.max, 0, 1);
    const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, p.r * 1.6 * zoom);
    rg.addColorStop(0, `rgba(120,255,80,${0.07 * a})`);
    rg.addColorStop(1, 'rgba(80,200,50,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(gx, gy, p.r * 1.6 * zoom, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/* ------------------------------------------------------------
   Capas superiores
------------------------------------------------------------ */
function drawBullets(cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of bullets) {
    const x = sxOf(b.x, cx), y = syOf(b.y, cy);
    if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
    const l = hyp(b.vx, b.vy) || 1;
    const tx = x - b.vx / l * 17;
    const ty = y - b.vy / l * 17;
    ctx.strokeStyle = b.color;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff8e8';
    ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawFlashes(cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const f of flashes) {
    const x = sxOf(f.x, cx), y = syOf(f.y, cy);
    const a = clamp(f.life / f.max, 0, 1);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(f.a);
    const size = f.size * zoom;
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.5);
    gr.addColorStop(0, `rgba(255,245,200,${0.9 * a})`);
    gr.addColorStop(0.35, `rgba(255,190,90,${0.45 * a})`);
    gr.addColorStop(1, 'rgba(255,140,30,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(0, 0, size * 1.5, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,248,215,${0.9 * a})`;
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(size * 0.22, size * 0.2);
    ctx.lineTo(size * 0.5, size * 0.5);
    ctx.lineTo(size * 0.16, size * 0.26);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.16, size * 0.26);
    ctx.lineTo(-size * 0.5, size * 0.5);
    ctx.lineTo(-size * 0.22, size * 0.2);
    ctx.lineTo(-size, 0);
    ctx.lineTo(-size * 0.2, -size * 0.2);
    ctx.lineTo(-size * 0.4, -size * 0.4);
    ctx.lineTo(-size * 0.1, -size * 0.2);
    ctx.lineTo(0, -size * 0.7);
    ctx.lineTo(size * 0.1, -size * 0.2);
    ctx.lineTo(size * 0.4, -size * 0.4);
    ctx.lineTo(size * 0.2, -size * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawEyes(cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const z of zombies) {
    if (z.dead || !inView(z.x, z.y, cx, cy, 20)) continue;
    const d = hyp(z.x - player.x, z.y - player.y);
    if (d > 760) continue;
    if (!hasLineOfSight(player.x, player.y, z.x, z.y)) continue;
    const s = z.r / 15;
    const hx = z.x + Math.cos(z.angle) * (7.2 * s);
    const hy = z.y + Math.sin(z.angle) * (7.2 * s);
    const ox = Math.cos(z.angle + Math.PI / 2) * (2.1 * s);
    const oy = Math.sin(z.angle + Math.PI / 2) * (2.1 * s);
    const x1 = sxOf(hx + ox, cx), y1 = syOf(hy + oy, cy);
    const x2 = sxOf(hx - ox, cx), y2 = syOf(hy - oy, cy);
    const boss = z.type === 'boss';
    const col = boss ? '255,80,60' : z.type === 'spitter' ? '180,255,90' : '190,255,120';
    ctx.fillStyle = `rgba(${col},.18)`;
    ctx.beginPath(); ctx.arc(x1, y1, 5.5, 0, TAU); ctx.arc(x2, y2, 5.5, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(${col},.95)`;
    ctx.beginPath(); ctx.arc(x1, y1, boss ? 2 : 1.6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x2, y2, boss ? 2 : 1.6, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawHealthBars(cx, cy) {
  for (const z of zombies) {
    if (z.dead || z.type === 'boss') continue;
    if (z.hp >= z.maxHp) continue;
    if (hyp(z.x - player.x, z.y - player.y) > 460) continue;
    const x = sxOf(z.x, cx), y = syOf(z.y, cy) - z.r * zoom - 10;
    if (x < -40 || x > W + 40 || y < -20 || y > H + 20) continue;
    const w = 28, h = 3;
    const ratio = clamp(z.hp / z.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(x - w / 2, y, w, h);
    ctx.fillStyle = ratio > 0.55 ? 'rgba(150,220,90,.9)' : ratio > 0.25 ? 'rgba(255,190,70,.95)' : 'rgba(255,80,60,.95)';
    ctx.fillRect(x - w / 2, y, w * ratio, h);
  }
}

function drawTexts(cx, cy) {
  for (const t of texts) {
    const a = clamp(t.life / t.max, 0, 1);
    const x = sxOf(t.x, cx);
    const y = syOf(t.y, cy);
    if (x < -60 || x > W + 60 || y < -30 || y > H + 30) continue;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `800 ${t.size}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.strokeText(t.text, x, y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, x, y);
    ctx.restore();
  }
}

function drawCrosshair() {
  if (isTouch || !player || game.state !== 'playing') return;
  const x = mouse.x, y = mouse.y;
  const gap = 7 + player.recoil * 7;
  const len = 6;
  const hit = game.hitMarker > 0;
  ctx.save();
  ctx.strokeStyle = hit ? (game.hitCrit ? '#ffd06a' : '#ff8a7a') : 'rgba(255,255,255,.88)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - gap - len, y); ctx.lineTo(x - gap, y);
  ctx.moveTo(x + gap, y); ctx.lineTo(x + gap + len, y);
  ctx.moveTo(x, y - gap - len); ctx.lineTo(x, y - gap);
  ctx.moveTo(x, y + gap); ctx.lineTo(x, y + gap + len);
  ctx.stroke();
  ctx.fillStyle = hit ? (game.hitCrit ? '#ffd06a' : '#ff8a7a') : 'rgba(255,255,255,.9)';
  ctx.beginPath(); ctx.arc(x, y, 1.4, 0, TAU); ctx.fill();
  if (hit) {
    ctx.strokeStyle = game.hitCrit ? '#ffd06a' : '#ff9a8a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 7); ctx.lineTo(x - 3, y - 3);
    ctx.moveTo(x + 7, y - 7); ctx.lineTo(x + 3, y - 3);
    ctx.moveTo(x - 7, y + 7); ctx.lineTo(x - 3, y + 3);
    ctx.moveTo(x + 7, y + 7); ctx.lineTo(x + 3, y + 3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWeather() {
  drawRain();
  drawFog(game.time || menuTime, 0.022, 0.012);
  if (game.lightning > 0.01) {
    ctx.fillStyle = `rgba(185,210,255,${game.lightning * 0.2})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/* ------------------------------------------------------------
   Render principal
------------------------------------------------------------ */
function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#05070b';
  ctx.fillRect(0, 0, W, H);

  if (game.state === 'menu') {
    drawMenuScene(menuTime);
    return;
  }
  if (!player) return;

  const shakeX = (Math.random() * 2 - 1) * camera.shake;
  const shakeY = (Math.random() * 2 - 1) * camera.shake;
  const cx = camera.x + shakeX;
  const cy = camera.y + shakeY;

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-cx, -cy);

  if (ground) ctx.drawImage(ground, 0, 0);
  drawPuddles(game.time);
  drawPickups(game.time);
  drawEntities(cx, cy, game.time);
  drawParticles();

  ctx.restore();

  drawLighting(cx, cy, game.time);
  drawBullets(cx, cy);
  drawFlashes(cx, cy);
  drawEyes(cx, cy);
  drawHealthBars(cx, cy);
  drawTexts(cx, cy);
  drawWeather();
  drawCrosshair();
}

/* ------------------------------------------------------------
   Bucle principal
------------------------------------------------------------ */
let lastFrame = 0;

function loop(now) {
  if (!lastFrame) lastFrame = now;
  const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;

  if (game.state === 'menu') {
    updateMenu(dt);
    updateRain(dt);
  } else {
    if (game.state === 'playing' || game.state === 'dying') updateWorld(dt);
    updateRain(dt);
  }
  render();
  requestAnimationFrame(loop);
}

window.__ultimaLuz = {
  get state() { return game.state; },
  get player() { return player; },
  get zombies() { return zombies; },
  get game() { return game; },
  start: startGame,
  pause: togglePause,
  menu: returnToMenu,
  spawn: type => spawnZombie(type || 'walker'),
  addXp,
  choose: i => chooseUpgrade(i),
  get choices() { return levelChoices; },
  toggleMute
};

init();
requestAnimationFrame(loop);
