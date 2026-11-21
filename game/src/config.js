// MOONLIT VAULT — config: layout, palette, tuning.
// Top-down stealth heist. Canvas is a fixed 1280x720 stage, scaled by CSS.

export const W = 1280;
export const H = 720;

// Layout (winner layout: dense HUD + side panels, no empty margins)
export const HUD_H = 54;            // top bar
export const BAR_H = 36;            // bottom control bar
export const PANEL_L = 196;         // left objectives panel
export const PANEL_R = 196;         // right guard-status panel
export const PLAY_X = PANEL_L;      // play area
export const PLAY_Y = HUD_H;
export const PLAY_W = W - PANEL_L - PANEL_R;
export const PLAY_H = H - HUD_H - BAR_H;

// Level grid
export const COLS = 26;
export const ROWS = 16;
export const TILE = 33;
export const LEVEL_W = COLS * TILE;   // 858
export const LEVEL_H = ROWS * TILE;   // 528
export const LEVEL_X = PLAY_X + Math.floor((PLAY_W - LEVEL_W) / 2); // 211
export const LEVEL_Y = PLAY_Y + Math.floor((PLAY_H - LEVEL_H) / 2);  // 105

// Palette — one strong theme: night museum heist.
// Deep indigo floors, warm amber lantern light, teal player cloak.
export const PAL = {
  bg: '#0d1026',
  panel: '#141838',
  panelEdge: '#2a2f5e',
  hud: '#10142e',
  hudEdge: '#2a2f5e',
  floorA: '#1c2142',
  floorB: '#20264a',
  floorDark: '#141830',
  wall: '#3d4470',
  wallTop: '#565e94',
  wallEdge: '#23264a',
  crate: '#8a6a35',
  crateEdge: '#5d4520',
  bush: '#1e4d33',
  bushEdge: '#2f7a4e',
  shadow: 'rgba(6, 8, 22, 0.55)',
  amber: '#f5b942',
  amberDim: 'rgba(245, 185, 66, 0.16)',
  coneCalm: 'rgba(245, 185, 66, 0.27)',
  coneSus: 'rgba(245, 140, 66, 0.38)',
  coneAlert: 'rgba(231, 60, 60, 0.38)',
  red: '#e74c3c',
  redDark: '#8e2f26',
  teal: '#2dd4bf',
  tealDark: '#0f766e',
  green: '#34d399',
  greenGlow: 'rgba(52, 211, 153, 0.35)',
  gold: '#ffd166',
  text: '#e8eaf6',
  textDim: '#9aa3c7',
  textFaint: '#6b739e',
  white: '#ffffff',
};

// Tuning
export const TUNE = {
  playerWalk: 4.4,      // tiles / second
  playerSneak: 2.3,     // tiles / second
  guardPatrol: 1.7,     // tiles / second
  guardChase: 3.5,      // tiles / second
  guardSearch: 2.2,
  coneRange: 5.6,       // tiles
  coneHalfAngle: 0.61,  // radians (~35 deg)
  sneakRange: 3.4,      // guard range vs a sneaking player
  catchDist: 0.55,      // tiles — guard touches player
  bushHideDist: 1.3,    // tiles — inside a bush, seen only this close
  shadowFactor: 0.45,   // suspicion rate multiplier in shadow
  sneakFactor: 0.55,    // suspicion rate multiplier while sneaking
  moveFactor: 1.35,     // suspicion rate multiplier while player moves
  susRate: 95,          // suspicion / second at point blank, standing, lit
  susDecay: 26,         // suspicion / second while unseen
  susStare: 62,         // suspicion at which a guard stops and stares
  susAlert: 100,
  stareTime: 1.25,      // seconds a suspicious guard stares
  searchTime: 3.2,      // seconds searching last-known spot
  loseSightTime: 4.0,   // seconds of no sight before giving up chase
  noiseRunRadius: 2.6,  // tiles
  coinRange: 6.5,       // tiles
  coinNoiseRadius: 3.2, // tiles
  smokeRadius: 2.1,     // tiles
  smokeTime: 5.0,       // seconds
  douseRadius: 2.2,     // tiles
  heistTime: 240,       // seconds per heist
  maxStrikes: 3,
  ghostBonus: 500,
};

// Gadget counts per heist
export const GADGETS = { coins: 5, smoke: 2 };

// Gem values by tier (loot pedestals cycle through these)
export const GEM_VALUES = [100, 150, 200, 250, 300, 400];
export const SAPPHIRE_VALUE = 1000;

// Heist meta: name, flavour, difficulty knobs.
export const HEISTS = [
  { id: 1, name: 'THE MUSEUM', sub: 'Night wing · 2 guards · 4 gems', guards: 2, loot: 4, cameras: 0, lasers: 0 },
  { id: 2, name: 'THE BANK', sub: 'Vault floor · 3 guards · 6 gems', guards: 3, loot: 6, cameras: 0, lasers: 0 },
  { id: 3, name: 'THE GALLERY', sub: 'Glass halls · 2 cameras · 6 gems', guards: 3, loot: 6, cameras: 2, lasers: 0 },
  { id: 4, name: 'THE CASINO', sub: 'High rollers · lasers · 8 gems', guards: 4, loot: 8, cameras: 2, lasers: 2 },
  { id: 5, name: 'THE SKY PALACE', sub: 'Star Sapphire · 5 guards · lasers', guards: 5, loot: 8, cameras: 3, lasers: 3 },
];

export const WIN_TEXT = 'WIN lift the Star Sapphire and reach the green exit unseen';
export const LOSE_TEXT = 'LOSE get caught 3 times';

export function tileCenterX(tx) { return LEVEL_X + (tx + 0.5) * TILE; }
export function tileCenterY(ty) { return LEVEL_Y + (ty + 0.5) * TILE; }
export function pxToTileX(px) { return Math.floor((px - LEVEL_X) / TILE); }
export function pxToTileY(py) { return Math.floor((py - LEVEL_Y) / TILE); }
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function dist(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
export function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
