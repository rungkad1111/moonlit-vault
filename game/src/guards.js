// MOONLIT VAULT — guards: patrol / suspicious / chase / search / return.
// Cameras share the same visibility test with a fixed, sweeping cone.
import {
  TILE, TUNE, tileCenterX, tileCenterY, pxToTileX, pxToTileY,
  dist, angleTo, angleDiff, clamp,
} from './config.js';

export function makeGuard(id, path) {
  const [sx, sy] = path[0];
  const [nx, ny] = path[1];
  return {
    id, path, wp: 1,
    x: tileCenterX(sx), y: tileCenterY(sy),
    dir: angleTo(tileCenterX(sx), tileCenterY(sy), tileCenterX(nx), tileCenterY(ny)),
    state: 'patrol',        // patrol | suspicious | alerted | search | return
    suspicion: 0,
    stateT: 0,
    lastKnown: null,
    loseT: 0,
    scanDir: 1,
    speed: TUNE.guardPatrol,
  };
}

function moveToward(g, world, tx, ty, speed, dt) {
  const dx = tx - g.x, dy = ty - g.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < 2) return true;
  const step = Math.min(d, speed * TILE * dt);
  const nx = g.x + (dx / d) * step, ny = g.y + (dy / d) * step;
  const r = 11;
  if (world.canStand(nx, g.y, r)) g.x = nx;
  if (world.canStand(g.x, ny, r)) g.y = ny;
  g.dir = angleTo(g.x, g.y, tx, ty);
  return d <= step + 2;
}

function nearestWaypoint(g) {
  let best = 0, bd = Infinity;
  g.path.forEach(([x, y], i) => {
    const d = dist(g.x, g.y, tileCenterX(x), tileCenterY(y));
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

export function updateGuard(g, world, player, dt, events) {
  const range = player.sneaking ? TUNE.sneakRange : TUNE.coneRange;
  const { seen, rate } = world.canSee(g.x, g.y, g.dir, range, TUNE.coneHalfAngle, player);

  if (seen) {
    g.suspicion = clamp(g.suspicion + rate * dt, 0, 100);
    g.lastKnown = { x: player.x, y: player.y };
    g.loseT = 0;
  } else {
    g.suspicion = clamp(g.suspicion - TUNE.susDecay * dt, 0, 100);
    if (g.state === 'alerted') g.loseT += dt;
  }

  // Hearing: a noise event pulls patrolling guards to investigate.
  if (g.state === 'patrol' || g.state === 'suspicious') {
    for (const n of world.noise) {
      if (dist(g.x, g.y, n.x, n.y) < n.r + TILE * 0.5) {
        g.state = 'search';
        g.lastKnown = { x: n.x, y: n.y };
        g.stateT = TUNE.searchTime;
        g.suspicion = Math.max(g.suspicion, 45);
        break;
      }
    }
  }

  switch (g.state) {
    case 'patrol': {
      if (g.suspicion >= TUNE.susStare) {
        g.state = 'suspicious'; g.stateT = TUNE.stareTime; break;
      }
      const [wx, wy] = g.path[g.wp];
      if (moveToward(g, world, tileCenterX(wx), tileCenterY(wy), TUNE.guardPatrol, dt)) {
        g.wp = (g.wp + 1) % g.path.length;
      }
      break;
    }
    case 'suspicious': {
      // Freeze and stare at the last seen spot.
      if (g.lastKnown) g.dir = angleTo(g.x, g.y, g.lastKnown.x, g.lastKnown.y);
      if (g.suspicion >= TUNE.susAlert) { g.state = 'alerted'; g.loseT = 0; break; }
      g.stateT -= dt;
      if (g.stateT <= 0 && g.suspicion < TUNE.susStare) g.state = 'patrol';
      break;
    }
    case 'alerted': {
      if (g.lastKnown) moveToward(g, world, g.lastKnown.x, g.lastKnown.y, TUNE.guardChase, dt);
      if (dist(g.x, g.y, player.x, player.y) < TUNE.catchDist * TILE) {
        events.caught(g);
        return;
      }
      if (g.loseT > TUNE.loseSightTime) {
        g.state = 'search'; g.stateT = TUNE.searchTime;
      }
      break;
    }
    case 'search': {
      if (g.suspicion >= TUNE.susAlert) { g.state = 'alerted'; g.loseT = 0; break; }
      if (g.lastKnown) {
        const arrived = moveToward(g, world, g.lastKnown.x, g.lastKnown.y, TUNE.guardSearch, dt);
        if (arrived) g.dir += g.scanDir * dt * 1.6; // look around
      }
      g.stateT -= dt;
      if (g.stateT <= 0) { g.state = 'return'; }
      break;
    }
    case 'return': {
      const wi = nearestWaypoint(g);
      const [wx, wy] = g.path[wi];
      if (moveToward(g, world, tileCenterX(wx), tileCenterY(wy), TUNE.guardPatrol, dt)) {
        g.wp = (wi + 1) % g.path.length;
        g.state = 'patrol';
        g.suspicion = 0;
      }
      break;
    }
  }
}

// A camera sweeps its cone; spotting the player alerts every guard.
export function updateCamera(cam, world, player, dt, events) {
  cam.angle = cam.base + Math.sin(events.time * cam.speed) * cam.sweep;
  if (cam.cool > 0) { cam.cool -= dt; return; }
  const { seen } = world.canSee(
    tileCenterX(cam.x), tileCenterY(cam.y), cam.angle,
    TUNE.coneRange + 0.6, TUNE.coneHalfAngle, player,
  );
  if (seen) {
    cam.suspicion = clamp(cam.suspicion + TUNE.susRate * dt, 0, 100);
    if (cam.suspicion >= 100 && !cam.alerted) {
      cam.alerted = true;
      cam.cool = 2.5;
      events.cameraAlarm({ x: player.x, y: player.y });
    }
  } else {
    cam.suspicion = clamp(cam.suspicion - TUNE.susDecay * dt, 0, 100);
    if (cam.suspicion < 30) cam.alerted = false;
  }
}

// Guard state label + colour for the right-hand panel.
export function guardLabel(g) {
  switch (g.state) {
    case 'patrol': return ['PATROL', '#9aa3c7'];
    case 'suspicious': return ['SUSPICIOUS', '#f5b942'];
    case 'alerted': return ['ALERTED', '#e74c3c'];
    case 'search': return ['SEARCHING', '#f58c42'];
    case 'return': return ['RETURNING', '#9aa3c7'];
    default: return ['PATROL', '#9aa3c7'];
  }
}
