// MOONLIT VAULT — player: movement, sneaking, and the three gadgets.
import {
  TILE, TUNE, GADGETS, LEVEL_X, LEVEL_Y,
  tileCenterX, tileCenterY, pxToTileX, pxToTileY, dist, clamp,
} from './config.js';

export function makePlayer(world) {
  const { x, y } = world.start;
  return {
    x: tileCenterX(x), y: tileCenterY(y),
    dir: 0, // facing angle
    sneaking: false,
    moving: false,
    running: false,
    coins: GADGETS.coins,
    smoke: GADGETS.smoke,
    noiseT: 0,
    stepT: 0,
  };
}

export function updatePlayer(p, input, world, dt, events) {
  const ax = input.axisX(), ay = input.axisY();
  p.moving = ax !== 0 || ay !== 0;
  p.sneaking = input.key('ShiftLeft') || input.key('ShiftRight');
  p.running = p.moving && !p.sneaking;
  const speed = (p.sneaking ? TUNE.playerSneak : TUNE.playerWalk) * TILE;
  if (p.moving) {
    const len = Math.hypot(ax, ay) || 1;
    const nx = p.x + (ax / len) * speed * dt;
    const ny = p.y + (ay / len) * speed * dt;
    const r = 11;
    if (world.canStand(nx, p.y, r)) p.x = nx;
    if (world.canStand(p.x, ny, r)) p.y = ny;
    p.dir = Math.atan2(ay, ax);
    // Running is loud: guards nearby hear the footsteps.
    if (p.running) {
      p.noiseT -= dt;
      if (p.noiseT <= 0) {
        p.noiseT = 0.45;
        world.noise.push({ x: p.x, y: p.y, r: TUNE.noiseRunRadius * TILE, ttl: 0.5 });
      }
    }
  }

  // Coin throw: click a tile (or Space throws toward the mouse).
  if (p.coins > 0 && (input.consumeClick() || input.consume('Space'))) {
    const m = input.mouseTile();
    const tx = clamp(m.x, 0, 25), ty = clamp(m.y, 0, 15);
    const dTiles = dist(p.x, p.y, tileCenterX(tx), tileCenterY(ty)) / TILE;
    if (dTiles > 0.6 && dTiles <= TUNE.coinRange && world.walkable(tx, ty)) {
      p.coins--;
      world.coins.push({ sx: p.x, sy: p.y, tx, ty, t: 0, landed: false, age: 0 });
      events.sound('coin');
    }
  }

  // Smoke puff: a cloud that blocks every vision cone for a few seconds.
  if (input.consume('KeyQ') && p.smoke > 0) {
    p.smoke--;
    world.smoke.push({ x: p.x, y: p.y, r: TUNE.smokeRadius * TILE, ttl: TUNE.smokeTime });
    events.sound('smoke');
  }

  // Lantern douse: kill a nearby lantern, leave a pool of darkness.
  if (input.consume('KeyR')) {
    for (const lan of world.lanterns) {
      if (!lan.lit) continue;
      const d = dist(p.x, p.y, tileCenterX(lan.x), tileCenterY(lan.y)) / TILE;
      if (d <= 1.6) {
        lan.lit = false;
        world.doused.push({ x: tileCenterX(lan.x), y: tileCenterY(lan.y), r: TUNE.douseRadius * TILE });
        events.sound('douse');
        events.popup(tileCenterX(lan.x), tileCenterY(lan.y) - 14, 'LIGHTS OUT', '#9aa3c7');
        break;
      }
    }
  }
}

// Nearest loot pedestal within reach (0.9 tiles), or null.
export function lootInReach(p, world) {
  for (const l of world.loot) {
    if (l.taken) continue;
    if (dist(p.x, p.y, tileCenterX(l.x), tileCenterY(l.y)) < 0.95 * TILE) return l;
  }
  return null;
}

export function exitInReach(p, world) {
  if (!world.exit) return false;
  return dist(p.x, p.y, tileCenterX(world.exit.x), tileCenterY(world.exit.y)) < 0.95 * TILE;
}
