// MOONLIT VAULT — world: the level grid, line of sight, visibility, noise.
import {
  COLS, ROWS, TILE, LEVEL_X, LEVEL_Y, TUNE, GEM_VALUES, SAPPHIRE_VALUE,
  tileCenterX, tileCenterY, pxToTileX, pxToTileY, dist, angleDiff,
} from './config.js';
import { MAPS, CAMERAS, LASERS, LANTERNS, SAPPHIRE } from './levels.js';

export const WALKABLE = new Set(['.', ',', 'L', 'E', 'P', 'B']);
export const SIGHT_BLOCK = new Set(['#', 'C']);

export class World {
  constructor(heistIndex) {
    this.heist = heistIndex;
    this.rows = MAPS[heistIndex];
    this.grid = this.rows.map(r => r.split(''));
    this.loot = [];
    this.exit = null;
    this.start = null;
    let li = 0;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = this.grid[y][x];
        if (c === 'P') this.start = { x, y };
        if (c === 'E') this.exit = { x, y, open: false };
        if (c === 'L') {
          const isSapphire = heistIndex === SAPPHIRE.heist && li === SAPPHIRE.lootIndex;
          this.loot.push({
            x, y, taken: false, index: li,
            value: isSapphire ? SAPPHIRE_VALUE : GEM_VALUES[li % GEM_VALUES.length],
            sapphire: isSapphire,
          });
          li++;
        }
      }
    }
    this.cameras = (CAMERAS[heistIndex] || []).map(c => ({
      ...c, angle: c.base, dir: 1, suspicion: 0, alerted: false, cool: 0,
    }));
    this.lasers = (LASERS[heistIndex] || []).map(l => ({ ...l, on: true, t: l.phase }));
    this.lanterns = (LANTERNS[heistIndex] || []).map(([x, y]) => ({ x, y, lit: true }));
    this.smoke = [];    // {x, y (px), r, ttl}
    this.doused = [];   // {x, y (px), r} permanent darkness zones
    this.noise = [];    // {x, y (px), r, ttl}
    this.coins = [];    // {x, y (px), tx, ty, t, landed}
  }

  tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
    return this.grid[ty][tx];
  }
  isWall(tx, ty) { return this.tileAt(tx, ty) === '#'; }
  blocksSight(tx, ty) { return SIGHT_BLOCK.has(this.tileAt(tx, ty)); }
  walkable(tx, ty) { return WALKABLE.has(this.tileAt(tx, ty)); }
  isBush(tx, ty) { return this.tileAt(tx, ty) === 'B'; }
  isShadowTile(tx, ty) { return this.tileAt(tx, ty) === ','; }

  // Can a circle of radius r (px) stand at (px, py)? Walls and crates block.
  canStand(px, py, r) {
    for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r], [0, 0]]) {
      if (!this.walkable(pxToTileX(px + ox), pxToTileY(py + oy))) return false;
    }
    return true;
  }

  // Bresenham line of sight between two pixel points, in tile space.
  los(ax, ay, bx, by) {
    let x0 = pxToTileX(ax), y0 = pxToTileY(ay);
    const x1 = pxToTileX(bx), y1 = pxToTileY(by);
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    for (;;) {
      if (!(x0 === pxToTileX(ax) && y0 === pxToTileY(ay)) && !(x0 === x1 && y0 === y1)) {
        if (this.blocksSight(x0, y0)) return false;
      }
      if (x0 === x1 && y0 === y1) return true;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }

  // Distance (px) along a ray before it hits a sight-blocking tile.
  rayDist(ax, ay, angle, maxDist) {
    const step = 6;
    for (let d = step; d <= maxDist; d += step) {
      const x = ax + Math.cos(angle) * d, y = ay + Math.sin(angle) * d;
      if (this.blocksSight(pxToTileX(x), pxToTileY(y))) return d;
      if (this.inSmoke(x, y)) return d;
    }
    return maxDist;
  }

  inSmoke(px, py) {
    for (const s of this.smoke) if (dist(px, py, s.x, s.y) < s.r) return true;
    return false;
  }

  inDoused(px, py) {
    for (const z of this.doused) if (dist(px, py, z.x, z.y) < z.r) return true;
    return false;
  }

  // Is the player standing in darkness? Shadow tile, a doused lantern's
  // pool, or crouched in a bush.
  playerInShadow(player) {
    const tx = pxToTileX(player.x), ty = pxToTileY(player.y);
    return this.isShadowTile(tx, ty) || this.inDoused(player.x, player.y) ||
      (this.isBush(tx, ty) && player.sneaking);
  }

  playerInBush(player) {
    return this.isBush(pxToTileX(player.x), pxToTileY(player.y));
  }

  // Full visibility test from an observer (guard/camera) to the player.
  // Returns {seen, rate} — rate is suspicion gained per second if seen.
  canSee(ox, oy, facing, rangeTiles, halfAngle, player) {
    const dPx = dist(ox, oy, player.x, player.y);
    const dTiles = dPx / TILE;
    if (dTiles > rangeTiles) return { seen: false, rate: 0 };
    const ang = Math.atan2(player.y - oy, player.x - ox);
    if (Math.abs(angleDiff(ang, facing)) > halfAngle) return { seen: false, rate: 0 };
    if (!this.los(ox, oy, player.x, player.y)) return { seen: false, rate: 0 };
    if (this.inSmoke((ox + player.x) / 2, (oy + player.y) / 2)) return { seen: false, rate: 0 };
    // A bush hides a crouched player unless the watcher is right on top.
    if (this.playerInBush(player) && dTiles > TUNE.bushHideDist) return { seen: false, rate: 0 };
    let rate = TUNE.susRate * (1 - (dTiles / rangeTiles) * 0.75);
    if (player.sneaking) rate *= TUNE.sneakFactor;
    if (player.moving) rate *= TUNE.moveFactor;
    if (this.playerInShadow(player)) rate *= TUNE.shadowFactor;
    return { seen: true, rate };
  }

  lootTaken() { return this.loot.filter(l => l.taken).length; }
  lootTotal() { return this.loot.length; }
  lootValue() { return this.loot.filter(l => l.taken).reduce((s, l) => s + l.value, 0); }
  allLootTaken() { return this.loot.every(l => l.taken); }

  update(dt) {
    for (const s of this.smoke) s.ttl -= dt;
    this.smoke = this.smoke.filter(s => s.ttl > 0);
    for (const n of this.noise) n.ttl -= dt;
    this.noise = this.noise.filter(n => n.ttl > 0);
    for (const l of this.lasers) {
      l.t += dt;
      l.on = (l.t % l.period) < l.period * 0.6;
    }
    // Coin flight: arc to the target tile, then clink and make noise.
    for (const c of this.coins) {
      if (c.landed) { c.age = (c.age || 0) + dt; continue; }
      c.t += dt * 2.2;
      if (c.t >= 1) {
        c.landed = true;
        c.age = 0;
        c.x = tileCenterX(c.tx); c.y = tileCenterY(c.ty);
        this.noise.push({ x: c.x, y: c.y, r: TUNE.coinNoiseRadius * TILE, ttl: 1.2 });
      } else {
        const sx = c.sx, sy = c.sy;
        const ex = tileCenterX(c.tx), ey = tileCenterY(c.ty);
        c.x = sx + (ex - sx) * c.t;
        c.y = sy + (ey - sy) * c.t - Math.sin(c.t * Math.PI) * 26;
      }
    }
    this.coins = this.coins.filter(c => !c.landed || (c.age || 0) < 1.5);
  }
}
