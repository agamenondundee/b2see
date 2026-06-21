// Entry point: boots assets, wires input, runs the fixed-timestep game loop.

import { assets } from "./assets.js";
import { input } from "./input.js";
import { Game, GameState } from "./game.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("start-btn");

async function boot() {
  await assets.loadAll();
  input.attach();

  const game = new Game(ctx);
  game.onStateChange = (s) => {
    overlay.classList.toggle("hidden", s !== GameState.MENU);
  };

  startBtn.addEventListener("click", () => game.start());
  // Also allow Enter to start/restart from the keyboard.
  window.addEventListener("keydown", (e) => {
    if (e.code === "Enter") {
      if (game.state !== GameState.PLAYING) game.start();
    }
  });

  let last = performance.now();
  function frame(now) {
    // Clamp dt so a tab regaining focus doesn't teleport everything.
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    game.update(dt);
    game.draw();
    input.endFrame();

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();
