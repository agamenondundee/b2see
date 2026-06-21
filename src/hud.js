// Heads-up display, end-of-segment tally and game-over screens.

import { VIEW } from "./constants.js";
import { project } from "./iso.js";

export function drawHud(ctx, s) {
  ctx.save();
  ctx.textBaseline = "top";

  ctx.fillStyle = "rgba(11, 13, 23, 0.72)";
  ctx.fillRect(0, 0, VIEW.width, 40);

  ctx.font = "bold 20px monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffd23f";
  ctx.fillText(`SCORE ${s.score.toString().padStart(6, "0")}`, 14, 11);

  ctx.textAlign = "center";
  ctx.fillStyle = "#f4f4f8";
  if (s.mode === "bmx") ctx.fillText(`GATES ${s.gates}`, VIEW.width / 2, 11);
  else ctx.fillText(`PAPERS ${s.papers}`, VIEW.width / 2, 11);

  ctx.textAlign = "right";
  ctx.fillStyle = "#ff6b6b";
  ctx.fillText("♥".repeat(Math.max(0, s.lives)), VIEW.width - 14, 11);

  // Progress bar along the bottom.
  const w = VIEW.width - 28;
  ctx.fillStyle = "rgba(11,13,23,0.6)";
  ctx.fillRect(14, VIEW.height - 16, w, 8);
  ctx.fillStyle = s.mode === "bmx" ? "#e8d24a" : "#6ee06e";
  ctx.fillRect(14, VIEW.height - 16, w * Math.min(1, s.progress), 8);

  if (s.streak > 1) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#6ee06e";
    ctx.font = "bold 16px monospace";
    ctx.fillText(`STREAK x${s.streak}`, VIEW.width / 2, 46);
  }
  ctx.restore();
}

export function drawFloatingText(ctx, popups, cameraV) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 16px monospace";
  for (const p of popups) {
    const sp = project(p.u, p.v, cameraV);
    const rise = (1 - p.life / p.maxLife) * 34;
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, sp.x, sp.y - 40 - rise);
  }
  ctx.restore();
}

export function drawTally(ctx, tally) {
  panel(ctx);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd23f";
  ctx.font = "bold 38px monospace";
  ctx.fillText(tally.title, VIEW.width / 2, VIEW.height / 2 - 90);

  ctx.fillStyle = "#f4f4f8";
  ctx.font = "20px monospace";
  tally.lines.forEach((line, i) => {
    ctx.fillText(line, VIEW.width / 2, VIEW.height / 2 - 28 + i * 32);
  });

  ctx.fillStyle = "#9ee06e";
  ctx.font = "italic 18px monospace";
  ctx.fillText(tally.prompt, VIEW.width / 2, VIEW.height / 2 + 78);

  ctx.fillStyle = "#9aa";
  ctx.font = "16px monospace";
  ctx.fillText("Press Enter / tap to continue", VIEW.width / 2, VIEW.height / 2 + 116);
}

export function drawGameOver(ctx, s) {
  panel(ctx);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ff6b6b";
  ctx.font = "bold 56px monospace";
  ctx.fillText("ROUTE OVER", VIEW.width / 2, VIEW.height / 2 - 50);

  ctx.fillStyle = "#f4f4f8";
  ctx.font = "bold 24px monospace";
  ctx.fillText(`Final score: ${s.score}`, VIEW.width / 2, VIEW.height / 2 + 10);
  ctx.fillText(`Papers delivered: ${s.deliveries}`, VIEW.width / 2, VIEW.height / 2 + 44);

  ctx.font = "18px monospace";
  ctx.fillStyle = "#9aa";
  ctx.fillText("Press Enter / tap to ride again", VIEW.width / 2, VIEW.height / 2 + 92);
}

function panel(ctx) {
  ctx.save();
  ctx.fillStyle = "rgba(8, 10, 20, 0.82)";
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.restore();
}
