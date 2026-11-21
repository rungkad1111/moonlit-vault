# MOONLIT VAULT — steal the Star Sapphire: 5 heists, 17 guards, 32 treasures, 3 gadgets

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/rungkad1111/moonlit-vault/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/rungkad1111/moonlit-vault/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down stealth heist game for make.fun's "Make the best stealth game"
bounty. One thief. Five vaults. Zero witnesses. Sneak through the Museum,
the Bank, the Gallery, the Casino and the Sky Palace, lift every gem — the
last vault holds the **Star Sapphire** — and slip out the green exit unseen.

- **5 hand-designed heists**, rising difficulty: more guards, then sweeping
  security cameras, then blinking laser grids.
- **Guard AI with vision cones**: patrol → suspicious → alerted chase →
  search the last-known spot → return. Cones are raycast-clipped by walls
  and crates, so cover is real.
- **Cover that works**: crates block sight, bushes hide a crouched thief,
  shadow zones halve detection. Sneak (SHIFT) to move slow and silent;
  running makes noise guards come to check.
- **3 gadgets**: throw a coin (CLICK / SPACE) to lure a guard away, smoke
  puff (Q) to blind the cones, lantern douse (R) to make darkness.
- **Cameras** sweep their own cones and raise the alarm; **lasers** blink
  on a timer — cross a live beam and every guard hunts you.
- **Score** = loot value + time bonus + **GHOST bonus +500** if no guard
  ever spots you. Get caught 3 times and the heist fails.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Controls

| Key | Action |
|-----|--------|
| WASD / arrows | Move |
| SHIFT | Sneak (slow, silent, harder to spot) |
| CLICK / SPACE | Throw a coin (lures guards to the landing spot) |
| E | Grab loot / slip out the exit |
| Q | Smoke puff |
| R | Douse a nearby lantern |
| 1–5 | Pick a heist on the title screen |
| P / M / ESC | Pause / mute / back to title |

## Layout

- `game/index.html` — the page; `game/src/main.js` — state machine and loop
- `game/src/config.js` — layout, palette, tuning
- `game/src/levels.js` — the five hand-designed heist maps
- `game/src/world.js` — grid, line of sight, visibility, noise, smoke
- `game/src/guards.js` — guard AI and cameras
- `game/src/player.js` — movement and gadgets
- `game/src/render.js` — all drawing (HUD, panels, level, screens)
- `game/src/shots.js` — stages the four screenshots from real game state
- `game/src/audio.js` — WebAudio bleeps · `game/src/input.js` — keyboard + mouse
- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes `dossier.json`)

Screenshots are real renders of the game's own code, staged by
`game/src/shots.js` (`?shot=play|title|alert|win`).

## License

MIT — see `LICENSE`.
