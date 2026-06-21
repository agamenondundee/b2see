// Isometric projection: maps world ground coordinates (u, v) to screen pixels.
//
//   u — lateral position across the street
//   v — forward distance along the route
//   cameraV — the v at the bottom of the view (follows the player)
//
// Forward (v+) moves up-and-right; lateral (u+) moves down-and-right. Together
// they give the diagonal isometric street of the original Paperboy.

import { ISO } from "./constants.js";

export function project(u, v, cameraV) {
  const relV = v - cameraV;
  const du = u - ISO.uMid;
  return {
    x: ISO.originX + du * ISO.sx + relV * ISO.vx,
    y: ISO.originY + du * ISO.sy - relV * ISO.vy,
    relV,
  };
}

// Depth-based sprite scale: nearer (small relV) is larger. Pure iso would be
// flat, but a gentle shrink with distance reads better for billboard sprites.
export function depthScale(relV) {
  return Math.max(0.55, 1 - relV * ISO.depthShrink);
}

// Project a filled ground quad defined by its (u, v) corners.
export function groundQuad(ctx, corners, cameraV) {
  ctx.beginPath();
  corners.forEach(([u, v], i) => {
    const p = project(u, v, cameraV);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
}
