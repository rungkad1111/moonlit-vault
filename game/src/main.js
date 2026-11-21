// MOONLIT VAULT — main: game state, screens, loop, and shot staging.
import {
  W, H, TILE, TUNE, GADGETS, HEISTS, PAL,
  tileCenterX, tileCenterY, pxToTileX, pxToTileY, dist, clamp,
} from './config.js';
import { World } from './world.js';
import { makeGuard, updateGuard, updateCamera } from './guards.js';
import { GUARD_PATHS } from './levels.js';
import { makePlayer, updatePlayer, lootInReach, exitInReach } from './player.js';
import { render } from './render.js';
import { Input } from './input.js';
import { playSound, setMuted, isMuted } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

export const game = {
  screen: 'title', // title | play | clear | win | fail
  heist: 0,
  world: null,
  player: null,
  guards: [],
  score: 0,        // this heist
  totalScore: 0,   // campaign (cleared heists)
  strikes: 0,
  timeLeft: TUNE.heistTime,
  heat: 0,
  spotted: false,  // seen at least once this heist
  best: 0,
  muted: false,
  paused: false,
  banner: null,
  popups: [],
  tally: null,
  cleared: [false, false, false, false, false],
  heistScores: [0, 0, 0, 0, 0],
  hint: '',
  time: 0,
  frozen: false,
  caughtT: 0,
  laserCool: 0,
  failReason: '',
  titleWorld: null,
  input: null,
};

try { game.best = Number(localStorage.getItem('moonlit-vault-best') || 0); } catch { game.best = 0; }

function popup(x, y, text, color) {
  game.popups.push({ x, y, text, color, t: 1 });
}

function loadHeist(i, keepCampaign = true) {
  game.heist = i;
  game.world = new World(i);
  game.player = makePlayer(game.world);
  game.guards = GUARD_PATHS[i].map((path, n) => makeGuard(n, path));
  game.score = 0;
  game.strikes = 0;
  game.timeLeft = TUNE.heistTime;
  game.heat = 0;
  game.spotted = false;
  game.banner = null;
  game.popups = [];
  game.tally = null;
  game.caughtT = 0;
  game.laserCool = 0;
  game.paused = false;
  if (!keepCampaign) { game.totalScore = 0; game.cleared = [false, false, false, false, false]; game.heistScores = [0, 0, 0, 0, 0]; }
  game.screen = 'play';
  game.input.flush();
}

function makeTitleBackdrop() {
  const world = new World(0);
  const guards = GUARD_PATHS[0].map((path, n) => makeGuard(n, path));
  const player = makePlayer(world);
  player.x = -999; player.y = -999; // off-stage: the backdrop guard patrols alone
  game.titleWorld = { world, guards, player };
}

function onCaught(gd) {
  game.strikes++;
  game.spotted = true;
  playSound('caught');
  game.banner = { text: 'SPOTTED!', sub: `Strike ${game.strikes} of ${TUNE.maxStrikes} — the guards drag you back to the door`, t: 1.4, color: PAL.red };
  game.caughtT = 1.4;
}

function onCameraAlarm(pos) {
  game.spotted = true;
  playSound('alert');
  for (const gd of game.guards) {
    gd.state = 'alerted'; gd.suspicion = 100; gd.lastKnown = { ...pos }; gd.loseT = 0;
  }
  popup(pos.x, pos.y - 20, 'CAMERA SPOTTED YOU', PAL.red);
}

function heistClear() {
  const timeBonus = Math.round(game.timeLeft) * 2;
  const ghostBonus = game.spotted ? 0 : TUNE.ghostBonus;
  const total = game.score + timeBonus + ghostBonus;
  game.tally = { loot: game.score, timeBonus, ghost: !game.spotted, total };
  game.totalScore += total;
  game.score = 0; // folded into the campaign total — the HUD shows totalScore
  game.heistScores[game.heist] = total;
  game.cleared[game.heist] = true;
  const campaign = game.totalScore;
  if (campaign > game.best) {
    game.best = campaign;
    try { localStorage.setItem('moonlit-vault-best', String(campaign)); } catch { /* no storage */ }
  }
  playSound(game.heist === 4 ? 'win' : 'clear');
  game.screen = game.heist === 4 ? 'win' : 'clear';
  game.input.flush();
}

function updatePlay(dt) {
  const g = game, w = g.world, p = g.player;
  const events = {
    time: g.time,
    caught: onCaught,
    cameraAlarm: onCameraAlarm,
    sound: playSound,
    popup,
  };

  if (g.caughtT > 0) {
    g.caughtT -= dt;
    if (g.banner) g.banner.t = Math.max(0, g.caughtT);
    if (g.caughtT <= 0) {
      g.banner = null;
      if (g.strikes >= TUNE.maxStrikes) {
        g.failReason = 'caught';
        g.screen = 'fail';
        playSound('fail');
        g.input.flush();
      } else {
        // Dragged back to the door: guards reset, loot kept.
        const np = makePlayer(w);
        p.x = np.x; p.y = np.y; p.dir = np.dir;
        p.coins = Math.max(p.coins, 2); p.smoke = Math.max(p.smoke, 1);
        g.guards = GUARD_PATHS[g.heist].map((path, n) => makeGuard(n, path));
      }
    }
    return;
  }

  g.timeLeft -= dt;
  if (g.timeLeft <= 0) {
    g.timeLeft = 0;
    g.failReason = 'time';
    g.screen = 'fail';
    playSound('fail');
    g.input.flush();
    return;
  }

  updatePlayer(p, g.input, w, dt, events);
  w.update(dt);

  // Guards + cameras
  const wasAlerted = g.guards.map(gd => gd.state === 'alerted');
  for (const gd of g.guards) updateGuard(gd, w, p, dt, events);
  for (const cam of w.cameras) updateCamera(cam, w, p, dt, events);
  g.guards.forEach((gd, i) => {
    if (!wasAlerted[i] && gd.state === 'alerted') {
      g.spotted = true;
      playSound('alert');
      popup(gd.x, gd.y - 26, 'SPOTTED!', PAL.red);
    }
  });

  // Lasers: crossing a live beam trips the alarm.
  g.laserCool -= dt;
  if (g.laserCool <= 0) {
    const ptx = pxToTileX(p.x), pty = pxToTileY(p.y);
    for (const l of w.lasers) {
      if (!l.on) continue;
      const onBeam = l.x1 === l.x2
        ? ptx === l.x1 && pty >= Math.min(l.y1, l.y2) && pty <= Math.max(l.y1, l.y2)
        : pty === l.y1 && ptx >= Math.min(l.x1, l.x2) && ptx <= Math.max(l.x1, l.x2);
      if (onBeam) {
        g.laserCool = 3;
        g.spotted = true;
        playSound('alert');
        for (const gd of g.guards) {
          gd.state = 'alerted'; gd.suspicion = 100;
          gd.lastKnown = { x: p.x, y: p.y }; gd.loseT = 0;
        }
        popup(p.x, p.y - 22, 'LASER TRIP!', PAL.red);
        break;
      }
    }
  }

  // Grab loot / use exit with E.
  if (g.input.consume('KeyE')) {
    const loot = lootInReach(p, w);
    if (loot) {
      loot.taken = true;
      g.score += loot.value;
      playSound(loot.sapphire ? 'sapphire' : 'pickup');
      popup(tileCenterX(loot.x), tileCenterY(loot.y) - 18, `+$${loot.value}`, loot.sapphire ? '#67e8f9' : PAL.gold);
      if (loot.sapphire) popup(tileCenterX(loot.x), tileCenterY(loot.y) - 38, 'STAR SAPPHIRE!', '#67e8f9');
      if (w.allLootTaken()) popup(tileCenterX(w.exit.x), tileCenterY(w.exit.y) - 26, 'EXIT OPEN', PAL.green);
    } else if (w.allLootTaken() && exitInReach(p, w)) {
      heistClear();
      return;
    }
  }

  // Contextual hint line
  const loot = lootInReach(p, w);
  const nearLantern = w.lanterns.some(lan => lan.lit &&
    dist(p.x, p.y, tileCenterX(lan.x), tileCenterY(lan.y)) <= 1.6 * TILE);
  g.hint = loot ? 'E — GRAB THE GEM'
    : w.allLootTaken() && exitInReach(p, w) ? 'E — SLIP OUT THE EXIT'
    : nearLantern ? 'R — DOUSE THE LANTERN'
    : w.allLootTaken() ? 'ALL LOOT LIFTED — REACH THE GREEN EXIT' : '';

  // HEAT: the hottest suspicion in the building, smoothed.
  const hottest = Math.max(0, ...g.guards.map(gd => gd.suspicion), ...w.cameras.map(c => c.suspicion));
  g.heat += (hottest - g.heat) * Math.min(1, dt * 4);

  // Popups rise and fade.
  for (const pp of g.popups) { pp.y -= 22 * dt; pp.t -= dt * 0.7; }
  g.popups = g.popups.filter(pp => pp.t > 0);

  // Pause / mute
  if (g.input.consume('KeyP')) g.paused = !g.paused;
  if (g.input.consume('KeyM')) { g.muted = !g.muted; setMuted(g.muted); }
  if (g.input.consume('Escape')) { g.screen = 'title'; g.input.flush(); }
}

function updateTitle(dt) {
  // The backdrop guard keeps patrolling behind the title.
  if (game.titleWorld) {
    const tw = game.titleWorld;
    const dummy = { x: -999, y: -999, sneaking: false, moving: false };
    for (const gd of tw.guards) updateGuard(gd, tw.world, dummy, dt, { time: game.time, caught: () => {}, cameraAlarm: () => {}, sound: () => {}, popup: () => {} });
    tw.world.update(dt);
  }
  const inp = game.input;
  for (let i = 0; i < 5; i++) {
    if (inp.consume('Digit' + (i + 1)) || inp.consume('Numpad' + (i + 1))) {
      playSound('click');
      loadHeist(i);
      return;
    }
  }
  if (inp.consumeClick()) {
    // Click a heist card.
    const cw = 210, gap = 16;
    const total = 5 * cw + 4 * gap;
    let x = (W - total) / 2;
    const y = 220, ch = 150;
    const m = inp.mouse;
    for (let i = 0; i < 5; i++) {
      if (m.x >= x && m.x <= x + cw && m.y >= y && m.y <= y + ch) {
        playSound('click');
        loadHeist(i);
        return;
      }
      x += cw + gap;
    }
  }
}

function updateEndScreen(dt) {
  const inp = game.input;
  if (inp.consume('Enter') || inp.consume('Space') || inp.consumeClick()) {
    playSound('click');
    if (game.screen === 'fail') {
      loadHeist(game.heist);
    } else if (game.screen === 'win') {
      game.screen = 'title';
      game.input.flush();
    } else {
      // clear: next heist (or replay the last one if already cleared)
      const next = Math.min(game.heist + 1, 4);
      loadHeist(next);
    }
  }
}

function update(dt) {
  game.time += dt;
  if (game.screen === 'title') updateTitle(dt);
  else if (game.screen === 'play') { if (!game.paused) updatePlay(dt); else if (game.input.consume('KeyP')) game.paused = false; }
  else updateEndScreen(dt);
}

function resize() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}

function frame(t) {
  requestAnimationFrame(frame);
  const now = t / 1000;
  const dt = Math.min(0.05, now - (frame.last || now));
  frame.last = now;
  if (!game.frozen) update(dt);
  render(ctx, game);
  if (!frame.ready) { frame.ready = true; window.__ready = true; }
}

// Boot
canvas.width = W;
canvas.height = H;
game.input = new Input(canvas);
makeTitleBackdrop();
window.addEventListener('resize', resize);
resize();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  stageShot(game, shot, loadHeist);
  game.frozen = true;
}
window.__game = game;
requestAnimationFrame(frame);
