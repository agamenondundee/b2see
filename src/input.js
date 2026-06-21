// Keyboard input with edge detection for "just pressed" actions.

const KEYMAP = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  KeyA: "left",
  KeyD: "right",
  KeyW: "up",
  KeyS: "down",
  KeyZ: "throwLeft",
  KeyX: "throwRight",
  Space: "throwRight",
};

class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set(); // consumed once per press
  }

  attach(target = window) {
    target.addEventListener("keydown", (e) => {
      const action = KEYMAP[e.code];
      if (!action) return;
      e.preventDefault();
      if (!this.down.has(action)) this.pressed.add(action);
      this.down.add(action);
    });
    target.addEventListener("keyup", (e) => {
      const action = KEYMAP[e.code];
      if (!action) return;
      this.down.delete(action);
    });
    // Lose focus -> release everything so the player doesn't run off-screen.
    window.addEventListener("blur", () => this.down.clear());
  }

  held(action) {
    return this.down.has(action);
  }

  // True exactly once per physical key press.
  consume(action) {
    if (this.pressed.has(action)) {
      this.pressed.delete(action);
      return true;
    }
    return false;
  }

  endFrame() {
    this.pressed.clear();
  }
}

export const input = new Input();
