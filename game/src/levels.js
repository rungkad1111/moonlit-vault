// MOONLIT VAULT — levels: five hand-designed heists.
// Maps are built by construction (border walls, wall segments with door
// gaps, then features placed on floor tiles), so every map is valid:
// all loot and the exit are reachable from the player start.
// Map legend: '#' wall · '.' floor · ',' shadow floor (dark, halves detection)
// 'C' crate (blocks movement + sight) · 'B' bush (hide inside) · 'L' loot
// 'E' exit door · 'P' player start.

const COLS = 26, ROWS = 16;

function buildMap(walls, features) {
  const g = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
  for (let x = 0; x < COLS; x++) { g[0][x] = '#'; g[ROWS - 1][x] = '#'; }
  for (let y = 0; y < ROWS; y++) { g[y][0] = '#'; g[y][COLS - 1] = '#'; }
  for (const w of walls) {
    if (w.x !== undefined) {
      for (let y = w.y1; y <= w.y2; y++) if (!w.gaps.includes(y)) g[y][w.x] = '#';
    } else {
      for (let x = w.x1; x <= w.x2; x++) if (!w.gaps.includes(x)) g[w.y][x] = '#';
    }
  }
  for (const [c, x, y] of features) {
    if (g[y][x] !== '.') throw new Error(`feature ${c} at ${x},${y} lands on '${g[y][x]}'`);
    g[y][x] = c;
  }
  return g.map(r => r.join(''));
}

function F(list) { return list.map(([c, x, y]) => [c, x, y]); }

export const MAPS = [
  // ---- Heist 1 · THE MUSEUM: 2 guards, 4 treasures -----------------------
  buildMap(
    [{ x: 6, y1: 1, y2: 14, gaps: [5, 10] }, { x: 14, y1: 1, y2: 14, gaps: [5, 10] }],
    F([
      ['P', 1, 1], ['E', 21, 14],
      ['L', 21, 1], ['L', 3, 3], ['L', 8, 5], ['L', 18, 8],
      ['C', 8, 2], ['C', 18, 3], ['C', 4, 5], ['C', 16, 5], ['C', 8, 7],
      ['C', 20, 8], ['C', 4, 10], ['C', 18, 10], ['C', 8, 12],
      ['B', 16, 2], ['B', 20, 6], ['B', 3, 7], ['B', 8, 10], ['B', 18, 12],
      [',', 10, 3], [',', 11, 3], [',', 10, 12], [',', 11, 12],
    ]),
  ),
  // ---- Heist 2 · THE BANK: 3 guards, 6 treasures --------------------------
  buildMap(
    [{ x: 8, y1: 1, y2: 14, gaps: [4, 11] }, { x: 17, y1: 1, y2: 14, gaps: [7, 12] }],
    F([
      ['P', 1, 1], ['E', 21, 14],
      ['L', 20, 1], ['L', 7, 6], ['L', 19, 8], ['L', 3, 10], ['L', 16, 12], ['L', 7, 14],
      ['C', 6, 1], ['C', 3, 4], ['C', 10, 4], ['C', 12, 5], ['C', 4, 7],
      ['C', 20, 2], ['C', 16, 9], ['C', 21, 10], ['C', 6, 12], ['C', 20, 13],
      ['B', 3, 2], ['B', 20, 3], ['B', 18, 6], ['B', 3, 8], ['B', 21, 11], ['B', 6, 13],
      [',', 5, 5], [',', 6, 5], [',', 12, 10], [',', 13, 10],
    ]),
  ),
  // ---- Heist 3 · THE GALLERY: 3 guards, 2 cameras, 6 treasures ------------
  buildMap(
    [{ x: 9, y1: 1, y2: 14, gaps: [4, 11] }, { x: 17, y1: 1, y2: 14, gaps: [6, 12] }],
    F([
      ['P', 1, 1], ['E', 21, 14],
      ['L', 21, 1], ['L', 7, 3], ['L', 12, 8], ['L', 20, 10], ['L', 7, 13], ['L', 21, 13],
      ['C', 6, 1], ['C', 14, 2], ['C', 19, 4], ['C', 11, 6], ['C', 6, 8],
      ['C', 20, 8], ['C', 13, 10], ['C', 19, 12],
      ['B', 3, 2], ['B', 14, 4], ['B', 21, 6], ['B', 3, 9], ['B', 11, 12],
      [',', 5, 3], [',', 6, 3], [',', 5, 11], [',', 6, 11],
    ]),
  ),
  // ---- Heist 4 · THE CASINO: 4 guards, 2 cameras, 2 lasers, 8 treasures ---
  buildMap(
    [
      { x: 6, y1: 1, y2: 14, gaps: [6, 12] },
      { x: 13, y1: 1, y2: 14, gaps: [5, 10] },
      { x: 19, y1: 1, y2: 14, gaps: [6, 12] },
    ],
    F([
      ['P', 1, 1], ['E', 21, 14],
      ['L', 21, 1], ['L', 4, 4], ['L', 10, 3], ['L', 16, 8],
      ['L', 21, 8], ['L', 4, 10], ['L', 10, 12], ['L', 17, 12],
      ['C', 3, 2], ['C', 11, 4], ['C', 21, 3], ['C', 4, 7], ['C', 17, 5],
      ['C', 21, 9], ['C', 5, 11], ['C', 3, 12],
      ['B', 3, 6], ['B', 10, 6], ['B', 21, 6], ['B', 8, 10], ['B', 21, 11],
      [',', 10, 2], [',', 11, 2], [',', 14, 9], [',', 15, 9],
    ]),
  ),
  // ---- Heist 5 · THE SKY PALACE: 5 guards, 3 cameras, 3 lasers, 8 treasures
  buildMap(
    [
      { x: 6, y1: 1, y2: 14, gaps: [6, 12] },
      { x: 13, y1: 1, y2: 14, gaps: [5, 10] },
      { x: 19, y1: 1, y2: 14, gaps: [6, 12] },
    ],
    F([
      ['P', 1, 1], ['E', 21, 14],
      ['L', 3, 4], ['L', 10, 3], ['L', 12, 8], ['L', 16, 8],
      ['L', 21, 8], ['L', 4, 10], ['L', 10, 12], ['L', 17, 12],
      ['C', 3, 2], ['C', 11, 4], ['C', 21, 3], ['C', 4, 7], ['C', 17, 5],
      ['C', 21, 9], ['C', 3, 12], ['C', 20, 12],
      ['B', 3, 6], ['B', 10, 6], ['B', 21, 6], ['B', 8, 10], ['B', 21, 11],
      [',', 10, 2], [',', 11, 2], [',', 14, 9], [',', 15, 9],
    ]),
  ),
];

// Guard patrol loops: tile coordinates the guard walks, in order.
// (All waypoints sit on floor tiles; no waypoint is a crate or wall.)
export const GUARD_PATHS = [
  [ // heist 1
    [[2, 2], [11, 2], [11, 13], [2, 13]],
    [[17, 3], [23, 3], [23, 12], [17, 12]],
  ],
  [ // heist 2
    [[2, 2], [6, 2], [6, 13], [2, 13]],
    [[19, 2], [23, 2], [23, 13], [19, 13]],
    [[10, 3], [15, 3], [15, 12], [10, 12]],
  ],
  [ // heist 3
    [[2, 2], [7, 2], [7, 13], [2, 13]],
    [[11, 2], [15, 2], [15, 13], [11, 13]],
    [[19, 6], [23, 6], [23, 11], [19, 11]],
  ],
  [ // heist 4
    [[2, 2], [4, 2], [4, 13], [2, 13]],
    [[8, 2], [11, 2], [11, 13], [8, 13]],
    [[15, 2], [17, 2], [17, 13], [15, 13]],
    [[21, 2], [23, 2], [23, 13], [21, 13]],
  ],
  [ // heist 5
    [[2, 2], [4, 2], [4, 13], [2, 13]],
    [[8, 2], [11, 2], [11, 13], [8, 13]],
    [[15, 2], [17, 2], [17, 13], [15, 13]],
    [[21, 2], [23, 2], [23, 13], [21, 13]],
    [[14, 7], [18, 7], [18, 9], [14, 9]],
  ],
];

// Security cameras: mounted ON a wall tile, cone sweeping into the room.
export const CAMERAS = [
  [],
  [],
  [
    { x: 9, y: 6, base: Math.PI / 2, sweep: 1.1, speed: 0.55 },
    { x: 9, y: 13, base: -Math.PI / 2, sweep: 1.1, speed: 0.55 },
  ],
  [
    { x: 6, y: 5, base: Math.PI / 2, sweep: 1.0, speed: 0.6 },
    { x: 19, y: 9, base: -Math.PI / 2, sweep: 1.0, speed: 0.6 },
  ],
  [
    { x: 6, y: 5, base: Math.PI / 2, sweep: 1.0, speed: 0.65 },
    { x: 19, y: 5, base: -Math.PI / 2, sweep: 1.0, speed: 0.65 },
    { x: 13, y: 12, base: 0, sweep: 1.4, speed: 0.5 },
  ],
];

// Laser grids: a beam between two tiles, blinking on/off on a timer.
export const LASERS = [
  [],
  [],
  [],
  [
    { x1: 9, y1: 4, x2: 9, y2: 11, period: 3.0, phase: 0 },
    { x1: 16, y1: 4, x2: 16, y2: 11, period: 3.0, phase: 1.5 },
  ],
  [
    { x1: 9, y1: 4, x2: 9, y2: 11, period: 2.6, phase: 0 },
    { x1: 16, y1: 4, x2: 16, y2: 11, period: 2.6, phase: 1.3 },
    { x1: 22, y1: 4, x2: 22, y2: 11, period: 3.4, phase: 0.7 },
  ],
];

// Lanterns: tile positions of warm lights the player can douse (R nearby).
export const LANTERNS = [
  [[4, 1], [13, 8], [20, 13]],
  [[4, 3], [12, 7], [20, 3], [21, 12]],
  [[3, 7], [12, 4], [21, 8]],
  [[4, 5], [12, 9], [21, 5], [21, 12]],
  [[4, 4], [12, 7], [21, 4], [21, 12], [12, 13]],
];

// The Star Sapphire: the loot of heist 5 at tile (12, 8) — index 2 of its
// loot list (loot is collected in map order, top to bottom, left to right).
export const SAPPHIRE = { heist: 4, lootIndex: 2 };
