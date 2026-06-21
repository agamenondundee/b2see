// Heads-up display: score, papers remaining, lives and delivery streak.

import { VIEW } from "./constants.js";

export function drawHud(ctx, state) {
  ctx.save();
  ctx.textBaseline = "top";

  // Top status bar.
  ctx.fillStyle = "rgba(11, 13, 23, 0.7)";
  ctx.fillRect(0, 0, VIEW.width, 40);

  ctx.fillStyle = "#ffd23f";
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE ${state.score.toString().padStart(6, "0")}`, 14, 11);

  ctx.textAlign = "center";
  ctx.fillStyle = "#f4f4f8";
  ctx.fillText(`PAPERS ${state.papers}`, VIEW.width / 2, 11);

  ctx.textAlign = "right";
  ctx.fillStyle = "#ff6b6b";
  ctx.fillText("♥".repeat(Math.max(0, state.lives)), VIEW.width - 14, 11);

  if (state.streak > 1) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#6ee06e";
    ctx.font = "bold 16px monospace";
    ctx.fillText(`STREAK x${state.streak}`, VIEW.width / 2, 46);
  }

  ctx.restore();
}

export function drawFloatingText(ctx, popups) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const p of popups) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.font = "bold 16px monospace";
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.restore();
}

export function drawGameOver(ctx, state) {
  ctx.save();
  ctx.fillStyle = "rgba(8, 10, 20, 0.8)";
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd23f";
  ctx.font = "bold 56px monospace";
  ctx.fillText("ROUTE OVER", VIEW.width / 2, VIEW.height / 2 - 50);

  ctx.fillStyle = "#f4f4f8";
  ctx.font = "bold 24px monospace";
  ctx.fillText(`Final score: ${state.score}`, VIEW.width / 2, VIEW.height / 2 + 10);
  ctx.fillText(`Deliveries: ${state.deliveries}`, VIEW.width / 2, VIEW.height / 2 + 44);

  ctx.font = "18px monospace";
  ctx.fillStyle = "#9aa";
  ctx.fillText("Press Enter to ride again", VIEW.width / 2, VIEW.height / 2 + 90);
  ctx.restore();
}
