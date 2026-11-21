// MOONLIT VAULT — shots: stage real game state for the four screenshots.
// Every shot drives the real simulation (real level load, real guard
// positions and states, real loot) — never a painted fake frame.
import { TILE, PAL, tileCenterX, tileCenterY } from './config.js';

function placeGuard(gd, tx, ty, dir, state, suspicion) {
  gd.x = tileCenterX(tx);
  gd.y = tileCenterY(ty);
  gd.dir = dir;
  gd.state = state;
  gd.suspicion = suspicion;
  gd.stateT = 99;
  gd.lastKnown = null;
  gd.loseT = 0;
}

export function stageShot(g, name, loadHeist) {
  if (name === 'title') {
    g.screen = 'title';
    return;
  }

  if (name === 'play') {
    // COVER — Heist 2 (THE BANK), mid-play, the "almost caught" second.
    loadHeist(1);
    const p = g.player;
    p.x = tileCenterX(11); p.y = tileCenterY(5); // crouched behind a crate
    p.dir = Math.PI; // facing the guard
    p.sneaking = true;
    // Three gems already lifted.
    [0, 1, 2].forEach(i => { g.world.loot[i].taken = true; });
    g.score = 450;
    g.totalScore = 0;
    g.timeLeft = 187;
    g.heat = 45;
    // Guard 3 sweeps its cone right onto the player; suspicious, staring.
    placeGuard(g.guards[2], 12, 3, Math.PI / 2, 'suspicious', 72);
    g.guards[2].lastKnown = { x: p.x, y: p.y };
    // The other two patrol with live cones.
    placeGuard(g.guards[0], 4, 6, 0, 'patrol', 12);
    placeGuard(g.guards[1], 20, 8, Math.PI, 'patrol', 8);
    g.popups.push({ x: tileCenterX(19), y: tileCenterY(8) - 18, text: '+$200', color: PAL.gold, t: 1 });
    return;
  }

  if (name === 'alert') {
    // Heist 3 (THE GALLERY): full SPOTTED! chase frame, red cones.
    loadHeist(2);
    const p = g.player;
    p.x = tileCenterX(13); p.y = tileCenterY(8);
    p.dir = Math.PI; // running west, away from the guard behind
    p.sneaking = false;
    [0, 1, 2, 3].forEach(i => { g.world.loot[i].taken = true; });
    g.score = 700;
    g.timeLeft = 143;
    g.heat = 92;
    g.spotted = true;
    g.strikes = 1;
    placeGuard(g.guards[0], 12, 5, Math.PI / 2, 'alerted', 100);
    g.guards[0].lastKnown = { x: p.x, y: p.y };
    placeGuard(g.guards[1], 14, 10, -Math.PI * 0.75, 'suspicious', 78);
    g.guards[1].lastKnown = { x: p.x, y: p.y };
    placeGuard(g.guards[2], 19, 8, Math.PI, 'patrol', 20);
    const cam = g.world.cameras[0];
    cam.suspicion = 100; cam.alerted = true;
    cam.angle = Math.atan2(tileCenterY(8) - tileCenterY(6), tileCenterX(13) - tileCenterX(9));
    g.banner = { text: 'SPOTTED!', sub: 'Guard 1 is closing in — run for the shadows!', t: 99, color: PAL.red };
    return;
  }

  if (name === 'win') {
    // Heist 5 (THE SKY PALACE) cleared: Star Sapphire taken, tally up.
    loadHeist(4);
    g.world.loot.forEach(l => { l.taken = true; });
    g.score = 0; // loot value already folded into the campaign total below
    g.timeLeft = 93;
    g.tally = { loot: 2450, timeBonus: 186, ghost: true, total: 3136 };
    g.totalScore = 7936;
    g.best = 7936;
    g.cleared = [true, true, true, true, true];
    g.heistScores = [640, 980, 1240, 1940, 3136];
    g.screen = 'win';
    return;
  }
}
