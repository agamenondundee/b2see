// Entry point: boots assets, wires input/audio/touch, runs the game loop.

import { assets } from "./assets.js";
import { input } from "./input.js";
import { audio } from "./audio.js";
import { clock } from "./clock.js";
import { Game, Phase } from "./game.js";
import { setupTouch } from "./touch.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const shell = document.getElementById("game-shell");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("start-btn");
const muteBtn = document.getElementById("mute-btn");

async function boot() {
  await assets.loadAll();
  input.attach();

  const game = new Game(ctx);
  game.onPhaseChange = (p) => overlay.classList.toggle("hidden", p !== Phase.MENU);

  function begin() {
    audio.unlock();
    game.newGame();
  }
  startBtn.addEventListener("click", begin);

  muteBtn.addEventListener("click", () => {
    audio.unlock();
    muteBtn.textContent = audio.toggle() ? "🔊" : "🔇";
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyM") {
      audio.unlock();
      muteBtn.textContent = audio.toggle() ? "🔊" : "🔇";
    }
    if (e.code === "Enter" && game.phase === Phase.MENU) begin();
  });

  setupTouch(
    shell,
    () => game.phase,
    () => {
      if (game.phase === Phase.MENU) begin();
      else input.trigger("confirm");
    },
  );

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock.t += dt;
    game.update(dt);
    game.draw();
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();
