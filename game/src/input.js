// MOONLIT VAULT — input: keyboard + mouse with edge-triggered actions.
import { LEVEL_X, LEVEL_Y, TILE, pxToTileX, pxToTileY } from './config.js';

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();   // edge-triggered, consumed by the game
    this.mouse = { x: 0, y: 0, clicked: false };
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener('mousedown', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
      this.mouse.clicked = true;
    });
  }

  key(code) { return this.keys.has(code); }
  consume(code) {
    if (this.pressed.has(code)) { this.pressed.delete(code); return true; }
    return false;
  }
  consumeClick() {
    if (this.mouse.clicked) { this.mouse.clicked = false; return true; }
    return false;
  }
  // Mouse position converted to a level tile (clamped inside the level).
  mouseTile() {
    return {
      x: Math.max(0, Math.min(25, pxToTileX(this.mouse.x))),
      y: Math.max(0, Math.min(15, pxToTileY(this.mouse.y))),
    };
  }
  axisX() {
    let x = 0;
    if (this.key('KeyA') || this.key('ArrowLeft')) x -= 1;
    if (this.key('KeyD') || this.key('ArrowRight')) x += 1;
    return x;
  }
  axisY() {
    let y = 0;
    if (this.key('KeyW') || this.key('ArrowUp')) y -= 1;
    if (this.key('KeyS') || this.key('ArrowDown')) y += 1;
    return y;
  }
  // Flush stale edges (used when switching screens).
  flush() { this.pressed.clear(); this.mouse.clicked = false; }
}
