// MOONLIT VAULT — render: every pixel the judge sees.
// Dense winner layout: top HUD bar, left objectives panel, right guard
// panel, bottom control bar, and the level filling the middle.
import {
  W, H, HUD_H, BAR_H, PANEL_L, PANEL_R, PLAY_X, PLAY_Y, PLAY_W, PLAY_H,
  COLS, ROWS, TILE, LEVEL_W, LEVEL_H, LEVEL_X, LEVEL_Y,
  PAL, TUNE, HEISTS, WIN_TEXT, LOSE_TEXT,
  tileCenterX, tileCenterY, clamp,
} from './config.js';
import { guardLabel } from './guards.js';

function text(ctx, s, x, y, size, color, align = 'left', weight = 700) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

function box(ctx, x, y, w, h, fill, stroke = null) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
}

function fmtTime(s) {
  const m = Math.floor(Math.max(0, s) / 60), ss = Math.floor(Math.max(0, s) % 60);
  return `${m}:${ss.toString().padStart(2, '0')}`;
}

const GEM_COLORS = ['#7dd3fc', '#a5b4fc', '#f0abfc', '#fda4af', '#fcd34d', '#fbbf24'];

// ---- vision cone, raycast-clipped by walls and smoke --------------------
function drawCone(ctx, world, x, y, dir, rangePx, halfAngle, color) {
  const rays = 22;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= rays; i++) {
    const a = dir - halfAngle + (2 * halfAngle * i) / rays;
    const d = world.rayDist(x, y, a, rangePx);
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fill();
}

function coneColor(state, suspicion) {
  if (state === 'alerted') return PAL.coneAlert;
  if (state === 'suspicious' || suspicion >= 60) return PAL.coneSus;
  return PAL.coneCalm;
}

// ---- level ---------------------------------------------------------------
function drawLevel(ctx, g) {
  const w = g.world;
  const ox = LEVEL_X, oy = LEVEL_Y;

  // Floor
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = w.grid[y][x];
      const px = ox + x * TILE, py = oy + y * TILE;
      if (c === '#') continue;
      ctx.fillStyle = (x + y) % 2 === 0 ? PAL.floorA : PAL.floorB;
      ctx.fillRect(px, py, TILE, TILE);
      if (c === ',') { ctx.fillStyle = PAL.shadow; ctx.fillRect(px, py, TILE, TILE); }
    }
  }

  // Doused-lantern darkness pools
  for (const z of w.doused) {
    const grad = ctx.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.r);
    grad.addColorStop(0, 'rgba(4, 6, 18, 0.72)');
    grad.addColorStop(1, 'rgba(4, 6, 18, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill();
  }

  // Lantern glow (lit only)
  for (const lan of w.lanterns) {
    if (!lan.lit) continue;
    const cx = tileCenterX(lan.x), cy = tileCenterY(lan.y);
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, TILE * 2.1);
    grad.addColorStop(0, 'rgba(245, 185, 66, 0.30)');
    grad.addColorStop(1, 'rgba(245, 185, 66, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, TILE * 2.1, 0, Math.PI * 2); ctx.fill();
  }

  // Walls (with a lit top edge), crates, bushes, lanterns
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = w.grid[y][x];
      const px = ox + x * TILE, py = oy + y * TILE;
      if (c === '#') {
        ctx.fillStyle = PAL.wall; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = PAL.wallTop; ctx.fillRect(px, py, TILE, 4);
        ctx.strokeStyle = PAL.wallEdge; ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      } else if (c === 'C') {
        ctx.fillStyle = PAL.crate; ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = PAL.crateEdge; ctx.lineWidth = 2;
        ctx.strokeRect(px + 3.5, py + 3.5, TILE - 7, TILE - 7);
        ctx.beginPath(); ctx.moveTo(px + 3, py + 3); ctx.lineTo(px + TILE - 3, py + TILE - 3);
        ctx.moveTo(px + TILE - 3, py + 3); ctx.lineTo(px + 3, py + TILE - 3); ctx.stroke();
      } else if (c === 'B') {
        ctx.fillStyle = PAL.bush;
        ctx.beginPath(); ctx.arc(px + TILE / 2, py + TILE / 2, TILE * 0.42, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = PAL.bushEdge;
        ctx.beginPath(); ctx.arc(px + TILE * 0.38, py + TILE * 0.38, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + TILE * 0.62, py + TILE * 0.58, 6, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  for (const lan of w.lanterns) {
    const cx = tileCenterX(lan.x), cy = tileCenterY(lan.y);
    ctx.fillStyle = lan.lit ? PAL.amber : '#3a3f5e';
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6b5a2a';
    ctx.fillRect(cx - 1.5, cy, 3, 9);
  }

  // Loot pedestals + gems
  for (const l of w.loot) {
    const cx = tileCenterX(l.x), cy = tileCenterY(l.y);
    ctx.fillStyle = '#4a4f78';
    ctx.fillRect(cx - 8, cy + 2, 16, 8);
    if (l.taken) continue;
    const col = l.sapphire ? '#67e8f9' : GEM_COLORS[l.index % GEM_COLORS.length];
    const r = l.sapphire ? 11 : 8;
    ctx.save();
    ctx.translate(cx, cy - 2);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = col;
    ctx.fillRect(-r / 1.4, -r / 1.4, r * 1.4, r * 1.4);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(-r / 1.4, -r / 1.4, r * 0.7, r * 0.7);
    ctx.restore();
    if (l.sapphire) {
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy - 2, 16 + Math.sin(g.time * 3) * 2, 0, Math.PI * 2); ctx.stroke();
      text(ctx, 'STAR SAPPHIRE', cx, cy - 22, 10, '#67e8f9', 'center');
    }
  }

  // Exit door
  if (w.exit) {
    const cx = tileCenterX(w.exit.x), cy = tileCenterY(w.exit.y);
    const open = w.allLootTaken();
    if (open) {
      const pulse = 0.25 + 0.12 * Math.sin(g.time * 4);
      ctx.fillStyle = `rgba(52, 211, 153, ${pulse})`;
      ctx.beginPath(); ctx.arc(cx, cy, TILE * 0.95, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = open ? PAL.green : '#2c7a5b';
    ctx.fillRect(cx - 11, cy - 13, 22, 26);
    ctx.strokeStyle = open ? '#a7f3d0' : '#14532d';
    ctx.lineWidth = 2; ctx.strokeRect(cx - 11.5, cy - 13.5, 23, 27);
    text(ctx, 'EXIT', cx, cy - 18, 10, open ? PAL.green : '#6b739e', 'center');
    if (!open) text(ctx, `${w.lootTaken()}/${w.lootTotal()}`, cx, cy + 26, 10, PAL.textDim, 'center');
  }

  // Lasers
  for (const l of w.lasers) {
    const x1 = tileCenterX(l.x1), y1 = tileCenterY(l.y1);
    const x2 = tileCenterX(l.x2), y2 = tileCenterY(l.y2);
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(x1 - 6, y1 - 6, 12, 12);
    ctx.fillRect(x2 - 6, y2 - 6, 12, 12);
    if (l.on) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Cameras + their cones
  for (const cam of w.cameras) {
    const cx = tileCenterX(cam.x), cy = tileCenterY(cam.y);
    const col = cam.alerted ? PAL.coneAlert : (cam.suspicion >= 60 ? PAL.coneSus : PAL.coneCalm);
    drawCone(ctx, w, cx, cy, cam.angle, (TUNE.coneRange + 0.6) * TILE, TUNE.coneHalfAngle, col);
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(cx - 7, cy - 7, 14, 14);
    ctx.fillStyle = cam.alerted ? PAL.red : PAL.amber;
    ctx.beginPath(); ctx.arc(cx + Math.cos(cam.angle) * 5, cy + Math.sin(cam.angle) * 5, 3.5, 0, Math.PI * 2); ctx.fill();
  }

  // Guards + their cones
  for (const gd of g.guards) {
    drawCone(ctx, w, gd.x, gd.y, gd.dir, (TUNE.coneRange) * TILE, TUNE.coneHalfAngle, coneColor(gd.state, gd.suspicion));
  }
  for (const gd of g.guards) {
    const alert = gd.state === 'alerted';
    ctx.fillStyle = alert ? '#7f1d1d' : '#5b2333';
    ctx.beginPath(); ctx.arc(gd.x, gd.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alert ? PAL.red : '#a33d4f';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(gd.x, gd.y, 12, 0, Math.PI * 2); ctx.stroke();
    // facing tick
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(gd.x, gd.y);
    ctx.lineTo(gd.x + Math.cos(gd.dir) * 15, gd.y + Math.sin(gd.dir) * 15);
    ctx.stroke();
    // suspicion arc above the head
    if (gd.suspicion > 4) {
      ctx.strokeStyle = gd.suspicion >= 100 ? PAL.red : PAL.amber;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(gd.x, gd.y - 17, 6, -Math.PI / 2, -Math.PI / 2 + (gd.suspicion / 100) * Math.PI * 2);
      ctx.stroke();
    }
    if (gd.state === 'suspicious') text(ctx, '?', gd.x, gd.y - 24, 16, PAL.amber, 'center');
    if (gd.state === 'alerted') text(ctx, '!', gd.x, gd.y - 24, 18, PAL.red, 'center');
  }

  // Smoke clouds
  for (const s of w.smoke) {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(226, 232, 240, 0.25)';
    ctx.beginPath(); ctx.arc(s.x - s.r * 0.3, s.y - s.r * 0.25, s.r * 0.55, 0, Math.PI * 2); ctx.fill();
  }

  // Thrown coins
  for (const c of w.coins) {
    ctx.fillStyle = PAL.gold;
    ctx.beginPath(); ctx.arc(c.x, c.y, c.landed ? 4 : 5, 0, Math.PI * 2); ctx.fill();
    if (c.landed) {
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(c.x, c.y, 8 + Math.sin(g.time * 6) * 2, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // Noise rings (footsteps / coin clinks guards can hear)
  for (const n of w.noise) {
    ctx.strokeStyle = 'rgba(245, 185, 66, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r * (1 - n.ttl / 1.2), 0, Math.PI * 2); ctx.stroke();
  }

  // Player: teal hooded figure
  const p = g.player;
  ctx.fillStyle = 'rgba(45, 212, 191, 0.18)';
  ctx.beginPath(); ctx.arc(p.x, p.y, 17, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.sneaking ? PAL.tealDark : PAL.teal;
  ctx.beginPath(); ctx.arc(p.x, p.y, p.sneaking ? 10 : 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0f2e2a';
  ctx.beginPath(); ctx.arc(p.x + Math.cos(p.dir) * 4, p.y + Math.sin(p.dir) * 4, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath(); ctx.arc(p.x + Math.cos(p.dir) * 6, p.y + Math.sin(p.dir) * 6 - 1.5, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(p.x + Math.cos(p.dir) * 6, p.y + Math.sin(p.dir) * 6 + 1.5, 1.6, 0, Math.PI * 2); ctx.fill();
  if (p.sneaking) text(ctx, 'SNEAK', p.x, p.y - 20, 9, PAL.teal, 'center');
  // Coin target marker
  if (p.coins > 0) {
    const m = g.input.mouseTile();
    const cx = tileCenterX(m.x), cy = tileCenterY(m.y);
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.stroke();
  }

  // Score popups
  for (const pp of g.popups) {
    ctx.globalAlpha = clamp(pp.t, 0, 1);
    text(ctx, pp.text, pp.x, pp.y, 15, pp.color, 'center');
    ctx.globalAlpha = 1;
  }
}

// ---- HUD + panels ----------------------------------------------------------
function drawHud(ctx, g) {
  const w = g.world;
  box(ctx, 0, 0, W, HUD_H, PAL.hud, PAL.hudEdge);
  const h = HEISTS[g.heist];
  text(ctx, 'MOONLIT VAULT', 14, 22, 13, PAL.textFaint);
  text(ctx, `${h.id} · ${h.name}`, 14, 42, 17, PAL.text);
  // Loot
  text(ctx, `LOOT ${w.lootTaken()}/${w.lootTotal()}`, 250, 24, 13, PAL.textDim);
  text(ctx, `$${w.lootValue()}`, 250, 44, 17, PAL.gold);
  // Timer
  const tcol = g.timeLeft < 30 ? PAL.red : PAL.text;
  text(ctx, 'TIME', 380, 24, 13, PAL.textDim);
  text(ctx, fmtTime(g.timeLeft), 380, 44, 17, tcol);
  // HEAT meter
  text(ctx, 'HEAT', 480, 24, 13, PAL.textDim);
  const heat = clamp(g.heat, 0, 100);
  box(ctx, 480, 30, 130, 12, '#1a1e3d', PAL.panelEdge);
  const hcol = heat < 40 ? PAL.green : heat < 75 ? PAL.amber : PAL.red;
  box(ctx, 480, 30, Math.round(130 * heat / 100), 12, hcol);
  text(ctx, `${Math.round(heat)}`, 618, 42, 13, hcol);
  // Score / best
  text(ctx, 'SCORE', 700, 24, 13, PAL.textDim);
  text(ctx, `${g.score + g.totalScore}`, 700, 44, 17, PAL.text);
  text(ctx, 'BEST', 810, 24, 13, PAL.textDim);
  text(ctx, `${Math.max(g.best, g.score + g.totalScore)}`, 810, 44, 17, PAL.textDim);
  // Strikes
  text(ctx, 'STRIKES', 920, 24, 13, PAL.textDim);
  for (let i = 0; i < TUNE.maxStrikes; i++) {
    ctx.fillStyle = i < g.strikes ? PAL.red : '#2a2f5e';
    ctx.beginPath(); ctx.arc(935 + i * 22, 37, 7, 0, Math.PI * 2); ctx.fill();
  }
  // Ghost indicator
  text(ctx, g.spotted ? 'SEEN' : 'GHOST', 1050, 24, 13, g.spotted ? PAL.red : PAL.teal);
  text(ctx, g.spotted ? 'bonus lost' : '+500 if unseen', 1050, 44, 12, PAL.textDim);
}

function drawLeftPanel(ctx, g) {
  const w = g.world;
  box(ctx, 0, HUD_H, PANEL_L, H - HUD_H - BAR_H, PAL.panel, PAL.panelEdge);
  let y = HUD_H + 26;
  text(ctx, 'OBJECTIVES', 14, y, 13, PAL.textFaint); y += 26;
  const obj = [
    [`Lift the loot  ${w.lootTaken()}/${w.lootTotal()}`, w.allLootTaken()],
    ['Reach the green exit', w.allLootTaken()],
    ['GHOST — never spotted', !g.spotted],
  ];
  for (const [label, done] of obj) {
    ctx.fillStyle = done ? PAL.green : '#2a2f5e';
    ctx.fillRect(14, y - 11, 12, 12);
    if (done) text(ctx, '✓', 15, y, 12, '#06281c', 'left');
    text(ctx, label, 32, y, 12.5, done ? PAL.text : PAL.textDim);
    y += 24;
  }
  y += 10;
  text(ctx, 'GADGETS', 14, y, 13, PAL.textFaint); y += 26;
  const gad = [
    [`Coins ×${g.player.coins}`, 'CLICK / SPACE — throw'],
    [`Smoke ×${g.player.smoke}`, 'Q — blind the cones'],
    ['Lantern douse', 'R — near a lantern'],
  ];
  for (const [label, hint] of gad) {
    text(ctx, label, 14, y, 13, PAL.text); y += 17;
    text(ctx, hint, 14, y, 11, PAL.textDim); y += 26;
  }
  y += 8;
  text(ctx, 'HEIST PROGRESS', 14, y, 13, PAL.textFaint); y += 24;
  for (let i = 0; i < 5; i++) {
    const done = g.cleared[i];
    const cur = i === g.heist;
    ctx.fillStyle = done ? PAL.green : cur ? PAL.amber : '#2a2f5e';
    ctx.fillRect(14, y - 11, 12, 12);
    text(ctx, `${i + 1}  ${HEISTS[i].name}`, 32, y, 12.5, cur ? PAL.text : PAL.textDim);
    y += 24;
  }
  // WIN / LOSE footer
  const fy = H - BAR_H - 58;
  ctx.strokeStyle = PAL.panelEdge;
  ctx.beginPath(); ctx.moveTo(10, fy - 14); ctx.lineTo(PANEL_L - 10, fy - 14); ctx.stroke();
  text(ctx, WIN_TEXT, 14, fy, 11, PAL.green);
  text(ctx, LOSE_TEXT, 14, fy + 17, 11, PAL.red);
  text(ctx, '3 strikes = heist failed', 14, fy + 34, 11, PAL.textDim);
}

function drawRightPanel(ctx, g) {
  box(ctx, W - PANEL_R, HUD_H, PANEL_R, H - HUD_H - BAR_H, PAL.panel, PAL.panelEdge);
  let y = HUD_H + 26;
  text(ctx, 'GUARDS', W - PANEL_R + 14, y, 13, PAL.textFaint); y += 26;
  g.guards.forEach((gd, i) => {
    const [label, col] = guardLabel(gd);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(W - PANEL_R + 20, y - 4, 5, 0, Math.PI * 2); ctx.fill();
    text(ctx, `GUARD ${i + 1}`, W - PANEL_R + 32, y, 12.5, PAL.text);
    text(ctx, label, W - 14, y, 11, col, 'right');
    y += 22;
    // suspicion mini-bar
    box(ctx, W - PANEL_R + 32, y - 4, 120, 5, '#1a1e3d');
    box(ctx, W - PANEL_R + 32, y - 4, Math.round(120 * clamp(gd.suspicion, 0, 100) / 100), 5, col);
    y += 20;
  });
  y += 6;
  text(ctx, 'CAMERAS', W - PANEL_R + 14, y, 13, PAL.textFaint); y += 24;
  if (g.world.cameras.length === 0) {
    text(ctx, 'none in this heist', W - PANEL_R + 14, y, 12, PAL.textDim); y += 22;
  }
  g.world.cameras.forEach((cam, i) => {
    const on = cam.alerted;
    ctx.fillStyle = on ? PAL.red : PAL.amber;
    ctx.beginPath(); ctx.arc(W - PANEL_R + 20, y - 4, 5, 0, Math.PI * 2); ctx.fill();
    text(ctx, `CAM ${i + 1}`, W - PANEL_R + 32, y, 12.5, PAL.text);
    text(ctx, on ? 'SPOTTED YOU' : 'SWEEPING', W - 14, y, 11, on ? PAL.red : PAL.textDim, 'right');
    y += 22;
  });
  y += 6;
  text(ctx, 'LASERS', W - PANEL_R + 14, y, 13, PAL.textFaint); y += 24;
  if (g.world.lasers.length === 0) {
    text(ctx, 'none in this heist', W - PANEL_R + 14, y, 12, PAL.textDim);
  } else {
    const live = g.world.lasers.filter(l => l.on).length;
    text(ctx, `${live}/${g.world.lasers.length} beams live`, W - PANEL_R + 14, y, 12, PAL.red);
    text(ctx, 'they blink on a timer', W - PANEL_R + 14, y + 17, 12, PAL.textDim);
  }
  const anyAlert = g.guards.some(gd => gd.state === 'alerted') || g.world.cameras.some(c => c.alerted);
  if (anyAlert) {
    const fy = HUD_H + 380;
    ctx.fillStyle = `rgba(231, 76, 60, ${0.55 + 0.3 * Math.sin(g.time * 6)})`;
    ctx.fillRect(W - PANEL_R + 10, fy, PANEL_R - 20, 34);
    text(ctx, 'HUNTING YOU', W - PANEL_R / 2, fy + 23, 14, '#ffffff', 'center');
  }
}

function drawBottomBar(ctx, g) {
  box(ctx, 0, H - BAR_H, W, BAR_H, PAL.hud, PAL.hudEdge);
  text(ctx, 'WASD MOVE · SHIFT SNEAK · CLICK COIN · E GRAB · Q SMOKE · R DOUSE · P PAUSE · M MUTE', 14, H - 13, 12.5, PAL.textDim);
  if (g.hint) text(ctx, g.hint, W - 14, H - 13, 12.5, PAL.amber, 'right');
}

// ---- screens ---------------------------------------------------------------
function drawTitle(ctx, g) {
  // Dimmed live level behind the title (heist 1, one guard patrolling).
  if (g.titleWorld) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    const keep = { world: g.world, guards: g.guards, player: g.player, popups: g.popups, time: g.time, input: g.input, hint: '' };
    g.world = g.titleWorld.world; g.guards = g.titleWorld.guards; g.player = g.titleWorld.player;
    drawLevel(ctx, g);
    g.world = keep.world; g.guards = keep.guards; g.player = keep.player;
    ctx.restore();
    ctx.fillStyle = 'rgba(10, 12, 32, 0.72)';
    ctx.fillRect(0, 0, W, H);
  }
  text(ctx, 'MOONLIT VAULT', W / 2, 118, 64, PAL.text, 'center');
  text(ctx, 'Steal the Star Sapphire — 5 heists, 17 guards, 32 treasures, 3 gadgets', W / 2, 152, 18, PAL.amber, 'center');
  text(ctx, 'One thief. Five vaults. Zero witnesses.', W / 2, 180, 14, PAL.textDim, 'center');

  // Heist cards
  const cw = 210, ch = 150, gap = 16;
  const total = 5 * cw + 4 * gap;
  let x = (W - total) / 2;
  const y = 220;
  for (let i = 0; i < 5; i++) {
    const h = HEISTS[i];
    const done = g.cleared[i];
    box(ctx, x, y, cw, ch, done ? '#122b22' : PAL.panel, i === 0 || done ? PAL.amber : PAL.panelEdge);
    text(ctx, `${i + 1}`, x + 14, y + 30, 22, PAL.amber);
    text(ctx, h.name, x + 14, y + 56, 15, PAL.text);
    text(ctx, h.sub, x + 14, y + 78, 11.5, PAL.textDim);
    text(ctx, done ? `CLEARED · $${g.heistScores[i]}` : 'NOT CLEARED', x + 14, y + 104, 11.5, done ? PAL.green : PAL.textFaint);
    text(ctx, 'PRESS ' + (i + 1), x + 14, y + 130, 11, PAL.textDim);
    x += cw + gap;
  }

  // How to play
  const hy = 410;
  box(ctx, 240, hy, 800, 150, 'rgba(16, 20, 46, 0.92)', PAL.panelEdge);
  text(ctx, 'HOW TO PLAY', 264, hy + 28, 13, PAL.textFaint);
  const lines = [
    'Stay out of the amber vision cones. Crates block sight, bushes hide a crouched thief, shadows halve detection.',
    'Sneak with SHIFT — slow and silent. Running makes noise guards will come to check.',
    'Throw a coin (CLICK) to lure a guard away. Smoke (Q) blinds cones. Douse a lantern (R) to make darkness.',
    'Grab every gem (E), then slip out the green exit. Get caught 3 times and the heist fails.',
    'Cameras sweep on their own — and lasers blink. GHOST bonus +500 if no guard ever spots you.',
  ];
  lines.forEach((ln, i) => text(ctx, ln, 264, hy + 52 + i * 20, 12.5, PAL.text));
  text(ctx, 'CLICK A HEIST CARD OR PRESS 1–5  ·  BEST SCORE $' + g.best, W / 2, 600, 14, PAL.text, 'center');
  text(ctx, 'Dear judge — the cones are live, the guards really do hear the coins. Try it.', W / 2, 628, 12, PAL.textFaint, 'center');
}

function drawTally(ctx, g, title, sub) {
  // The cleared vault stays visible behind the tally — no empty frame.
  drawLevel(ctx, g);
  drawHud(ctx, g);
  drawLeftPanel(ctx, g);
  drawRightPanel(ctx, g);
  drawBottomBar(ctx, g);
  ctx.fillStyle = 'rgba(10, 12, 32, 0.62)';
  ctx.fillRect(0, 0, W, H);
  const bw = 560, bh = 380;
  const bx = (W - bw) / 2, by = (H - bh) / 2;
  box(ctx, bx, by, bw, bh, PAL.panel, PAL.amber);
  text(ctx, title, W / 2, by + 52, 34, PAL.text, 'center');
  text(ctx, sub, W / 2, by + 82, 14, PAL.textDim, 'center');
  const t = g.tally;
  let y = by + 130;
  const rows = [
    ['Loot lifted', `$${t.loot}`],
    ['Time bonus', `+$${t.timeBonus}`],
    [t.ghost ? 'GHOST bonus — never spotted' : 'Spotted — no GHOST bonus', t.ghost ? '+$500' : '$0'],
    ['Heist total', `$${t.total}`],
    ['Campaign total', `$${g.totalScore}`],
  ];
  for (const [label, val] of rows) {
    text(ctx, label, bx + 36, y, 15, PAL.text);
    text(ctx, val, bx + bw - 36, y, 15, PAL.gold, 'right');
    y += 34;
  }
  text(ctx, g.screen === 'win' ? 'PRESS ENTER — BACK TO TITLE' : 'PRESS ENTER OR CLICK — NEXT HEIST', W / 2, by + bh - 28, 13, PAL.amber, 'center');
}

function drawFail(ctx, g) {
  ctx.fillStyle = 'rgba(10, 12, 32, 0.82)';
  ctx.fillRect(0, 0, W, H);
  if (g.failReason === 'time') {
    text(ctx, 'OUT OF TIME', W / 2, 300, 44, PAL.red, 'center');
    text(ctx, 'The night ended before the vault was empty.', W / 2, 340, 16, PAL.textDim, 'center');
  } else {
    text(ctx, 'CAUGHT THREE TIMES', W / 2, 300, 44, PAL.red, 'center');
    text(ctx, 'The heist failed. The vault keeps its secrets — this time.', W / 2, 340, 16, PAL.textDim, 'center');
  }
  text(ctx, 'PRESS ENTER — TRY THE HEIST AGAIN', W / 2, 390, 14, PAL.amber, 'center');
}

// ---- main entry ------------------------------------------------------------
export function render(ctx, g) {
  ctx.fillStyle = PAL.bg;
  ctx.fillRect(0, 0, W, H);
  if (g.screen === 'title') { drawTitle(ctx, g); return; }
  if (g.screen === 'clear' || g.screen === 'win') {
    drawTally(ctx, g,
      g.screen === 'win' ? 'THE STAR SAPPHIRE IS YOURS' : 'HEIST CLEAR!',
      g.screen === 'win' ? 'All five vaults emptied — a perfect night’s work.' : `${HEISTS[g.heist].name} emptied. On to the next vault.`);
    return;
  }
  if (g.screen === 'fail') { drawFail(ctx, g); return; }

  // play / caught
  drawLevel(ctx, g);
  drawHud(ctx, g);
  drawLeftPanel(ctx, g);
  drawRightPanel(ctx, g);
  drawBottomBar(ctx, g);

  if (g.paused) {
    ctx.fillStyle = 'rgba(10, 12, 32, 0.6)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, 'PAUSED', W / 2, 350, 40, PAL.text, 'center');
    text(ctx, 'P TO RESUME', W / 2, 385, 14, PAL.textDim, 'center');
  }
  if (g.banner) {
    const b = g.banner;
    ctx.globalAlpha = clamp(b.t, 0, 1);
    text(ctx, b.text, W / 2, 330, 64, b.color, 'center');
    if (b.sub) text(ctx, b.sub, W / 2, 366, 16, PAL.text, 'center');
    ctx.globalAlpha = 1;
  }
}
