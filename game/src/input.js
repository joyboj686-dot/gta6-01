// input.js - keyboard and mouse state for Leonida Nights. Polled each frame,
// plus a few one-shot press events the game consumes (enter/exit car, pause).

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false, clicked: false };
    this.pressed = new Set(); // consumed by game each frame
    this.consume = new Set();

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.key.toLowerCase());
      this.pressed.add(e.key.toLowerCase());
      this.consume.add(e.key.toLowerCase());
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
    });
    canvas.addEventListener('mousedown', () => {
      this.mouse.down = true;
      this.mouse.clicked = true;
    });
    window.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.down = false;
    });
  }

  down(...codes) {
    return codes.some((c) => this.keys.has(c));
  }

  // True once for a press; call consumePressed() after reading.
  once(code) {
    return this.pressed.has(code);
  }

  consumePressed() {
    this.pressed.clear();
  }
}