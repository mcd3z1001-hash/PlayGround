'use strict';
/* ============================================================
   Mundo procedural, props y escena del menú
   ============================================================ */

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(Math.round(((n >> 16) & 255) * f), 0, 255);
  const g = clamp(Math.round(((n >> 8) & 255) * f), 0, 255);
  const b = clamp(Math.round((n & 255) * f), 0, 255);
  return `rgb(${r},${g},${b})`;
}

/* ------------------------------------------------------------
   Generación del mundo
------------------------------------------------------------ */
function buildWorld() {
  ground = document.createElement('canvas');
  ground.width = WORLD.w;
  ground.height = WORLD.h;
  gctx = ground.getContext('2d');
  solids = [];
  props = [];
  lampLights = [];
  fireLights = [];
  const rng = mulberry32(20261031);
  drawGround(rng);
  placeBuildings(rng);
  placeProps(rng);
}

function drawGround(rng) {
  const g = gctx;
  g.fillStyle = '#141b15';
  g.fillRect(0, 0, WORLD.w, WORLD.h);

  // manchas tonales de tierra / hierba
  for (let i = 0; i < 90; i++) {
    const x = rng() * WORLD.w, y = rng() * WORLD.h, r = 40 + rng() * 190;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${26 + (rng() * 30 | 0)},${38 + (rng() * 26 | 0)},${26 + (rng() * 16 | 0)},.24)`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // motas de tierra
  for (let i = 0; i < 8000; i++) {
    const x = rng() * WORLD.w, y = rng() * WORLD.h;
    const v = rng();
    g.fillStyle = v < 0.5 ? 'rgba(58,74,52,.35)' : v < 0.8 ? 'rgba(20,27,21,.5)' : 'rgba(110,98,68,.16)';
    g.fillRect(x, y, 1 + rng() * 2, 1 + rng() * 2);
  }

  // asfalto
  g.fillStyle = '#20252a';
  g.fillRect(0, 690, WORLD.w, 420);
  g.fillRect(990, 0, 420, WORLD.h);

  // parches de asfalto
  for (let i = 0; i < 30; i++) {
    const onH = rng() < 0.5;
    const x = onH ? rng() * WORLD.w : 990 + rng() * 420;
    const y = onH ? 690 + rng() * 420 : rng() * WORLD.h;
    const r = 22 + rng() * 90;
    g.fillStyle = rng() < 0.5 ? 'rgba(10,12,15,.24)' : 'rgba(48,52,55,.08)';
    g.beginPath();
    g.ellipse(x, y, r, r * (0.4 + rng() * 0.6), rng() * TAU, 0, TAU);
    g.fill();
  }
  // gravilla del asfalto
  for (let i = 0; i < 12000; i++) {
    const onH = rng() < 0.5;
    const x = onH ? rng() * WORLD.w : 990 + rng() * 420;
    const y = onH ? 690 + rng() * 420 : rng() * WORLD.h;
    g.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,.045)' : 'rgba(0,0,0,.22)';
    g.fillRect(x, y, 1.4, 1.4);
  }

  // aceras
  const walk = '#303632';
  g.fillStyle = walk;
  g.fillRect(0, 654, 990, 36);
  g.fillRect(1410, 654, 990, 36);
  g.fillRect(0, 1110, 990, 36);
  g.fillRect(1410, 1110, 990, 36);
  g.fillRect(954, 0, 36, 654);
  g.fillRect(954, 1146, 36, 654);
  g.fillRect(1410, 0, 36, 654);
  g.fillRect(1410, 1146, 36, 654);

  // textura y juntas de las aceras
  g.fillStyle = 'rgba(255,255,255,.045)';
  for (let x = 0; x < WORLD.w; x += 90) {
    g.fillRect(x, 654, 1, 36);
    g.fillRect(x, 1110, 1, 36);
  }
  for (let y = 0; y < WORLD.h; y += 90) {
    g.fillRect(954, y, 36, 1);
    g.fillRect(1410, y, 36, 1);
  }
  g.fillStyle = 'rgba(0,0,0,.25)';
  for (let x = 0; x < WORLD.w; x += 180) {
    g.fillRect(x, 686, 90, 4);
    g.fillRect(x, 1110, 90, 4);
  }
  // bordillos
  g.fillStyle = 'rgba(190,200,195,.14)';
  g.fillRect(0, 690, 990, 2);
  g.fillRect(1410, 690, 990, 2);
  g.fillRect(0, 1108, 990, 2);
  g.fillRect(1410, 1108, 990, 2);
  g.fillRect(988, 0, 2, 654);
  g.fillRect(988, 1146, 2, 654);
  g.fillRect(1410, 0, 2, 654);
  g.fillRect(1410, 1146, 2, 654);

  // marcas viales
  g.fillStyle = 'rgba(196,172,84,.22)';
  for (let x = 24; x < 960; x += 112) g.fillRect(x, 897, 58, 6);
  for (let x = 1440; x < WORLD.w - 24; x += 112) g.fillRect(x, 897, 58, 6);
  for (let y = 24; y < 670; y += 112) g.fillRect(1197, y, 6, 58);
  for (let y = 1130; y < WORLD.h - 24; y += 112) g.fillRect(1197, y, 6, 58);

  // pasos de cebra
  g.fillStyle = 'rgba(225,230,225,.13)';
  for (let i = 0; i < 8; i++) {
    g.fillRect(902, 714 + i * 48, 78, 22);
    g.fillRect(1420, 714 + i * 48, 78, 22);
    g.fillRect(1014 + i * 48, 602, 22, 78);
    g.fillRect(1014 + i * 48, 1120, 22, 78);
  }

  // grietas
  for (let i = 0; i < 46; i++) {
    const onH = rng() < 0.5;
    let x = onH ? rng() * WORLD.w : 990 + rng() * 420;
    let y = onH ? 690 + rng() * 420 : rng() * WORLD.h;
    g.strokeStyle = 'rgba(0,0,0,.4)';
    g.lineWidth = 1 + rng() * 1.4;
    g.beginPath();
    g.moveTo(x, y);
    const segs = 3 + (rng() * 4 | 0);
    for (let s = 0; s < segs; s++) {
      x += (rng() - 0.5) * 38;
      y += (rng() - 0.5) * 38;
      g.lineTo(x, y);
    }
    g.stroke();
  }

  // alcantarillas
  const holes = [[790, 830], [1610, 980], [1200, 500], [300, 930], [1900, 800]];
  for (const [x, y] of holes) {
    g.fillStyle = 'rgba(0,0,0,.5)';
    g.beginPath(); g.arc(x, y, 22, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(120,130,128,.22)';
    g.lineWidth = 2;
    g.beginPath(); g.arc(x, y, 22, 0, TAU); g.stroke();
    g.beginPath(); g.arc(x, y, 15, 0, TAU); g.stroke();
    g.lineWidth = 1;
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * 15, y + Math.sin(a) * 15);
      g.lineTo(x - Math.cos(a) * 15, y - Math.sin(a) * 15);
      g.stroke();
    }
  }

  // hierba y maleza
  for (let i = 0; i < 700; i++) {
    const x = rng() * WORLD.w, y = rng() * WORLD.h;
    if ((y > 640 && y < 1160) || (x > 940 && x < 1460)) continue;
    if (insideAnyBuilding(x, y)) continue;
    g.strokeStyle = `rgba(${44 + rng() * 30 | 0},${62 + rng() * 35 | 0},${40 + rng() * 20 | 0},${0.2 + rng() * 0.35})`;
    g.lineWidth = 1;
    for (let b = 0; b < 3; b++) {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (rng() - 0.5) * 8, y - 3 - rng() * 9);
      g.stroke();
    }
  }

  // papeles y escombros
  for (let i = 0; i < 120; i++) {
    const x = rng() * WORLD.w, y = rng() * WORLD.h;
    if (insideAnyBuilding(x, y)) continue;
    g.save();
    g.translate(x, y);
    g.rotate(rng() * TAU);
    g.fillStyle = rng() < 0.6 ? 'rgba(160,158,145,.16)' : 'rgba(70,66,56,.4)';
    g.fillRect(-2 - rng() * 3, -1.5, 4 + rng() * 7, 3 + rng() * 2);
    g.restore();
  }

  // restos de sangre antiguos
  for (let i = 0; i < 9; i++) {
    const x = rng() * WORLD.w, y = rng() * WORLD.h;
    if (insideAnyBuilding(x, y)) continue;
    g.fillStyle = `rgba(${54 + rng() * 30 | 0},${8 + rng() * 8 | 0},${10 + rng() * 8 | 0},${0.16 + rng() * 0.2})`;
    for (let k = 0; k < 5; k++) {
      g.beginPath();
      g.ellipse(x + (rng() - 0.5) * 46, y + (rng() - 0.5) * 30, 6 + rng() * 18, 3 + rng() * 9, rng() * TAU, 0, TAU);
      g.fill();
    }
  }

}

const BUILDINGS = [
  { x: 130, y: 110, w: 360, h: 250 },
  { x: 610, y: 130, w: 250, h: 190 },
  { x: 1520, y: 120, w: 390, h: 250 },
  { x: 2020, y: 360, w: 250, h: 210 },
  { x: 120, y: 1230, w: 340, h: 260 },
  { x: 610, y: 1460, w: 270, h: 220 },
  { x: 1560, y: 1250, w: 310, h: 240 },
  { x: 2010, y: 1450, w: 290, h: 230 }
];

function insideAnyBuilding(x, y) {
  for (const b of BUILDINGS) if (x > b.x - 10 && x < b.x + b.w + 10 && y > b.y - 10 && y < b.y + b.h + 10) return true;
  return false;
}

function placeBuildings(rng) {
  const g = gctx;
  for (const b of BUILDINGS) {
    // sombra proyectada
    g.fillStyle = 'rgba(0,0,0,.5)';
    g.fillRect(b.x + 12, b.y + 14, b.w, b.h);
    // muro perimetral
    g.fillStyle = '#232c33';
    g.fillRect(b.x - 5, b.y - 5, b.w + 10, b.h + 10);
    // tejado
    const gr = g.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
    gr.addColorStop(0, '#28343d');
    gr.addColorStop(0.55, '#1a232a');
    gr.addColorStop(1, '#121920');
    g.fillStyle = gr;
    g.fillRect(b.x, b.y, b.w, b.h);
    // borde
    g.strokeStyle = '#2a333a';
    g.lineWidth = 3;
    g.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
    // manchas
    for (let i = 0; i < 7; i++) {
      g.fillStyle = `rgba(0,0,0,${0.08 + rng() * 0.12})`;
      g.beginPath();
      g.ellipse(b.x + rng() * b.w, b.y + rng() * b.h, 12 + rng() * 46, 8 + rng() * 28, rng() * TAU, 0, TAU);
      g.fill();
    }
    // juntas del tejado
    g.strokeStyle = 'rgba(255,255,255,.035)';
    g.lineWidth = 1;
    for (let x = b.x + 40; x < b.x + b.w; x += 70) {
      g.beginPath(); g.moveTo(x, b.y); g.lineTo(x, b.y + b.h); g.stroke();
    }
    // equipos de climatización
    const units = 1 + (rng() * 3 | 0);
    for (let i = 0; i < units; i++) {
      const ux = b.x + 22 + rng() * (b.w - 80);
      const uy = b.y + 20 + rng() * (b.h - 80);
      const uw = 28 + rng() * 26, uh = 20 + rng() * 16;
      g.fillStyle = '#0a0e11';
      g.fillRect(ux + 3, uy + 3, uw, uh);
      g.fillStyle = '#242d33';
      g.fillRect(ux, uy, uw, uh);
      g.strokeStyle = '#3a454c'; g.lineWidth = 1;
      g.strokeRect(ux + 0.5, uy + 0.5, uw - 1, uh - 1);
      g.beginPath();
      g.arc(ux + uw / 2, uy + uh / 2, Math.min(uw, uh) * 0.3, 0, TAU);
      g.stroke();
      g.beginPath();
      g.moveTo(ux + uw / 2 - 5, uy + uh / 2); g.lineTo(ux + uw / 2 + 5, uy + uh / 2);
      g.stroke();
    }
    // claraboya
    if (rng() < 0.55) {
      const sx = b.x + 30 + rng() * (b.w - 130);
      const sy = b.y + 24 + rng() * (b.h - 90);
      const sw = 46 + rng() * 34, sh = 30 + rng() * 20;
      const sg = g.createLinearGradient(sx, sy, sx + sw, sy + sh);
      sg.addColorStop(0, 'rgba(90,130,145,.18)');
      sg.addColorStop(1, 'rgba(30,55,65,.1)');
      g.fillStyle = sg;
      g.fillRect(sx, sy, sw, sh);
      g.strokeStyle = 'rgba(150,190,200,.12)';
      g.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
      g.beginPath(); g.moveTo(sx + sw / 2, sy); g.lineTo(sx + sw / 2, sy + sh); g.stroke();
    }
    // tuberías
    g.strokeStyle = 'rgba(80,90,95,.18)';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(b.x + b.w - 24, b.y + 18);
    g.lineTo(b.x + b.w - 24, b.y + b.h - 20);
    g.stroke();
    // bordillo del tejado
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.fillRect(b.x, b.y + b.h - 5, b.w, 5);
    solids.push({ x: b.x, y: b.y, w: b.w, h: b.h, kind: 'building' });
  }
}

function addSolidRect(x, y, w, h, kind) {
  solids.push({ x, y, w, h, kind: kind || 'prop' });
}

function placeProps(rng) {
  // coches abandonados
  const cars = [
    { x: 430, y: 760, rot: 0, color: '#5d2b26' },
    { x: 760, y: 1050, rot: 0, color: '#2f4552' },
    { x: 1560, y: 770, rot: 0, color: '#3c4a39' },
    { x: 2050, y: 1035, rot: 0, color: '#4a4238' },
    { x: 1080, y: 330, rot: Math.PI / 2, color: '#563b31' },
    { x: 1320, y: 520, rot: Math.PI / 2, color: '#33404a' },
    { x: 1040, y: 1500, rot: Math.PI / 2, color: '#3f3b30' },
    { x: 1330, y: 1620, rot: Math.PI / 2, color: '#4a2f2c' }
  ];
  for (const c of cars) {
    const w = 94, h = 46;
    const solid = c.rot ? { x: c.x - h / 2, y: c.y - w / 2, w: h, h: w } : { x: c.x - w / 2, y: c.y - h / 2, w, h };
    props.push({ kind: 'car', x: c.x, y: c.y, w, h, rot: c.rot, color: c.color, seed: rng() * 1000, sortY: c.y + (c.rot ? w / 2 : h / 2) });
    addSolidRect(solid.x, solid.y, solid.w, solid.h, 'car');
  }

  // contenedores
  const dumps = [[900, 640, 0], [1460, 1180, 0], [270, 1180, 0], [1740, 660, 0]];
  for (const [x, y] of dumps) {
    const w = 68, h = 44;
    props.push({ kind: 'dumpster', x, y, w, h, sortY: y + h / 2, seed: rng() * 100 });
    addSolidRect(x - w / 2, y - h / 2, w, h, 'dumpster');
  }

  // cajas
  const crates = [[520, 430], [535, 470], [1490, 600], [960, 1190], [1900, 1130], [320, 1560]];
  for (const [x, y] of crates) {
    const s = 34 + rng() * 12;
    props.push({ kind: 'crate', x, y, w: s, h: s, sortY: y + s / 2, seed: rng() * 100 });
    addSolidRect(x - s / 2, y - s / 2, s, s, 'crate');
  }

  // barriles
  const barrels = [
    [500, 650, false], [1470, 650, false], [930, 1150, false], [1430, 1120, false],
    [2200, 700, false], [70, 1180, false], [2300, 1420, false],
    [455, 1150, true], [1780, 650, true]
  ];
  for (const [x, y, burning] of barrels) {
    const r = 17;
    props.push({ kind: 'barrel', x, y, r, burning, sortY: y + r, seed: rng() * 100 });
    addSolidRect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6, 'barrel');
    if (burning) fireLights.push({ x, y, r: 165, seed: rng() * 100 });
  }

  // barreras
  const barriers = [[760, 1130, 0], [1510, 670, 0], [1110, 1200, Math.PI / 2], [1290, 630, Math.PI / 2]];
  for (const [x, y, rot] of barriers) {
    const w = 82, h = 28;
    const solid = rot ? { x: x - h / 2, y: y - w / 2, w: h, h: w } : { x: x - w / 2, y: y - h / 2, w, h };
    props.push({ kind: 'barrier', x, y, w, h, rot, sortY: y + (rot ? w / 2 : h / 2), seed: rng() * 100 });
    addSolidRect(solid.x, solid.y, solid.w, solid.h, 'barrier');
  }

  // farolas
  const lamps = [
    [350, 672], [850, 672], [1650, 672], [2150, 672],
    [350, 1128], [850, 1128], [1650, 1128], [2150, 1128],
    [972, 330], [972, 1450], [1428, 330], [1428, 1450]
  ];
  for (const [x, y] of lamps) {
    props.push({ kind: 'lamp', x, y, sortY: y + 4, seed: rng() * 100 });
    lampLights.push({ x: x + 12, y: y - 14, r: 195, seed: rng() * 100 });
    addSolidRect(x - 5, y - 5, 10, 10, 'lamp');
  }

  // árboles muertos
  const trees = [[60, 520], [2340, 900], [70, 1680], [2320, 300]];
  for (const [x, y] of trees) {
    props.push({ kind: 'tree', x, y, sortY: y + 10, seed: rng() * 100 });
    addSolidRect(x - 12, y - 12, 24, 24, 'tree');
  }
}

/* ------------------------------------------------------------
   Dibujo de props
------------------------------------------------------------ */
function drawPropShadow(p) {
  if (p.kind === 'lamp') {
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.beginPath(); ctx.ellipse(p.x + 4, p.y + 3, 13, 6, 0, 0, TAU); ctx.fill();
    return;
  }
  if (p.kind === 'tree') {
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(p.x + 7, p.y + 6, 24, 12, 0, 0, TAU); ctx.fill();
    return;
  }
  const w = p.w || p.r * 2 || 30, h = p.h || p.r * 2 || 30;
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath();
  ctx.ellipse(p.x + 6, p.y + 7, w * 0.52, h * 0.42, p.rot || 0, 0, TAU);
  ctx.fill();
}

function drawProp(p, t) {
  switch (p.kind) {
    case 'car': drawCar(p); break;
    case 'dumpster': drawDumpster(p); break;
    case 'crate': drawCrate(p); break;
    case 'barrel': drawBarrel(p, t); break;
    case 'barrier': drawBarrier(p); break;
    case 'lamp': drawLamp(p, t); break;
    case 'tree': drawTree(p); break;
  }
}

function drawCar(p) {
  const { x, y, w, h, rot, color, seed } = p;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const rng = mulberry32(seed * 977 + 13);
  // ruedas
  ctx.fillStyle = '#08090a';
  for (const sx of [-w * 0.32, w * 0.32]) {
    for (const sy of [-h / 2 + 2, h / 2 - 9]) {
      rr(ctx, sx - 9, sy, 18, 7, 3); ctx.fill();
    }
  }
  // carrocería
  const gr = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  gr.addColorStop(0, shade(color, 1.35));
  gr.addColorStop(0.42, color);
  gr.addColorStop(1, shade(color, 0.55));
  rr(ctx, -w / 2, -h / 2, w, h, 11);
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // capó / techo
  rr(ctx, -w * 0.31, -h * 0.33, w * 0.47, h * 0.66, 6);
  ctx.fillStyle = shade(color, 0.72);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // parabrisas delantero
  ctx.beginPath();
  ctx.moveTo(w * 0.17, -h * 0.3);
  ctx.lineTo(w * 0.35, -h * 0.21);
  ctx.lineTo(w * 0.35, h * 0.21);
  ctx.lineTo(w * 0.17, h * 0.3);
  ctx.closePath();
  ctx.fillStyle = 'rgba(130,175,195,.16)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,215,225,.14)';
  ctx.stroke();
  // luna trasera
  ctx.beginPath();
  ctx.moveTo(-w * 0.4, -h * 0.26);
  ctx.lineTo(-w * 0.28, -h * 0.3);
  ctx.lineTo(-w * 0.28, h * 0.3);
  ctx.lineTo(-w * 0.4, h * 0.26);
  ctx.closePath();
  ctx.fillStyle = 'rgba(110,150,170,.1)';
  ctx.fill();
  // óxido y golpes
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `rgba(${60 + rng() * 30 | 0},${28 + rng() * 18 | 0},${18 + rng() * 12 | 0},${0.25 + rng() * 0.3})`;
    ctx.beginPath();
    ctx.ellipse((rng() - 0.5) * w * 0.8, (rng() - 0.5) * h * 0.7, 3 + rng() * 9, 2 + rng() * 5, rng() * TAU, 0, TAU);
    ctx.fill();
  }
  // grieta en el parabrisas
  ctx.strokeStyle = 'rgba(200,225,230,.2)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(w * 0.24, -h * 0.12);
  ctx.lineTo(w * 0.29, -h * 0.02);
  ctx.lineTo(w * 0.26, h * 0.09);
  ctx.stroke();
  // faros
  ctx.fillStyle = 'rgba(255,236,190,.4)';
  ctx.fillRect(w / 2 - 4, -h * 0.32, 4, 7);
  ctx.fillRect(w / 2 - 4, h * 0.24, 4, 7);
  ctx.fillStyle = 'rgba(190,40,30,.45)';
  ctx.fillRect(-w / 2, -h * 0.32, 3, 6);
  ctx.fillRect(-w / 2, h * 0.26, 3, 6);
  ctx.restore();
}

function drawDumpster(p) {
  const { x, y, w, h } = p;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#1b241c';
  rr(ctx, -w / 2, -h / 2 + 3, w, h, 4); ctx.fill();
  const gr = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  gr.addColorStop(0, '#3d503d');
  gr.addColorStop(0.5, '#2c3a2c');
  gr.addColorStop(1, '#1c261c');
  rr(ctx, -w / 2, -h / 2, w, h, 4);
  ctx.fillStyle = gr; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 2; ctx.stroke();
  // tapa
  ctx.fillStyle = 'rgba(90,110,88,.35)';
  rr(ctx, -w / 2 + 5, -h / 2 + 5, w - 10, h * 0.34, 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1; ctx.stroke();
  // asas
  ctx.fillStyle = 'rgba(150,165,145,.3)';
  ctx.fillRect(-w * 0.22, h / 2 - 4, w * 0.44, 3);
  // ruedas
  ctx.fillStyle = '#0a0c0a';
  ctx.beginPath(); ctx.arc(-w / 2 + 8, h / 2, 4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(w / 2 - 8, h / 2, 4, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawCrate(p) {
  const { x, y, w, h } = p;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#2b2116';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  const gr = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  gr.addColorStop(0, '#5a452a');
  gr.addColorStop(0.5, '#47351f');
  gr.addColorStop(1, '#312414');
  ctx.fillStyle = gr;
  ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  ctx.strokeStyle = 'rgba(20,14,8,.7)'; ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  ctx.strokeStyle = 'rgba(110,85,50,.5)'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 5, -h / 2 + 5); ctx.lineTo(w / 2 - 5, h / 2 - 5);
  ctx.moveTo(w / 2 - 5, -h / 2 + 5); ctx.lineTo(-w / 2 + 5, h / 2 - 5);
  ctx.stroke();
  ctx.restore();
}

function drawBarrel(p, t) {
  const { x, y, r } = p;
  ctx.save();
  ctx.translate(x, y);
  const gr = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 2, 0, 0, r);
  gr.addColorStop(0, p.burning ? '#7d4a25' : '#6a3b2d');
  gr.addColorStop(0.6, p.burning ? '#4e2b18' : '#3e2a22');
  gr.addColorStop(1, '#1c1512');
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(180,120,70,.24)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.34, 0, TAU); ctx.stroke();
  if (p.burning) {
    const f = 0.8 + Math.sin(t * 17 + p.seed) * 0.2;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const a = t * (2.4 + i * 0.3) + p.seed + i * 2.1;
      const fx = Math.cos(a) * 4, fy = Math.sin(a) * 4 - 3 - i * 2;
      const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 11 * f);
      fg.addColorStop(0, 'rgba(255,235,160,.9)');
      fg.addColorStop(0.4, 'rgba(255,140,30,.5)');
      fg.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(fx, fy, 11 * f, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

function drawBarrier(p) {
  const { x, y, w, h, rot } = p;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#3c403c';
  rr(ctx, -w / 2, -h / 2, w, h, 3); ctx.fill();
  const gr = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  gr.addColorStop(0, '#5a5f58');
  gr.addColorStop(0.5, '#454a44');
  gr.addColorStop(1, '#2b2f2b');
  ctx.fillStyle = gr;
  rr(ctx, -w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 2); ctx.fill();
  ctx.save();
  rr(ctx, -w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(214,120,40,.5)';
  for (let i = -2; i < 8; i++) {
    ctx.save();
    ctx.translate(-w / 2 + i * 16, 0);
    ctx.rotate(-0.6);
    ctx.fillRect(0, -h, 7, h * 2);
    ctx.restore();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.5;
  rr(ctx, -w / 2, -h / 2, w, h, 3); ctx.stroke();
  ctx.restore();
}

function drawLamp(p, t) {
  const { x, y } = p;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#20262a';
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#39434a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.stroke();
  ctx.strokeStyle = '#2c3439';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(10, -12);
  ctx.lineTo(16, -14);
  ctx.stroke();
  const flick = 0.8 + Math.sin(t * 11 + p.seed) * 0.08 + Math.sin(t * 31 + p.seed * 3) * 0.06;
  ctx.fillStyle = `rgba(255,210,140,${0.65 * flick})`;
  ctx.beginPath(); ctx.arc(17, -15, 4, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawTree(p) {
  const { x, y, seed } = p;
  const rng = mulberry32(seed * 331 + 7);
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#171a16';
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, -12); ctx.stroke();
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (rng() - 0.5) * 2.4;
    const len = 14 + rng() * 22;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(Math.cos(a) * len, -10 + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.fillStyle = '#0d0f0c';
  ctx.beginPath(); ctx.arc(0, -11, 4, 0, TAU); ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------
   Escena del menú
------------------------------------------------------------ */
function buildMenu() {
  const rng = mulberry32(99017);
  const far = [];
  let x = -0.08;
  while (x < 1.08) {
    const w = 0.035 + rng() * 0.085;
    const h = 0.08 + rng() * 0.24;
    const wins = [];
    const cols = Math.max(2, Math.floor(w * 110));
    const rows = Math.max(3, Math.floor(h * 42));
    for (let cx = 0; cx < cols; cx++) {
      for (let cy = 0; cy < rows; cy++) {
        if (rng() < 0.33) {
          wins.push({
            x: (cx + 0.25) / cols, y: (cy + 0.3) / rows,
            w: 0.5 / cols, h: 0.3 / rows,
            p: rng() * 10, lit: rng() < 0.7
          });
        }
      }
    }
    far.push({ x, w, h, wins });
    x += w + 0.006 + rng() * 0.02;
  }
  const mid = [];
  x = -0.12;
  while (x < 1.1) {
    const w = 0.08 + rng() * 0.16;
    const h = 0.1 + rng() * 0.26;
    const pts = [];
    const steps = 4 + (rng() * 4 | 0);
    for (let i = 0; i <= steps; i++) pts.push(1 - (rng() * 0.22));
    mid.push({ x, w, h, pts });
    x += w + 0.02 + rng() * 0.06;
  }
  const zs = [];
  for (let i = 0; i < 6; i++) {
    zs.push({
      nx: rng(), ny: 0.845 + rng() * 0.085,
      s: 0.75 + rng() * 0.75,
      spd: (0.0025 + rng() * 0.008) * (rng() < 0.5 ? -1 : 1),
      phase: rng() * TAU,
      dir: rng() < 0.5 ? -1 : 1
    });
  }
  menu = { far, mid, zombies: zs, next: rand(7, 16), flash: 0 };
}

function updateMenu(dt) {
  menuTime += dt;
  if (!menu) buildMenu();
  for (const z of menu.zombies) {
    z.nx += z.spd * dt;
    if (z.nx > 1.16) z.nx = -0.16;
    if (z.nx < -0.16) z.nx = 1.16;
  }
  menu.flash *= Math.exp(-5 * dt);
  menu.next -= dt;
  if (menu.next <= 0) {
    menu.flash = 1;
    menu.next = rand(12, 26);
    if (Sound.ready) Sound.thunder();
  }
}

function drawMenuScene(t) {
  const c = ctx;
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#07121c');
  sky.addColorStop(0.38, '#0c1a22');
  sky.addColorStop(0.62, '#16211f');
  sky.addColorStop(0.78, '#0b1110');
  sky.addColorStop(1, '#040605');
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);

  const drift = Math.sin(t * 0.02) * 14;

  // luna
  const mx = W * 0.87 + drift * 0.4;
  const my = H * 0.17;
  const mr = clamp(W * 0.034, 24, 58);
  const halo = c.createRadialGradient(mx, my, mr * 0.4, mx, my, mr * 8);
  halo.addColorStop(0, 'rgba(190,225,220,.26)');
  halo.addColorStop(0.4, 'rgba(130,175,180,.09)');
  halo.addColorStop(1, 'rgba(100,150,160,0)');
  c.fillStyle = halo;
  c.beginPath(); c.arc(mx, my, mr * 8, 0, TAU); c.fill();
  const mg = c.createRadialGradient(mx - mr * 0.3, my - mr * 0.35, mr * 0.1, mx, my, mr);
  mg.addColorStop(0, '#e7efea');
  mg.addColorStop(0.7, '#b8c8c2');
  mg.addColorStop(1, '#829791');
  c.fillStyle = mg;
  c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
  c.fillStyle = 'rgba(70,92,88,.22)';
  for (let i = 0; i < 6; i++) {
    const a = i * 2.4, rr2 = mr * (0.15 + (i % 3) * 0.2);
    c.beginPath();
    c.arc(mx + Math.cos(a) * rr2, my + Math.sin(a) * rr2, mr * (0.06 + (i % 2) * 0.05), 0, TAU);
    c.fill();
  }

  // nubes
  c.save();
  for (let i = 0; i < 6; i++) {
    const cw = W * (0.22 + i * 0.03);
    const cx = ((i * 0.24 + t * 0.0035 * (1 + i * 0.2)) % 1.3 - 0.15) * W;
    const cy = H * (0.1 + (i % 3) * 0.06);
    const cg = c.createRadialGradient(cx, cy, 0, cx, cy, cw);
    cg.addColorStop(0, 'rgba(7,13,18,.42)');
    cg.addColorStop(1, 'rgba(7,13,18,0)');
    c.fillStyle = cg;
    c.beginPath(); c.ellipse(cx, cy, cw, H * 0.045, 0, 0, TAU); c.fill();
  }
  c.restore();

  // skyline lejano
  const baseFar = H * 0.645;
  for (const b of menu.far) {
    const bx = b.x * W + drift;
    const bw = b.w * W;
    const bh = b.h * H;
    c.fillStyle = '#0a1216';
    c.fillRect(bx, baseFar - bh, bw, bh);
    c.fillStyle = 'rgba(150,180,180,.05)';
    c.fillRect(bx, baseFar - bh, bw, 1);
    for (const win of b.wins) {
      const flick = 0.55 + Math.sin(t * 1.7 + win.p) * 0.2 + Math.sin(t * 9 + win.p * 3) * 0.1;
      c.fillStyle = `rgba(255,196,120,${(win.lit ? 0.36 : 0.1) * flick})`;
      c.fillRect(bx + win.x * bw, baseFar - bh + win.y * bh, Math.max(1, win.w * bw), Math.max(1, win.h * bh));
    }
  }

  // ruinas medias
  const baseMid = H * 0.8;
  for (const b of menu.mid) {
    const bx = b.x * W + drift * 1.8;
    const bw = b.w * W;
    const bh = b.h * H;
    c.fillStyle = '#050a0c';
    c.beginPath();
    c.moveTo(bx, baseMid);
    for (let i = 0; i < b.pts.length; i++) {
      const px = bx + (i / (b.pts.length - 1)) * bw;
      const py = baseMid - bh * b.pts[i];
      c.lineTo(px, py);
    }
    c.lineTo(bx + bw, baseMid);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(120,160,160,.035)';
    c.fillRect(bx, baseMid - bh, bw, 1);
  }

  // resplandor de un incendio lejano
  const fx = W * 0.1 + drift * 2;
  const fy = H * 0.655;
  const fireGlow = c.createRadialGradient(fx, fy, 0, fx, fy, W * 0.2);
  fireGlow.addColorStop(0, 'rgba(255,110,35,.1)');
  fireGlow.addColorStop(0.5, 'rgba(255,80,20,.04)');
  fireGlow.addColorStop(1, 'rgba(255,60,0,0)');
  c.fillStyle = fireGlow;
  c.beginPath(); c.ellipse(fx, fy, W * 0.2, H * 0.08, 0, 0, TAU); c.fill();

  // suelo
  const gg = c.createLinearGradient(0, H * 0.72, 0, H);
  gg.addColorStop(0, 'rgba(6,10,10,0)');
  gg.addColorStop(0.35, 'rgba(7,11,10,.78)');
  gg.addColorStop(1, '#050807');
  c.fillStyle = gg;
  c.fillRect(0, H * 0.7, W, H * 0.3);

  // calzada
  c.fillStyle = 'rgba(16,20,19,.55)';
  c.fillRect(0, H * 0.83, W, H * 0.17);
  c.fillStyle = 'rgba(190,170,90,.09)';
  for (let x = -40; x < W + 80; x += 120) c.fillRect(x + (t * 8 % 120), H * 0.905, 54, 4);

  // niebla de fondo
  drawFog(t, 0.055, 0.02);

  // farolas
  drawMenuLamp(W * 0.13 + drift * 0.5, H * 0.865, H * 0.3, t);
  drawMenuLamp(W * 0.88 + drift * 0.5, H * 0.87, H * 0.28, t);

  // coche abandonado
  drawMenuCar(W * 0.56, H * 0.895, clamp(H / 900, 0.7, 1.3));

  // zombis
  for (const z of menu.zombies) {
    const x = z.nx * W;
    const y = z.ny * H;
    const s = z.s * clamp(H / 950, 0.65, 1.4);
    drawMenuZombie(x, y, s, z.dir, z.phase, t);
  }

  // niebla delantera
  drawFog(t + 20, 0.045, 0.035);

  // lluvia
  drawRain();

  // relámpago
  if (menu.flash > 0.01) {
    c.fillStyle = `rgba(190,215,255,${menu.flash * 0.3})`;
    c.fillRect(0, 0, W, H);
  }
}

function drawFog(t, alpha, speed) {
  const c = ctx;
  c.save();
  for (let i = 0; i < 5; i++) {
    const fx = ((i * 0.27 + t * speed) % 1.3 - 0.15) * W;
    const fy = H * (0.72 + (i % 3) * 0.07);
    const fr = W * (0.16 + (i % 3) * 0.06);
    const fg = c.createRadialGradient(fx, fy, 0, fx, fy, fr);
    fg.addColorStop(0, `rgba(160,190,190,${alpha})`);
    fg.addColorStop(0.6, `rgba(130,160,165,${alpha * 0.5})`);
    fg.addColorStop(1, 'rgba(120,150,155,0)');
    c.fillStyle = fg;
    c.beginPath();
    c.ellipse(fx, fy, fr, fr * 0.28, 0, 0, TAU);
    c.fill();
  }
  c.restore();
}

function drawMenuLamp(x, baseY, h, t) {
  const c = ctx;
  const flick = 0.85 + Math.sin(t * 13 + x) * 0.08;
  const hx = x + h * 0.09;
  const hy = baseY - h;
  const glow = c.createRadialGradient(hx, hy, 0, hx, hy, h * 0.55);
  glow.addColorStop(0, `rgba(255,180,90,${0.18 * flick})`);
  glow.addColorStop(0.4, `rgba(255,150,60,${0.07 * flick})`);
  glow.addColorStop(1, 'rgba(255,120,30,0)');
  c.fillStyle = glow;
  c.beginPath(); c.arc(hx, hy, h * 0.55, 0, TAU); c.fill();
  // charco de luz
  const pool = c.createRadialGradient(x, baseY, 0, x, baseY, h * 0.5);
  pool.addColorStop(0, `rgba(255,170,80,${0.1 * flick})`);
  pool.addColorStop(1, 'rgba(255,150,60,0)');
  c.fillStyle = pool;
  c.beginPath(); c.ellipse(x, baseY, h * 0.5, h * 0.12, 0, 0, TAU); c.fill();
  c.strokeStyle = '#05090a';
  c.lineWidth = Math.max(2, h * 0.012);
  c.beginPath(); c.moveTo(x, baseY); c.lineTo(x, hy); c.lineTo(hx, hy); c.stroke();
  c.fillStyle = '#ffd89a';
  c.beginPath(); c.arc(hx, hy, Math.max(2, h * 0.012), 0, TAU); c.fill();
}

function drawMenuCar(x, y, s) {
  const c = ctx;
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,.5)';
  c.beginPath(); c.ellipse(0, 10, 70, 12, 0, 0, TAU); c.fill();
  c.fillStyle = '#05090a';
  rr(c, -66, -22, 132, 38, 8); c.fill();
  rr(c, -54, -28, 84, 30, 6); c.fill();
  c.fillStyle = '#030607';
  c.beginPath(); c.arc(-38, 18, 11, 0, TAU); c.fill();
  c.beginPath(); c.arc(42, 18, 11, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(150,180,175,.08)';
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(-60, -22); c.lineTo(60, -22); c.stroke();
  c.restore();
}

function drawMenuZombie(x, y, s, dir, phase, t) {
  const c = ctx;
  const swing = Math.sin(t * 2.6 + phase) * 0.5;
  c.save();
  c.translate(x, y);
  c.scale(s * dir, s);
  c.fillStyle = 'rgba(2,5,6,.97)';
  c.strokeStyle = 'rgba(2,5,6,.97)';
  c.lineCap = 'round';
  // piernas
  c.lineWidth = 4.6;
  c.beginPath(); c.moveTo(0, -3); c.lineTo(Math.sin(swing) * 6, 17); c.stroke();
  c.beginPath(); c.moveTo(0, -3); c.lineTo(Math.sin(-swing) * 6, 17); c.stroke();
  // torso
  c.beginPath(); c.ellipse(0, -10, 7.5, 11.5, 0.08, 0, TAU); c.fill();
  // brazos
  c.lineWidth = 3.8;
  c.beginPath(); c.moveTo(-4, -12); c.lineTo(-15, -7 + swing * 1.5); c.stroke();
  c.beginPath(); c.moveTo(-4, -7); c.lineTo(-14, -1 - swing * 1.5); c.stroke();
  // cabeza
  c.beginPath(); c.arc(-3.5, -23, 5.4, 0, TAU); c.fill();
  // borde de luz
  c.strokeStyle = 'rgba(150,185,180,.1)';
  c.lineWidth = 1;
  c.beginPath(); c.ellipse(0, -10, 7.5, 11.5, 0.08, Math.PI * 1.05, Math.PI * 1.85); c.stroke();
  c.beginPath(); c.arc(-3.5, -23, 5.4, Math.PI * 1.05, Math.PI * 1.9); c.stroke();
  c.restore();
}

function drawRain() {
  const c = ctx;
  c.save();
  c.strokeStyle = 'rgba(185,215,230,.14)';
  c.lineWidth = 1;
  for (const r of rain) {
    c.globalAlpha = r.a;
    c.beginPath();
    c.moveTo(r.x, r.y);
    c.lineTo(r.x + r.drift * 0.022, r.y + r.len);
    c.stroke();
  }
  c.restore();
}

function updateRain(dt) {
  for (const r of rain) {
    r.y += r.spd * dt;
    r.x += r.drift * dt;
    if (r.y > H + 30) {
      r.y = -30;
      r.x = rand(-120, W + 120);
    }
    if (r.x < -140) r.x = W + 120;
    if (r.x > W + 140) r.x = -120;
  }
}
