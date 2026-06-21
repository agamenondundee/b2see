// On-screen touch controls for mobile. Renders a left D-pad and right throw
// buttons over the canvas and feeds the shared input system. Only shown when a
// touch-capable device is detected.

import { input } from "./input.js";

const HOLD = ["left", "right", "up", "down"]; // held while pressed
const TAP = ["throwLeft", "throwRight"]; // edge-triggered

export function setupTouch(shell, getPhase, onConfirm) {
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  if (!isTouch) return;

  const pad = document.createElement("div");
  pad.id = "touch-controls";
  pad.innerHTML = `
    <div class="t-dpad">
      <button class="t-btn" data-act="up">▲</button>
      <div class="t-row">
        <button class="t-btn" data-act="left">◀</button>
        <button class="t-btn" data-act="down">▼</button>
        <button class="t-btn" data-act="right">▶</button>
      </div>
    </div>
    <div class="t-throws">
      <button class="t-btn t-throw" data-act="throwLeft">◀ TOSS</button>
      <button class="t-btn t-throw" data-act="throwRight">TOSS ▶</button>
    </div>`;
  shell.appendChild(pad);

  for (const btn of pad.querySelectorAll(".t-btn")) {
    const act = btn.dataset.act;
    const press = (e) => {
      e.preventDefault();
      if (getPhase() === "tally" || getPhase() === "over" || getPhase() === "menu") {
        onConfirm();
        return;
      }
      if (HOLD.includes(act)) input.setHeld(act, true);
      else if (TAP.includes(act)) input.trigger(act);
      btn.classList.add("active");
    };
    const release = (e) => {
      e.preventDefault();
      if (HOLD.includes(act)) input.setHeld(act, false);
      btn.classList.remove("active");
    };
    btn.addEventListener("touchstart", press, { passive: false });
    btn.addEventListener("touchend", release, { passive: false });
    btn.addEventListener("touchcancel", release, { passive: false });
    // Also support mouse for desktop testing.
    btn.addEventListener("mousedown", press);
    btn.addEventListener("mouseup", release);
    btn.addEventListener("mouseleave", release);
  }
}
